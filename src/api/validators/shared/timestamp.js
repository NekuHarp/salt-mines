import { query } from "express-validator";

export const timestampValidator = [
    query("createdBefore").optional().isISO8601().toDate(),
    query("createdAfter").optional().isISO8601().toDate(),
    query("updatedBefore").optional().isISO8601().toDate(),
    query("updatedAfter").optional().isISO8601().toDate(),
];
