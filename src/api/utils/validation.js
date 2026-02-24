import { INVALID_VALUE, NOT_FOUND } from "../../shared/index.js";
import { matchedData, validationResult } from "express-validator";

import db from "../../database/models/index.js";

export function findByUuid(Model) {
    return async (req, res, next) => {
        const { uuid } = matchedData(req, {
            locations: ["params", "query"],
        });

        const modelInstance = await Model.findByPk(uuid);

        if (modelInstance === null) return res.fail(NOT_FOUND);

        req.model = { ...req.model, [Model.name]: modelInstance };

        return next();
    };
}

export function validationErrorHandler(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.fail({ ...INVALID_VALUE, errors: errors.array() });
    }
    return next();
}

export const findFighterByUuid = findByUuid(db.Fighter);
export const findMatchupByUuid = findByUuid(db.Matchup);
export const findRemainingByUuid = findByUuid(db.Remaining);
