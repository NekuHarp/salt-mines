import {
    createFighter,
    deleteFighter,
    getFighter,
    listFighters,
    updateFighter,
} from "../controllers/index.js";
import {
    fighterCreateValidator,
    fighterListValidator,
    fighterUpdateValidator,
} from "../validators/index.js";
import { findFighterByUuid, validationErrorHandler } from "../utils/index.js";

import { Router } from "express";
import { param } from "express-validator";

export const fighterRouter = Router();

fighterRouter
    .param("uuid", param("uuid").isUUID(4).toLowerCase())
    .param("uuid", validationErrorHandler)
    .param("uuid", findFighterByUuid);

fighterRouter
    .route("/")
    .get(fighterListValidator, listFighters)
    .post(fighterCreateValidator, createFighter);

fighterRouter
    .route("/:uuid")
    .get(getFighter)
    .patch(fighterUpdateValidator, updateFighter)
    .delete(deleteFighter);
