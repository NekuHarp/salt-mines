import { SELECTED_PLAYERS } from "../../constants/index.js";
import { body } from "express-validator";
import { validationErrorHandler } from "../utils/index.js";

export const placeBetValidator = [
    body("selectedplayer").isIn([SELECTED_PLAYERS.P1, SELECTED_PLAYERS.P2]),
    body("wager").isInt({ min: 1 }).toInt(),
    validationErrorHandler,
];
