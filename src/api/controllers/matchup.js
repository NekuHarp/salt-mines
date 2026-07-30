import { DELETION_SUCCESSFUL_MSG } from "../../constants/index.js";
import Sequelize from "sequelize";
import db from "../../database/models/index.js";
import { filterAll } from "../utils/index.js";
import { matchedData } from "express-validator";

const { Fighter, Matchup } = db;

function matchupEagerLoadOptions() {
    const includeList = [];

    includeList.push({
        model: Fighter,
        as: "P1",
    });

    includeList.push({
        model: Fighter,
        as: "P2",
    });

    return { include: includeList.length ? includeList : undefined };
}

/**
 * "Either fighter is named like this", which preprocessWhere cannot build: the
 * operator syntax ANDs its fields together and has no OR.
 *
 * Both fighters are always joined by matchupEagerLoadOptions, so the `$P1.name$`
 * references always resolve.
 */
function eitherFighterNamed(fragment) {
    if (!fragment) return undefined;

    return [
        { "$P1.name$": { [Sequelize.Op.substring]: fragment } },
        { "$P2.name$": { [Sequelize.Op.substring]: fragment } },
    ];
}

export async function listMatchups(req, res) {
    const query = matchedData(req, {
        locations: ["query"],
        includeOptionals: true,
    });
    const { p1Uuid, p2Uuid, P1_name, P2_name, fighterNameContains } = query;

    const findWhere = { p1Uuid, p2Uuid, P1_name, P2_name };

    const { where, ...listOptions } = filterAll(query, findWhere);
    const eitherSide = eitherFighterNamed(fighterNameContains);

    const matchupsAndCount = await Matchup.findAndCountAll({
        ...listOptions,
        where: eitherSide
            ? { ...where, [Sequelize.Op.or]: eitherSide }
            : where,
        ...matchupEagerLoadOptions(),
    });

    return res.status(200).json(matchupsAndCount);
}

export async function getMatchup(req, res) {
    const {
        model: { Matchup: matchup },
    } = req;

    return res.status(200).json(matchup);
}

export async function createMatchup(req, res) {
    const bodyData = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });
    const matchup = await Matchup.create(bodyData);
    return res.status(200).json(matchup);
}

export async function updateMatchup(req, res) {
    const bodyData = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });

    const updatedMatchup = await req.model.Matchup.update(bodyData);
    return res.status(200).json(updatedMatchup);
}

export async function deleteMatchup(req, res) {
    const matchup = req.model.Matchup;

    await matchup.destroy();
    return res.status(200).json(DELETION_SUCCESSFUL_MSG);
}
