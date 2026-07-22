import { autoDataScrape, currentBalance, currentMatchData } from "../controllers/index.js";
import { Router } from "express";
import { autoScrapeValidator } from "../validators/index.js";
import { basicAuth } from "../../shared/index.js";

export const stateRouter = Router();

// GET /state is public; the rest are protected.
stateRouter.get("/", currentMatchData);
stateRouter.get("/balance", basicAuth, currentBalance);
stateRouter.put("/auto", basicAuth, autoScrapeValidator, autoDataScrape);
