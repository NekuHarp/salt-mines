import {
    MATCH_MODES,
    PAGINATION,
    SORTABLE_COLUMNS,
} from "../../constants/index.js";
import { body, query } from "express-validator";
import {
    paginationValidatorBuilder,
    sortValidatorBuilder,
    timestampValidator,
} from "./shared/index.js";

import { validationErrorHandler } from "../utils/index.js";

const matchModes = Object.values(MATCH_MODES);

export const remainingListValidator = [
    query("mode").optional().isIn(matchModes),
    ...paginationValidatorBuilder(PAGINATION.GENERIC.LIMIT),
    sortValidatorBuilder(SORTABLE_COLUMNS.remainingS),
    ...timestampValidator,
    validationErrorHandler,
];

export const remainingCreateValidator = [
    body("value").isString(),
    body("mode").isIn(matchModes),
    validationErrorHandler,
];

export const remainingUpdateValidator = [
    body("value").optional().isString(),
    body("mode").optional().isIn(matchModes),
    validationErrorHandler,
];
