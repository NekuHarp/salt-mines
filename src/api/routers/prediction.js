import {
    deletePrediction,
    getPrediction,
    listPredictions,
    updatePrediction,
} from "../controllers/index.js";
import {
    findPredictionByUuid,
    validationErrorHandler,
} from "../utils/index.js";
import {
    predictionGetValidator,
    predictionListValidator,
    predictionUpdateValidator,
} from "../validators/index.js";

import { Router } from "express";
import { param } from "express-validator";

export const predictionRouter = Router();

predictionRouter
    .param("uuid", param("uuid").isUUID(4).toLowerCase())
    .param("uuid", validationErrorHandler)
    .param("uuid", findPredictionByUuid);

// Rows are written by the listener, so there is deliberately no POST; reads,
// corrections and deletions of bad rows are all that's exposed.
predictionRouter.route("/").get(predictionListValidator, listPredictions);

predictionRouter
    .route("/:uuid")
    .get(predictionGetValidator, getPrediction)
    .patch(predictionUpdateValidator, updatePrediction)
    .delete(deletePrediction);
