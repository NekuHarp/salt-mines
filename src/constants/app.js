export const JSON_BODY_PARSER_SIZE_LIMIT = "200kb";

/** Explicit opt-out value for CORS_ALLOWED_ORIGINS. */
const CORS_DISABLED = "none";

const DEFAULT_CORS_ALLOWED_ORIGINS = "http://localhost:5173";

/**
 * Origins allowed to call the API from a browser, read from
 * CORS_ALLOWED_ORIGINS as a comma-separated list. Browsers block cross-origin
 * reads without this, so the salt-mines-headquarters frontend needs its origin
 * listed here.
 *
 * Unset *or blank* falls back to the Vite dev server, so a local frontend works
 * out of the box and a `CORS_ALLOWED_ORIGINS=` line left empty in a copied
 * .env.example doesn't silently lock every browser out. Disabling CORS is
 * therefore something you have to ask for by name, with `none`.
 *
 * A trailing slash is stripped from each entry. An `Origin` header is only ever
 * scheme + host + port, so `https://example.app/` — which is what copying a URL
 * out of the address bar gives you — would never match anything a browser sends,
 * and the allowlist would silently reject the very origin it names.
 */
export const CORS_ALLOWED_ORIGINS = (() => {
    const configured = (process.env.CORS_ALLOWED_ORIGINS ?? "").trim();

    if (configured.toLowerCase() === CORS_DISABLED) return [];

    return (configured || DEFAULT_CORS_ALLOWED_ORIGINS)
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean);
})();

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
