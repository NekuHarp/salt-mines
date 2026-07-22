import { bet, login } from "../controllers/index.js";

import { Router } from "express";
import { placeBetValidator } from "../validators/index.js";

export const betRouter = Router();

betRouter.put("/login", login);
betRouter.put("/", placeBetValidator, bet);
