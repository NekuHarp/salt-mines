import {
    fighterRouter,
    listenerRouter,
    matchupRouter,
    remainingRouter,
    stateRouter,
} from "./routers/index.js";

import { API_ROUTES } from "../constants/index.js";
import { Router } from "express";

export const apiRouter = Router();

apiRouter.use(API_ROUTES.Fighter, fighterRouter);
apiRouter.use(API_ROUTES.Listener, listenerRouter);
apiRouter.use(API_ROUTES.Matchup, matchupRouter);
apiRouter.use(API_ROUTES.Remaining, remainingRouter);
apiRouter.use(API_ROUTES.State, stateRouter);
