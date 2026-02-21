import Sequelize from "sequelize";

export const DELETION_SUCCESSFUL_MSG = "Deleted successfully.";

export const MAIN_API_ROOT = "";

export const API_ROUTES = Object.freeze({
    Fighter: "/fighters",
    Matchup: "/matchups",
    State: "/state",
});

/**
 * Api limits
 */
export const PAGINATION = Object.freeze({
    GENERIC: {
        LIMIT: {
            DEFAULT: 1000,
            MAX: 50000,
        },
    },
});

/**
 * Sortable columns per model
 */
export const SORTABLE_COLUMNS = Object.freeze({
    FIGHTERS: ["name", "matches", "wins", "losses", "createdAt", "updatedAt"],
    MATCHUPS: ["P1_name", "P2_name", "createdAt", "updatedAt"],
});

const FILTER_OPERATORS_NAMES = Object.freeze({
    CONTAINS: "contains",
    EQUALS: "equals",
    NOT: "not",
    BETWEEN: "between",
    BEFORE: "before",
    AFTER: "after",
    LESSTE: "lte",
    GREATERTE: "gte",
    LESS: "lt",
    GREATER: "gt",
});

export const FILTER_OPERATORS = Object.freeze({
    [FILTER_OPERATORS_NAMES.CONTAINS]: Sequelize.Op.substring,
    [FILTER_OPERATORS_NAMES.EQUALS]: Sequelize.Op.eq,
    [FILTER_OPERATORS_NAMES.NOT]: Sequelize.Op.ne,
    [FILTER_OPERATORS_NAMES.BETWEEN]: Sequelize.Op.between,
    [FILTER_OPERATORS_NAMES.BEFORE]: Sequelize.Op.lte,
    [FILTER_OPERATORS_NAMES.AFTER]: Sequelize.Op.gte,
    [FILTER_OPERATORS_NAMES.LESSTE]: Sequelize.Op.lte,
    [FILTER_OPERATORS_NAMES.GREATERTE]: Sequelize.Op.gte,
    [FILTER_OPERATORS_NAMES.LESS]: Sequelize.Op.lt,
    [FILTER_OPERATORS_NAMES.GREATER]: Sequelize.Op.gt,
});

export const BASE_FILTER_OPERATORS = [
    FILTER_OPERATORS_NAMES.EQUALS,
    FILTER_OPERATORS_NAMES.NOT,
];
export const RANGE_FILTER_OPERATORS = [FILTER_OPERATORS_NAMES.BETWEEN];
export const STRING_FILTER_OPERATORS = [
    ...BASE_FILTER_OPERATORS,
    FILTER_OPERATORS_NAMES.CONTAINS,
];
export const NUMBER_FILTER_OPERATORS = [
    ...BASE_FILTER_OPERATORS,
    FILTER_OPERATORS_NAMES.LESSTE,
    FILTER_OPERATORS_NAMES.GREATERTE,
    FILTER_OPERATORS_NAMES.LESS,
    FILTER_OPERATORS_NAMES.GREATER,
];
export const DATE_FILTER_OPERATORS = [
    ...BASE_FILTER_OPERATORS,
    FILTER_OPERATORS_NAMES.BEFORE,
    FILTER_OPERATORS_NAMES.AFTER,
];
export const EMAIL_HANDLE_FILTER_OPERATORS = [FILTER_OPERATORS_NAMES.CONTAINS];
