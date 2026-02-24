import { DELETION_SUCCESSFUL_MSG } from "../../constants/index.js";
import db from "../../database/models/index.js";
import { filterAll } from "../utils/index.js";
import { matchedData } from "express-validator";

const { Remaining } = db;

export async function listRemainings(req, res) {
    const query = matchedData(req, {
        locations: ["query"],
        includeOptionals: true,
    });

    const { mode } = query;

    const findWhere = { mode };

    const remainingsAndCount = await Remaining.findAndCountAll({
        ...filterAll(query, findWhere),
    });

    return res.status(200).json(remainingsAndCount);
}

export async function getRemaining(req, res) {
    const {
        model: { Remaining: remaining },
    } = req;

    return res.status(200).json(remaining);
}

export async function createRemaining(req, res) {
    const bodyData = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });
    const remaining = await Remaining.create(bodyData);
    return res.status(200).json(remaining);
}

export async function updateRemaining(req, res) {
    const bodyData = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });

    const updatedRemaining = await req.model.Remaining.update(bodyData);
    return res.status(200).json(updatedRemaining);
}

export async function deleteRemaining(req, res) {
    const remaining = req.model.Remaining;

    await remaining.destroy();
    return res.status(200).json(DELETION_SUCCESSFUL_MSG);
}
