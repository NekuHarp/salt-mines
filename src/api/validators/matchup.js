import { PAGINATION, SORTABLE_COLUMNS } from "../../constants/index.js";
import { body, query } from "express-validator";
import {
    paginationValidatorBuilder,
    sortValidatorBuilder,
    timestampValidator,
} from "./shared/index.js";

import { validationErrorHandler } from "../utils/index.js";

export const matchupListValidator = [
    query("p1Uuid").optional().isUUID(4).toLowerCase(),
    query("p2Uuid").optional().isUUID(4).toLowerCase(),
    ...paginationValidatorBuilder(PAGINATION.GENERIC.LIMIT),
    sortValidatorBuilder(SORTABLE_COLUMNS.MATCHUPS),
    ...timestampValidator,
    validationErrorHandler,
];

export const matchupCreateValidator = [
    body("p1Uuid").isUUID(4).toLowerCase(),
    body("p2Uuid").isUUID(4).toLowerCase(),
    body("matches").optional().isInt({ gte: 0 }).toInt(),
    body("p1Wins").optional().isInt({ gte: 0 }).toInt(),
    body("p2Wins").optional().isInt({ gte: 0 }).toInt(),
    validationErrorHandler,
];

export const matchupUpdateValidator = [
    body("matches").optional().isInt({ gte: 0 }).toInt(),
    body("p1Wins").optional().isInt({ gte: 0 }).toInt(),
    body("p2Wins").optional().isInt({ gte: 0 }).toInt(),
    validationErrorHandler,
];
