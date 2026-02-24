import { body } from "express-validator";
import { validationErrorHandler } from "../utils/index.js";

export const autoScrapeValidator = [
    body("matchesToRecord").optional().isInt({ min: 1, max: 25 }),
    body("predictions").optional().isBoolean(),
    body("recordRemaining").optional().isBoolean(),
    validationErrorHandler,
];
