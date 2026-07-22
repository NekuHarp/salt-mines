export const JSON_BODY_PARSER_SIZE_LIMIT = "200kb";

/**
 * Salty Bet website. Used for reading the live match state as well as
 * authenticating and placing bets.
 */
export const SALTY_BET_BASE_URL = "https://www.saltybet.com";
export const SALTY_BET_HOME_PATH = "/";
export const SALTY_BET_STATE_PATH = "/state.json";
export const SALTY_BET_AUTH_PATH = "/authenticate?signin=1";
export const SALTY_BET_BET_PATH = "/ajax_place_bet.php";

// Sent on betting requests so the endpoints treat us like a browser session.
export const SALTY_BET_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const SELECTED_PLAYERS = Object.freeze({
    P1: "player1",
    P2: "player2",
});
