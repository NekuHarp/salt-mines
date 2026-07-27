import { DELETION_SUCCESSFUL_MSG } from "../../constants/index.js";
import Sequelize from "sequelize";
import db from "../../database/models/index.js";
import { filterAll } from "../utils/index.js";
import { matchedData } from "express-validator";

const { Fighter, Prediction } = db;

const FIGHTER_ASSOCIATIONS = ["P1", "P2"];

/**
 * Builds the P1/P2 include list.
 *
 * The join is added whenever a nested key is referenced, not just when the
 * caller asked for the fighters: preprocessWhere turns "P1_name" into
 * "$P1.name$" and getSort turns it into [["P1", "name", dir]], neither of which
 * resolves unless the association is actually joined. When the join is only
 * there to serve a sort or filter, `attributes: []` keeps the fighters out of
 * the response.
 */
function fighterEagerLoadOptions({ fightersInfo, sort, P1_name, P2_name }) {
    const sortField = sort?.replace(/^-/, "") ?? "";
    const joinNeeded =
        Boolean(fightersInfo) ||
        P1_name !== undefined ||
        P2_name !== undefined ||
        FIGHTER_ASSOCIATIONS.some((as) => sortField.startsWith(`${as}_`));

    if (!joinNeeded) return {};

    return {
        include: FIGHTER_ASSOCIATIONS.map((as) => ({
            model: Fighter,
            as,
            ...(fightersInfo ? {} : { attributes: [] }),
        })),
    };
}

/**
 * `selectedPlayer` is null on every match we didn't bet on, so `betPlaced`
 * maps to a null check. An explicit `selectedPlayer` filter is more specific
 * and wins.
 */
function selectedPlayerFilter(selectedPlayer, betPlaced) {
    if (selectedPlayer !== undefined) return selectedPlayer;
    if (betPlaced === undefined) return undefined;

    return betPlaced
        ? { [Sequelize.Op.ne]: null }
        : { [Sequelize.Op.is]: null };
}

export async function listPredictions(req, res) {
    const query = matchedData(req, {
        locations: ["query"],
        includeOptionals: true,
    });
    const {
        p1Uuid,
        p2Uuid,
        P1_name,
        P2_name,
        mode,
        winner,
        selectedPlayer,
        betPlaced,
        p1WinChance,
        p1Total,
        p2Total,
        wager,
        balanceBefore,
    } = query;

    const findWhere = {
        p1Uuid,
        p2Uuid,
        P1_name,
        P2_name,
        mode,
        winner,
        p1WinChance,
        p1Total,
        p2Total,
        wager,
        balanceBefore,
        selectedPlayer: selectedPlayerFilter(selectedPlayer, betPlaced),
    };

    const predictionsAndCount = await Prediction.findAndCountAll({
        ...filterAll(query, findWhere),
        ...fighterEagerLoadOptions(query),
    });

    return res.status(200).json(predictionsAndCount);
}

export async function getPrediction(req, res) {
    const { fightersInfo } = matchedData(req, {
        locations: ["query"],
        includeOptionals: true,
    });
    const prediction = req.model.Prediction;

    // The uuid param loads the row without associations, so the fighters are
    // only fetched when they were asked for.
    if (fightersInfo) {
        await prediction.reload(fighterEagerLoadOptions({ fightersInfo }));
    }

    return res.status(200).json(prediction);
}

export async function updatePrediction(req, res) {
    const bodyData = matchedData(req, {
        locations: ["body"],
        includeOptionals: true,
    });

    const updatedPrediction = await req.model.Prediction.update(bodyData);
    return res.status(200).json(updatedPrediction);
}

export async function deletePrediction(req, res) {
    const prediction = req.model.Prediction;

    await prediction.destroy();
    return res.status(200).json(DELETION_SUCCESSFUL_MSG);
}
