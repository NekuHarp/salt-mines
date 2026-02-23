import { autoDataScrape, manualDataScrape } from "../controllers/index.js";
import { Router } from "express";
import { autoScrapeValidator, stateSyncValidator } from "../validators/index.js";

export const stateRouter = Router();

stateRouter.put("/", stateSyncValidator, manualDataScrape);
stateRouter.put("/auto", autoScrapeValidator, autoDataScrape);
