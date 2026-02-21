export function fail(req, res, next) {
    res.fail = ({ httpCode, ...body }) => res.status(httpCode).json(body);
    next();
}
