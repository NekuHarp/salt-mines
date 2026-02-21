import { errorHandler, fail } from "./shared/index.js";

import { JSON_BODY_PARSER_SIZE_LIMIT } from "./constants/app.js";
import { MAIN_API_ROOT } from "./constants/api.js";
import { apiRouter } from "./api/index.js";
import express from "express";
import helmet from "helmet";
import { parse } from "qs";

export const app = express();

// query string `?a=` is parsed to { a: ""}
// query string `?a` is parsed to { a: null }
app.set("query parser", function (queryString) {
    // https://github.com/ljharb/qs#handling-of-null-values
    return parse(queryString, { strictNullHandling: true });
});

// Add .fail() helper to response
app.use(helmet(), fail);

// Route used by AWS to check instances status
app.get("/health_check", (req, res) => {
    return res.status(200).json({ health_check: "ok" });
});

// Parses body when content-type is application/json
app.use(express.json({ limit: JSON_BODY_PARSER_SIZE_LIMIT }));

// Main API
app.use(MAIN_API_ROOT, apiRouter);

// Should be the last middleware to ensure all errors are caught
app.use(errorHandler);
