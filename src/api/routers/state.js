import { autoDataScrape, currentMatchupPrediction } from "../controllers/index.js";
import { Router } from "express";
import { autoScrapeValidator } from "../validators/index.js";

export const stateRouter = Router();

stateRouter.get("/", currentMatchupPrediction);
stateRouter.put("/auto", autoScrapeValidator, autoDataScrape);
