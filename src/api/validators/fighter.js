import { PAGINATION, SORTABLE_COLUMNS } from "../../constants/index.js";
import {
    paginationValidatorBuilder,
    sortValidatorBuilder,
    stringFilterValidatorBuilder,
    timestampValidator,
} from "./shared/index.js";

import { body } from "express-validator";
import { validationErrorHandler } from "../utils/index.js";

export const fighterListValidator = [
    // Accepts the operator array the other resources take, so a name can be
    // searched by substring and not just matched whole. A bare `?name=Foo` still
    // means equals, so existing callers are unaffected.
    stringFilterValidatorBuilder("name"),
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
