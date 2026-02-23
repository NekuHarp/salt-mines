import db from "../database/models/index.js";

const { Fighter, Matchup } = db;

export async function getWinRate(p1Uuid, p2Uuid) {
    const [p1, p2, matchupAsP1, matchupAsP2] = await Promise.all([
        Fighter.findByPk(p1Uuid),
        Fighter.findByPk(p2Uuid),
        Matchup.findOne({ where: { p1Uuid, p2Uuid } }),
        Matchup.findOne({ where: { p1Uuid: p2Uuid, p2Uuid: p1Uuid } }),
    ]);

    if (!p1 || !p2) return null;

    // Matchup win rate: combine both directions
    const p1MatchupWins =
        (matchupAsP1?.p1Wins ?? 0) + (matchupAsP2?.p2Wins ?? 0);
    const totalMatchupMatches =
        (matchupAsP1?.matches ?? 0) + (matchupAsP2?.matches ?? 0);

    const MATCHUP_EXTRA_WEIGHT = 9;

    let p1MatchupWinRate;
    if (totalMatchupMatches > 0) {
        const weightedWins = p1.wins + p1MatchupWins * MATCHUP_EXTRA_WEIGHT;
        const weightedMatches =
            p1.matches + totalMatchupMatches * MATCHUP_EXTRA_WEIGHT;
        p1MatchupWinRate = (weightedWins / weightedMatches) * 100;
    } else {
        const p1GeneralWinRate =
            p1.matches > 0 ? (p1.wins / p1.matches) * 100 : 0;
        const p2GeneralWinRate =
            p2.matches > 0 ? (p2.wins / p2.matches) * 100 : 0;
        p1MatchupWinRate = Math.min(
            100,
            Math.max(0, 50 + (p1GeneralWinRate - p2GeneralWinRate))
        );
    }

    return Math.round(p1MatchupWinRate * 100) / 100;
}
