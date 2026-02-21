import { body } from "express-validator";
import { validationErrorHandler } from "../utils/index.js";

export const stateSyncValidator = [
    body("winner").optional().isIn(["p1", "p2"]),
    validationErrorHandler,
];
