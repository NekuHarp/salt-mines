import { PAGINATION, SORTABLE_COLUMNS } from "../../constants/index.js";
import { body, query } from "express-validator";
import {
    paginationValidatorBuilder,
    sortValidatorBuilder,
    timestampValidator,
} from "./shared/index.js";

import { validationErrorHandler } from "../utils/index.js";

export const fighterListValidator = [
    query("name").optional().isString(),
    ...paginationValidatorBuilder(PAGINATION.GENERIC.LIMIT),
    sortValidatorBuilder(SORTABLE_COLUMNS.FIGHTERS),
    ...timestampValidator,
    validationErrorHandler,
];

export const fighterCreateValidator = [
    body("name").isString(),
    body("matches").optional().isInt({ gte: 0 }).toInt(),
    body("wins").optional().isInt({ gte: 0 }).toInt(),
    body("losses").optional().isInt({ gte: 0 }).toInt(),
    validationErrorHandler,
];

export const fighterUpdateValidator = [
    body("name").optional().isString(),
    body("matches").optional().isInt({ gte: 0 }).toInt(),
    body("wins").optional().isInt({ gte: 0 }).toInt(),
    body("losses").optional().isInt({ gte: 0 }).toInt(),
    validationErrorHandler,
];
