import {
    createRemaining,
    deleteRemaining,
    getRemaining,
    listRemainings,
    updateRemaining,
} from "../controllers/index.js";
import { findRemainingByUuid, validationErrorHandler } from "../utils/index.js";
import {
    remainingCreateValidator,
    remainingListValidator,
    remainingUpdateValidator,
} from "../validators/index.js";

import { Router } from "express";
import { param } from "express-validator";

export const remainingRouter = Router();

remainingRouter
    .param("uuid", param("uuid").isUUID(4).toLowerCase())
    .param("uuid", validationErrorHandler)
    .param("uuid", findRemainingByUuid);

remainingRouter
    .route("/")
    .get(remainingListValidator, listRemainings)
    .post(remainingCreateValidator, createRemaining);

remainingRouter
    .route("/:uuid")
    .get(getRemaining)
    .patch(remainingUpdateValidator, updateRemaining)
    .delete(deleteRemaining);
