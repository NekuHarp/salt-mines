import db from "../database/models/index.js";

const { Fighter, Matchup } = db;

// How many "virtual" head-to-head games the general-rate prior is worth.
// Low (3–5) = matchup data overrides quickly; high (20+) = needs many games.
const PRIOR_STRENGTH = 5;

function computeWinRate(p1, p2, matchupAsP1, matchupAsP2) {
    // Laplace-smoothed general win rates to avoid 0/1 extremes
    const p1Rate = (p1.wins + 1) / (p1.matches + 2);
    const p2Rate = (p2.wins + 1) / (p2.matches + 2);

    // Bradley-Terry prior from general win rates
    const s1 = p1Rate / (1 - p1Rate);
    const s2 = p2Rate / (1 - p2Rate);
    const prior = s1 / (s1 + s2);

    // Head-to-head data
    const matchupWins =
        (matchupAsP1?.p1Wins ?? 0) + (matchupAsP2?.p2Wins ?? 0);
    const matchupTotal =
        (matchupAsP1?.matches ?? 0) + (matchupAsP2?.matches ?? 0);

    // Bayesian update (Beta distribution posterior mean)
    const alpha = prior * PRIOR_STRENGTH + matchupWins;
    const beta = (1 - prior) * PRIOR_STRENGTH + (matchupTotal - matchupWins);
    const result = alpha / (alpha + beta);

    return Math.round(result * 10000) / 100;
}

export async function getWinRate(p1Uuid, p2Uuid) {
    const [p1, p2, matchupAsP1, matchupAsP2] = await Promise.all([
        Fighter.findByPk(p1Uuid),
        Fighter.findByPk(p2Uuid),
        Matchup.findOne({ where: { p1Uuid, p2Uuid } }),
        Matchup.findOne({ where: { p1Uuid: p2Uuid, p2Uuid: p1Uuid } }),
    ]);

    if (!p1 || !p2) return null;

    return computeWinRate(p1, p2, matchupAsP1, matchupAsP2);
}

export function getWinRateFromData(p1, p2, matchup) {
    return computeWinRate(p1, p2, matchup, null);
}
