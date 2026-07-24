import {
    MATCH_MODES,
    SALTY_BET_BASE_URL,
    SALTY_BET_STATE_PATH,
    SELECTED_PLAYERS,
} from "../constants/index.js";
import { getBalanceInfo, placeBet } from "./saltyBet.js";
import { resolveMatchMode, shouldRecord } from "./matchMode.js";
import { Op } from "sequelize";
import db from "../database/models/index.js";
import { getWinRateFromData } from "./winRate.js";

const { Fighter, LastBet, Matchup, Remaining, TournamentLog } = db;

const POLL_INTERVAL_MS = 3000;

// Betting is only accepted while the current match's status is "open".
const BETTING_OPEN_STATUS = "open";

// How many of the most recent tournament-detected bets to keep for diagnostics.
const TOURNAMENT_LOG_LIMIT = 50;

let intervalId = null;
let active = false;
let processing = false;
let params = null;
let matchesRecorded = 0;

async function fetchSaltyBetData() {
    const response = await fetch(
        `${SALTY_BET_BASE_URL}${SALTY_BET_STATE_PATH}`
    );
    if (!response.ok) return null;
    return response.json();
}

async function tick() {
    if (processing) return;
    processing = true;

    try {
        const data = await fetchSaltyBetData();
        if (!data || !data.p1name || !data.p2name) return;

        const lastBet = await LastBet.findByPk(0);
        const {
            p1name: lastP1,
            p2name: lastP2,
            status: lastStatus,
            remaining: lastRemaining,
        } = lastBet.content ?? {};

        if (
            data.p1name === lastP1 &&
            data.p2name === lastP2 &&
            data.status === lastStatus
        ) {
            return;
        }

        const winner =
            data.status === "1" ? "p1" : data.status === "2" ? "p2" : null;

        if (winner) {
            // Use the remaining from the previous poll (before winner was determined)
            // because the API's remaining field may already reflect the next match
            const remaining = lastRemaining ?? data.remaining;
            const mode = await resolveMatchMode(remaining);

            if (params?.recordRemaining && remaining) {
                await Remaining.findOrCreate({
                    where: { value: remaining },
                    defaults: { mode },
                });
            }

            await lastBet.update({
                content: {
                    p1name: data.p1name,
                    p2name: data.p2name,
                    status: data.status,
                    remaining: data.remaining,
                },
            });

            if (!shouldRecord(mode, params?.strictMode)) return;
        } else {
            // A new match's betting window just opened. This branch runs once
            // per window (subsequent identical ticks early-return above), so we
            // place at most one automatic bet per match.
            if (params?.bettingMode && data.status === BETTING_OPEN_STATUS) {
                try {
                    await autoBet(data);
                } catch {
                    // A betting failure must not stop the listener.
                }
            }

            await lastBet.update({
                content: {
                    p1name: data.p1name,
                    p2name: data.p2name,
                    status: data.status,
                    remaining: data.remaining,
                },
            });

            return;
        }

        const [p1] = await Fighter.findOrCreate({
            where: { name: data.p1name },
        });
        const [p2] = await Fighter.findOrCreate({
            where: { name: data.p2name },
        });

        const [winner_fighter, loser_fighter] =
            winner === "p1" ? [p1, p2] : [p2, p1];

        const [matchup] = await Matchup.findOrCreate({
            where: { p1Uuid: p1.uuid, p2Uuid: p2.uuid },
        });

        await Promise.all([
            matchup.increment({
                matches: 1,
                ...(winner === "p1" ? { p1Wins: 1 } : { p2Wins: 1 }),
            }),
            winner_fighter.increment({ matches: 1, wins: 1 }),
            loser_fighter.increment({ matches: 1, losses: 1 }),
        ]);

        matchesRecorded++;

        if (
            params?.matchesToRecord &&
            matchesRecorded >= params.matchesToRecord
        ) {
            stop();
        }
    } finally {
        processing = false;
    }
}

