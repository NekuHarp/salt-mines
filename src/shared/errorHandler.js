// Catch-all error handler

import { INTERNAL_SERVER_ERROR } from "./errors.js";

export function errorHandler(err, req, res, next) {
    let response = INTERNAL_SERVER_ERROR;

    console.error("Unexpected error: ", err);

    return res.fail(response);
}
