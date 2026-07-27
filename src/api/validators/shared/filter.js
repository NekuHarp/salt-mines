import {
    NUMBER_FILTER_OPERATORS,
    RANGE_FILTER_OPERATORS,
    STRING_FILTER_OPERATORS,
} from "../../../constants/index.js";

import { query } from "express-validator";

/**
 * Validates a query filter that accepts either a bare value (treated as
 * "equals") or an operator array, in the shape preprocessWhere consumes:
 *
 *   ?wager=500                             -> equals 500
 *   ?wager[]=gte&wager[]=500               -> >= 500
 *   ?wager[]=between&wager[]=1&wager[]=99  -> between 1 and 99
 *
 * Range operators take two values, every other operator takes one.
 */
function filterValidatorBuilder(field, operators, { validate, sanitize }) {
    return query(field)
        .optional()
        .custom((value) => {
            if (!Array.isArray(value)) return validate(value);

            const [operator, ...values] = value;
            if (!operators.includes(operator)) {
                throw new Error(
                    `${field} operator must be one of: ${operators.join(", ")}`
                );
            }

            const expected = RANGE_FILTER_OPERATORS.includes(operator) ? 2 : 1;
            if (values.length !== expected) {
                throw new Error(
                    `${field} "${operator}" expects ${expected} value(s), got ${values.length}`
                );
            }

            return values.every((entry) => validate(entry));
        })
        .customSanitizer((value) =>
            Array.isArray(value)
                ? [value[0], ...value.slice(1).map((entry) => sanitize(entry))]
                : sanitize(value)
        );
}

export const numberFilterValidatorBuilder = (
    field,
    operators = NUMBER_FILTER_OPERATORS
) =>
    filterValidatorBuilder(
        field,
        [...operators, ...RANGE_FILTER_OPERATORS],
        {
            validate: (value) => {
                if (
                    typeof value === "object" ||
                    value === "" ||
                    value === null ||
                    Number.isNaN(Number(value))
                ) {
                    throw new Error(`${field} must be a number`);
                }
                return true;
            },
            sanitize: Number,
        }
    );

export const stringFilterValidatorBuilder = (
    field,
    operators = STRING_FILTER_OPERATORS
) =>
    filterValidatorBuilder(field, operators, {
        validate: (value) => {
            if (typeof value !== "string") {
                throw new Error(`${field} must be a string`);
            }
            return true;
        },
        sanitize: String,
    });
