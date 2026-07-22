import { autoDataScrape, currentBalance, currentMatchData, currentMatchupPrediction } from "../controllers/index.js";
import { Router } from "express";
import { autoScrapeValidator } from "../validators/index.js";
import { basicAuth } from "../../shared/index.js";

export const stateRouter = Router();

// GET /state and GET /state/current are public; the rest are protected.
stateRouter.get("/", currentMatchupPrediction);
stateRouter.get("/current", currentMatchData);
stateRouter.get("/balance", basicAuth, currentBalance);
stateRouter.put("/auto", basicAuth, autoScrapeValidator, autoDataScrape);
