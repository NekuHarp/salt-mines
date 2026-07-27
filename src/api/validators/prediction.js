import {
    MATCH_MODES,
    MATCH_WINNERS,
    PAGINATION,
    SELECTED_PLAYERS,
    SORTABLE_COLUMNS,
} from "../../constants/index.js";
import { body, query } from "express-validator";
import {
    numberFilterValidatorBuilder,
    paginationValidatorBuilder,
    sortValidatorBuilder,
    stringFilterValidatorBuilder,
    timestampValidator,
} from "./shared/index.js";

import { validationErrorHandler } from "../utils/index.js";

const matchModes = Object.values(MATCH_MODES);
const matchWinners = Object.values(MATCH_WINNERS);
const selectedPlayers = Object.values(SELECTED_PLAYERS);

// Returns the fighters as nested P1/P2 objects instead of just their UUIDs.
const fightersInfoValidator = query("fightersInfo")
    .optional()
    .isBoolean()
    .toBoolean();

export const predictionListValidator = [
    query("p1Uuid").optional().isUUID(4).toLowerCase(),
    query("p2Uuid").optional().isUUID(4).toLowerCase(),
    stringFilterValidatorBuilder("P1_name"),
    stringFilterValidatorBuilder("P2_name"),
    query("mode").optional().isIn(matchModes),
    query("winner").optional().isIn(matchWinners),
    query("selectedPlayer").optional().isIn(selectedPlayers),
    // Convenience filter for "matches we actually bet on", which the operator
    // syntax can't express: it has no IS NULL / IS NOT NULL operator.
    query("betPlaced").optional().isBoolean().toBoolean(),
    numberFilterValidatorBuilder("p1WinChance"),
    numberFilterValidatorBuilder("p1Total"),
    numberFilterValidatorBuilder("p2Total"),
    numberFilterValidatorBuilder("wager"),
    numberFilterValidatorBuilder("balanceBefore"),
    fightersInfoValidator,
    ...paginationValidatorBuilder(PAGINATION.GENERIC.LIMIT),
    // Defaults to "-createdAt": the latest prediction first.
    sortValidatorBuilder(SORTABLE_COLUMNS.PREDICTIONS),
    ...timestampValidator,
    validationErrorHandler,
];

export const predictionGetValidator = [
    fightersInfoValidator,
    validationErrorHandler,
];

/**
 * Corrections to a logged prediction. Every column is optional; the nullable
 * ones accept an explicit null to clear them.
 *
 * Uses `min` rather than the `gte` seen in the older validators — `gte` is not
 * an isInt option, so it silently validates nothing, and these columns are
 * UNSIGNED and would fail at the database instead.
 */
export const predictionUpdateValidator = [
    body("p1Uuid").optional().isUUID(4).toLowerCase(),
    body("p2Uuid").optional().isUUID(4).toLowerCase(),
    body("mode").optional().isIn(matchModes),
    body("winner").optional().isIn(matchWinners),
    body("p1WinChance").optional().isFloat({ min: 0, max: 100 }).toFloat(),
    body("p1Matches").optional().isInt({ min: 0 }).toInt(),
    body("p1Wins").optional().isInt({ min: 0 }).toInt(),
    body("p2Matches").optional().isInt({ min: 0 }).toInt(),
    body("p2Wins").optional().isInt({ min: 0 }).toInt(),
    body("h2hMatches").optional().isInt({ min: 0 }).toInt(),
    body("h2hP1Wins").optional().isInt({ min: 0 }).toInt(),
    body("p1Total").optional({ values: "null" }).isInt({ min: 0 }).toInt(),
    body("p2Total").optional({ values: "null" }).isInt({ min: 0 }).toInt(),
    body("selectedPlayer")
        .optional({ values: "null" })
        .isIn(selectedPlayers),
    body("wager").optional({ values: "null" }).isInt({ min: 0 }).toInt(),
    body("balanceBefore")
        .optional({ values: "null" })
        .isInt({ min: 0 })
        .toInt(),
    validationErrorHandler,
];
