import db from "../../database/models/index.js";
import { matchedData } from "express-validator";

const { Fighter, LastBet, Matchup } = db;

export async function manualDataScrape(req, res) {
    const { winner } = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });

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

    let matchup = null;
    if (winner) {
        const [winner_fighter, loser_fighter] =
            winner === "p1" ? [p1, p2] : [p2, p1];

        [matchup] = await Matchup.findOrCreate({
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

        return res.status(200).json({
            p1: winner === "p1" ? winner_fighter : loser_fighter,
            p2: winner === "p1" ? loser_fighter : winner_fighter,
            matchup,
        });
    }

    return res.status(200).json({ p1, p2, matchup });
}

export async function autoDataScrape(req, res) {
    const response = await fetch(process.env.SALTY_BET_API_URL);
    if (!response.ok) {
        return res.fail({
            httpCode: 502,
            message: "Salty Bet API request failed.",
            errorCode: 40,
        });
    }

    const { p1name, p2name, status } = await response.json();
    if (!p1name || !p2name) {
        return res.fail({
            httpCode: 502,
            message: "Salty Bet API response is missing fighter names.",
            errorCode: 41,
        });
    }

    const lastBet = await LastBet.findByPk(0);
    const { p1name: lastP1, p2name: lastP2, status: lastStatus } = lastBet.content ?? {};
    if (p1name === lastP1 && p2name === lastP2 && status === lastStatus) {
        return res.status(200).json({ changed: false });
    }

    await lastBet.update({ content: { p1name, p2name, status } });

    const [p1] = await Fighter.findOrCreate({ where: { name: p1name } });
    const [p2] = await Fighter.findOrCreate({ where: { name: p2name } });

    const winner = status === "1" ? "p1" : status === "2" ? "p2" : null;

    let matchup = null;
    if (winner) {
        const [winner_fighter, loser_fighter] =
            winner === "p1" ? [p1, p2] : [p2, p1];

        [matchup] = await Matchup.findOrCreate({
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

        return res.status(200).json({
            p1: winner === "p1" ? winner_fighter : loser_fighter,
            p2: winner === "p1" ? loser_fighter : winner_fighter,
            matchup,
        });
    }

    return res.status(200).json({ p1, p2, matchup });
}
