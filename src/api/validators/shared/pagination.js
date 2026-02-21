import { query } from "express-validator";

export function paginationValidatorBuilder({
    DEFAULT: defaultLimit,
    MAX: maxLimit,
}) {
    return [
        query("offset").default(0).isInt({ min: 0 }).toInt(),
        query("limit")
            .default(defaultLimit)
            .isInt({ min: 0, max: maxLimit })
            .withMessage(`Limit should be an integer between 0 and ${maxLimit}`)
            .toInt(),
    ];
}
