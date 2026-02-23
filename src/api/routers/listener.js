import { getListenerStatus, startListener, stopListener } from "../controllers/index.js";
import { Router } from "express";
import { startListenerValidator } from "../validators/index.js";

export const listenerRouter = Router();

listenerRouter.get("/", getListenerStatus);
listenerRouter.put("/start", startListenerValidator, startListener);
listenerRouter.put("/stop", stopListener);
