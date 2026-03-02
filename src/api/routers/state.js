import { autoDataScrape, currentMatchData, currentMatchupPrediction } from "../controllers/index.js";
import { Router } from "express";
import { autoScrapeValidator } from "../validators/index.js";

export const stateRouter = Router();

stateRouter.get("/", currentMatchupPrediction);
stateRouter.get("/current", currentMatchData);
stateRouter.put("/auto", autoScrapeValidator, autoDataScrape);
