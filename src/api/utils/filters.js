import {
    FILTER_OPERATORS,
    RANGE_FILTER_OPERATORS,
} from "../../constants/api.js";

import Sequelize from "sequelize";
import { getSort } from "./index.js";

/**
 * Construct a sequelize where clause for a range
 * @param {{ min?: (number|Date), max?: (number|Date), inclusive?: boolean = true}} rangeParams - Defaults to empty object. inclusive key defaults to true
 * @returns {(Object.<string, (number|Date)>|undefined)} - undefined if min and max are not defined
 */
export function getRangeFilter({ max, min, inclusive = true } = {}) {
    if (min === undefined && max === undefined) return undefined;

    const filter = {};

    if (min !== undefined)
        filter[inclusive ? Sequelize.Op.gte : Sequelize.Op.gt] = min;
    if (max !== undefined)
        filter[inclusive ? Sequelize.Op.lte : Sequelize.Op.lt] = max;

    return filter;
}

export function filterWhere(whereObject) {
    // Creates an object from a list of pair key/value
    return Object.fromEntries(
        // Creates a list of pair key/value and filter to remove `undefined` values
        Object.entries(whereObject).filter(([, value]) => value !== undefined),
    );
}

export function preprocessWhere(whereObject) {
    return Object.entries(whereObject)
        .filter(([, value]) => value !== undefined)
        .reduce((where, [key, value]) => {
            let trueKey;
            if (key.includes("_")) {
                // This makes it so that it doesn't include the base model before the key if there's already one
                // For example, when filtering on Region_name, on Company, trueKey will be "Region.name" instead of "Company.Region.name"
                trueKey = `$${key.replaceAll("_", ".")}$`;
            } else {
                trueKey = key;
            }

            let filter;
            // if array -> advanced filtering ; if not array -> basic "equals" filtering
            if (Array.isArray(value)) {
                // check if we need one or two values (here, we'll need two)
                if (RANGE_FILTER_OPERATORS.includes(value[0])) {
                    filter = {
                        [FILTER_OPERATORS[value[0]]]: [value[1], value[2]],
                    };
                } else {
                    // here, we'll need one value
                    filter = {
                        [FILTER_OPERATORS[value[0]]]: value[1],
                    };
                }
            } else {
                // basic "equals" filtering
                filter = value;
            }

            // eslint-disable-next-line security/detect-object-injection
            where[trueKey] = filter;

            return where;
        }, {});
}

export function filterAll(
    {
        offset,
        limit,
        sort,
        createdBefore,
        createdAfter,
        updatedBefore,
        updatedAfter,
    } = {},
    where,
) {
    return {
        where: preprocessWhere({
            ...where,
            createdAt: getRangeFilter({
                min: createdAfter,
                max: createdBefore,
            }),
            updatedAt: getRangeFilter({
                min: updatedAfter,
                max: updatedBefore,
            }),
        }),
        offset,
        limit,
        order: getSort(sort),
    };
}
