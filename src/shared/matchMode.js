import { MATCH_MODES } from "../constants/index.js";
import db from "../database/models/index.js";

const { Remaining } = db;

export async function resolveMatchMode(remaining) {
    if (remaining) {
        const entry = await Remaining.findOne({ where: { value: remaining } });
        if (entry) return entry.mode;
    }

    return getMatchMode(remaining);
}

export function getMatchMode(remaining) {
    if (!remaining || typeof remaining !== "string")
        return MATCH_MODES.MATCHMAKING;

    const lower = remaining.toLowerCase();

    if (lower.includes("exhibition matches left"))
        return MATCH_MODES.EXHIBITION;
    if (lower.includes("characters are left in the bracket"))
        return MATCH_MODES.TOURNAMENT;

    return MATCH_MODES.MATCHMAKING;
}

export function shouldRecord(mode, strictMode) {
    if (mode === MATCH_MODES.EXHIBITION) return false;
    if (mode === MATCH_MODES.TOURNAMENT && strictMode) return false;

    return true;
}