// Win chance (0–100) of the current match's P1, using stored fighter/matchup
// stats when available and zeroed stats otherwise (mirrors currentMatchData).
async function computeP1WinChance(data) {
    const [p1Record, p2Record] = await Promise.all([
        Fighter.findOne({ where: { name: data.p1name } }),
        Fighter.findOne({ where: { name: data.p2name } }),
    ]);

    const p1 = p1Record
        ? { matches: p1Record.matches, wins: p1Record.wins }
        : { matches: 0, wins: 0 };
    const p2 = p2Record
        ? { matches: p2Record.matches, wins: p2Record.wins }
        : { matches: 0, wins: 0 };

    let matchup = { matches: 0, p1Wins: 0, p2Wins: 0 };
    if (p1Record && p2Record) {
        const matchupRecord = await Matchup.findOne({
            where: { p1Uuid: p1Record.uuid, p2Uuid: p2Record.uuid },
        });
        if (matchupRecord) {
            matchup = {
                matches: matchupRecord.matches,
                p1Wins: matchupRecord.p1Wins,
                p2Wins: matchupRecord.p2Wins,
            };
        }
    }

    return getWinRateFromData(p1, p2, matchup);
}

// Fraction (%) of the balance to wager on the favourite, given the match mode
// and the favourite's win chance (always >= 50). Exhibitions never reach here.
function wagerPercent(mode, chance) {
    if (mode === MATCH_MODES.TOURNAMENT) return 100;

    // Matchmaking tiers; exact boundaries fall to the lower (safer) tier.
    if (chance <= 60) return 5;
    if (chance <= 70) return 10;
    if (chance <= 85) return 15;
    if (chance <= 95) return 20;
    return 25;
}

// Keeps the tournament log capped at the newest TOURNAMENT_LOG_LIMIT rows.
async function pruneTournamentLog() {
    const boundary = await TournamentLog.findAll({
        order: [["createdAt", "DESC"]],
        offset: TOURNAMENT_LOG_LIMIT,
        limit: 1,
        attributes: ["createdAt"],
    });

    if (boundary.length) {
        await TournamentLog.destroy({
            where: { createdAt: { [Op.lt]: boundary[0].createdAt } },
        });
    }
}

// Records the context of a tournament-detected bet so buggy Salty Bet strings
// and the "tournament balance" indicator can be inspected after the fact.
async function logTournamentBet(entry) {
    await TournamentLog.create(entry);
    await pruneTournamentLog();
}

async function autoBet(data) {
    const mode = await resolveMatchMode(data.remaining);
    if (mode === MATCH_MODES.EXHIBITION) return;

    const p1WinChance = await computeP1WinChance(data);
    // Bet on the favourite; a 50-50 split goes to player1.
    const betOnP1 = p1WinChance >= 100 - p1WinChance;
    const selectedplayer = betOnP1 ? SELECTED_PLAYERS.P1 : SELECTED_PLAYERS.P2;
    const chance = betOnP1 ? p1WinChance : 100 - p1WinChance;

    const { balance, context } = await getBalanceInfo();
    if (balance === null || balance <= 0) return;

    const wager = Math.ceil((balance * wagerPercent(mode, chance)) / 100);
    if (wager < 1) return;

    // Capture the context of every tournament-detected bet (before placing it,
    // so a real tournament is recorded even if the bet call fails).
    if (mode === MATCH_MODES.TOURNAMENT) {
        await logTournamentBet({
            p1name: data.p1name,
            p2name: data.p2name,
            remaining: data.remaining,
            balance,
            balanceContext: context,
            selectedplayer,
        });
    }

    await placeBet({ selectedplayer, wager });
}

export function start(options = {}) {
    params = {
        matchesToRecord: options.matchesToRecord ?? null,
        strictMode: options.strictMode ?? false,
        recordRemaining: options.recordRemaining ?? false,
        bettingMode: options.bettingMode ?? false,
    };
    matchesRecorded = 0;
    active = true;
    intervalId = setInterval(tick, POLL_INTERVAL_MS);
}

export function stop() {
    clearInterval(intervalId);
    intervalId = null;
    active = false;
    params = null;
    matchesRecorded = 0;
}

export function getStatus() {
    return { active, params };
}
