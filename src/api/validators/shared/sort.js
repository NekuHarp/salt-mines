import { query } from "express-validator";

export const sortValidatorBuilder = (
    sortableColumns,
    defaultSort = "-createdAt"
) =>
    query("sort")
        .default(defaultSort)
        .isIn(
            sortableColumns.concat(
                sortableColumns.map((sortableColumn) => `-${sortableColumn}`)
            )
        );
