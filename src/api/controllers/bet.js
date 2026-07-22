import {
    SALTY_BET_BASE_URL,
    SALTY_BET_STATE_PATH,
} from "../../constants/index.js";
import { authenticate, placeBet } from "../../shared/saltyBet.js";

import { matchedData } from "express-validator";

// Salty Bet only accepts wagers while betting for the current match is open.
const BETTING_OPEN_STATUS = "open";

async function fetchSaltyBetData() {
    const response = await fetch(
        `${SALTY_BET_BASE_URL}${SALTY_BET_STATE_PATH}`
    );
    if (!response.ok) return null;
    return response.json();
}

export async function login(req, res) {
    let authenticated;
    try {
        authenticated = await authenticate();
    } catch {
        return res.fail({
            httpCode: 500,
            message: "Salty Bet credentials are not configured.",
            errorCode: 62,
        });
    }

    if (!authenticated) {
        return res.fail({
            httpCode: 502,
            message: "Salty Bet authentication failed.",
            errorCode: 63,
        });
    }

    return res.status(200).json({ authenticated: true });
}

export async function bet(req, res) {
    const { selectedplayer, wager } = matchedData(req, {
        locations: ["body"],
    });

    const data = await fetchSaltyBetData();
    if (!data) {
        return res.fail({
            httpCode: 502,
            message: "Salty Bet API request failed.",
            errorCode: 40,
        });
    }

    if (data.status !== BETTING_OPEN_STATUS) {
        return res.fail({
            httpCode: 422,
            message: "Betting is not open for the current match.",
            errorCode: 60,
        });
    }

    let result;
    try {
        result = await placeBet({ selectedplayer, wager });
    } catch {
        return res.fail({
            httpCode: 500,
            message: "Salty Bet credentials are not configured.",
            errorCode: 62,
        });
    }

    if (!result.success) {
        return res.fail({
            httpCode: 502,
            message: "Salty Bet rejected the bet.",
            errorCode: 61,
        });
    }

    return res.status(200).json({ placed: true, selectedplayer, wager });
}
