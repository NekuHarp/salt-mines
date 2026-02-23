import db from "../database/models/index.js";

const { Fighter, LastBet, Matchup } = db;

const POLL_INTERVAL_MS = 3000;

let intervalId = null;
let active = false;
let processing = false;
let params = null;
let matchesRecorded = 0;

async function fetchSaltyBetData() {
    const response = await fetch(process.env.SALTY_BET_API_URL);
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
        const { p1name: lastP1, p2name: lastP2, status: lastStatus } = lastBet.content ?? {};

        if (data.p1name === lastP1 && data.p2name === lastP2 && data.status === lastStatus) {
            return;
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
        if (!winner) return;

        const [p1] = await Fighter.findOrCreate({ where: { name: data.p1name } });
        const [p2] = await Fighter.findOrCreate({ where: { name: data.p2name } });

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

        if (params?.matchesToRecord && matchesRecorded >= params.matchesToRecord) {
            stop();
        }
    } finally {
        processing = false;
    }
}

export function start(options = {}) {
    params = {
        matchesToRecord: options.matchesToRecord ?? null,
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
