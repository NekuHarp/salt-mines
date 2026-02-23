import { body } from "express-validator";
import { validationErrorHandler } from "../utils/index.js";

export const autoScrapeValidator = [
    body("matchesToRecord").optional().isInt({ min: 1, max: 10 }),
    body("predictions").optional().isBoolean(),
    validationErrorHandler,
];
