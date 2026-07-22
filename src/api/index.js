import {
    betRouter,
    fighterRouter,
    listenerRouter,
    matchupRouter,
    remainingRouter,
    stateRouter,
} from "./routers/index.js";

import { API_ROUTES } from "../constants/index.js";
import { Router } from "express";
import { basicAuth } from "../shared/index.js";

export const apiRouter = Router();

// Every route requires Basic Auth, except the read-only GET /state snapshot,
// which the state router leaves public while protecting its other routes.
apiRouter.use(API_ROUTES.Bet, basicAuth, betRouter);
apiRouter.use(API_ROUTES.Fighter, basicAuth, fighterRouter);
apiRouter.use(API_ROUTES.Listener, basicAuth, listenerRouter);
apiRouter.use(API_ROUTES.Matchup, basicAuth, matchupRouter);
apiRouter.use(API_ROUTES.Remaining, basicAuth, remainingRouter);
apiRouter.use(API_ROUTES.State, stateRouter);
