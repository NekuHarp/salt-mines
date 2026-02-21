import {
    createMatchup,
    deleteMatchup,
    getMatchup,
    listMatchups,
    updateMatchup,
} from "../controllers/index.js";
import { findMatchupByUuid, validationErrorHandler } from "../utils/index.js";
import {
    matchupCreateValidator,
    matchupListValidator,
    matchupUpdateValidator,
} from "../validators/index.js";

import { Router } from "express";
import { param } from "express-validator";

export const matchupRouter = Router();

matchupRouter
    .param("uuid", param("uuid").isUUID(4).toLowerCase())
    .param("uuid", validationErrorHandler)
    .param("uuid", findMatchupByUuid);

matchupRouter
    .route("/")
    .get(matchupListValidator, listMatchups)
    .post(matchupCreateValidator, createMatchup);

matchupRouter
    .route("/:uuid")
    .get(getMatchup)
    .patch(matchupUpdateValidator, updateMatchup)
    .delete(deleteMatchup);
