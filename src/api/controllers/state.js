import db from "../../database/models/index.js";
import { getWinRate } from "../../shared/index.js";
import { matchedData } from "express-validator";

const { Fighter, LastBet, Matchup } = db;

export async function currentMatchupPrediction(req, res) {
    const response = await fetch(process.env.SALTY_BET_API_URL);
    if (!response.ok) {
        return res.fail({
            httpCode: 502,
            message: "Salty Bet API request failed.",
            errorCode: 40,
        });
    }

    const { p1name, p2name } = await response.json();
    if (!p1name || !p2name) {
        return res.fail({
            httpCode: 502,
            message: "Salty Bet API response is missing fighter names.",
            errorCode: 41,
        });
    }

    const [p1] = await Fighter.findOrCreate({ where: { name: p1name } });
    const [p2] = await Fighter.findOrCreate({ where: { name: p2name } });

    const p1WinChance = await getWinRate(p1.uuid, p2.uuid);

    return res.status(200).json({ p1, p2, p1WinChance });
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 7 * 60 * 1000;

async function fetchSaltyBetData() {
    const response = await fetch(process.env.SALTY_BET_API_URL);
    if (!response.ok) return null;
    return response.json();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function autoDataScrape(req, res) {
    const { matchesToRecord, predictions } = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });
    const totalMatches = matchesToRecord ?? 1;
    const results = {};
    const lastBet = await LastBet.findByPk(0);

    for (let i = 1; i <= totalMatches; i++) {
        const deadline = Date.now() + POLL_TIMEOUT_MS;

        let data = await fetchSaltyBetData();
        if (!data) {
            return res.fail({
                httpCode: 502,
                message: "Salty Bet API request failed.",
                errorCode: 40,
            });
        }

        if (!data.p1name || !data.p2name) {
            return res.fail({
                httpCode: 502,
                message: "Salty Bet API response is missing fighter names.",
                errorCode: 41,
            });
        }

        const { p1name: lastP1, p2name: lastP2, status: lastStatus } = lastBet.content ?? {};
        if (data.p1name === lastP1 && data.p2name === lastP2 && data.status === lastStatus) {
            // Poll until data changes (new match or status update)
            while (Date.now() < deadline) {
                await sleep(POLL_INTERVAL_MS);
                const polled = await fetchSaltyBetData();
                if (!polled) continue;
                const { p1name: lp1, p2name: lp2, status: ls } = lastBet.content ?? {};
                if (polled.p1name !== lp1 || polled.p2name !== lp2 || polled.status !== ls) {
                    data = polled;
                    break;
                }
            }

            if (data.p1name === lastP1 && data.p2name === lastP2 && data.status === lastStatus) {
                return res.status(200).json(i === 1 ? { changed: false } : results);
            }
        }

        // Poll until winner is determined
        if (data.status !== "1" && data.status !== "2") {
            while (Date.now() < deadline) {
                await sleep(POLL_INTERVAL_MS);
                const polled = await fetchSaltyBetData();
                if (polled && (polled.status === "1" || polled.status === "2")) {
                    data = polled;
                    break;
                }
            }
        }

        await lastBet.update({
            content: {
                p1name: data.p1name,
                p2name: data.p2name,
                status: data.status,
            },
        });

        const winner =
            data.status === "1" ? "p1" : data.status === "2" ? "p2" : null;
        if (!winner) {
            return res.status(200).json(results);
        }

        const [p1] = await Fighter.findOrCreate({ where: { name: data.p1name } });
        const [p2] = await Fighter.findOrCreate({ where: { name: data.p2name } });

        let p1WinChance;
        if (predictions) {
            p1WinChance = await getWinRate(p1.uuid, p2.uuid);
        }

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

        await Promise.all([
            matchup.reload(),
            winner_fighter.reload(),
            loser_fighter.reload(),
        ]);

        results[`Match${i}`] = {
            p1: winner === "p1" ? winner_fighter : loser_fighter,
            p2: winner === "p1" ? loser_fighter : winner_fighter,
            matchup,
            ...(predictions && { p1WinChance }),
        };
    }

    return res.status(200).json(results);
}
