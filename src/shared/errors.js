export const INTERNAL_SERVER_ERROR = Object.freeze({
    httpCode: 500,
    message: "Internal server error.",
    errorCode: 10,
});

export const NOT_FOUND = Object.freeze({
    httpCode: 404,
    message: "Not found.",
    errorCode: 20,
});

export const INVALID_VALUE = Object.freeze({
    httpCode: 422,
    message: "Invalid value.",
    errorCode: 30,
});
