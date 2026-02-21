import { DELETION_SUCCESSFUL_MSG } from "../../constants/index.js";
import db from "../../database/models/index.js";
import { filterAll } from "../utils/index.js";
import { matchedData } from "express-validator";

const { Fighter, Matchup } = db;

function fighterEagerLoadOptions({ matchups }) {
    const includeList = [];

    if (matchups) {
        includeList.push({
            model: Matchup,
            as: "MatchupsAsP1",
            separate: true,
        });

        includeList.push({
            model: Matchup,
            as: "MatchupsAsP2",
            separate: true,
        });
    }

    return { include: includeList.length ? includeList : undefined };
}

export async function listFighters(req, res) {
    const query = matchedData(req, {
        locations: ["query"],
        includeOptionals: true,
    });
    const { name } = query;

    const findWhere = { name };

    const fightersAndCount = await Fighter.findAndCountAll({
        ...filterAll(query, findWhere),
        ...fighterEagerLoadOptions(query),
    });

    return res.status(200).json(fightersAndCount);
}

export async function getFighter(req, res) {
    const {
        model: { Fighter: fighter },
    } = req;

    return res.status(200).json(fighter);
}

export async function createFighter(req, res) {
    const bodyData = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });
    const fighter = await Fighter.create(bodyData);
    return res.status(200).json(fighter);
}

export async function updateFighter(req, res) {
    const bodyData = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });

    const updatedFighter = await req.model.Fighter.update(bodyData);
    return res.status(200).json(updatedFighter);
}

export async function deleteFighter(req, res) {
    const fighter = req.model.Fighter;

    await fighter.destroy();
    return res.status(200).json(DELETION_SUCCESSFUL_MSG);
}
