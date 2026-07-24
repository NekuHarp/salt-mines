import {
    SALTY_BET_AUTH_PATH,
    SALTY_BET_BASE_URL,
    SALTY_BET_BET_PATH,
    SALTY_BET_HOME_PATH,
    SALTY_BET_USER_AGENT,
} from "../constants/index.js";

// Balance lives in <span id="balance">1,000,000</span> on the home page.
const BALANCE_REGEX = /<span[^>]*id="balance"[^>]*>([^<]*)<\/span>/i;

// How much HTML around the balance element to capture for diagnostics. Wide
// enough to include any sibling "tournament balance" indicator near it.
const BALANCE_CONTEXT_BEFORE = 200;
const BALANCE_CONTEXT_AFTER = 800;

// The authenticated session cookie is kept in memory between requests.
// Salty Bet sessions are short-lived, so placeBet() re-authenticates on demand.
let sessionCookie = null;

/**
 * Reduces an array of Set-Cookie headers to a single Cookie request header,
 * keeping only the `name=value` pair of each cookie (dropping attributes).
 */
function toCookieHeader(setCookies) {
    return setCookies
        .map((cookie) => cookie.split(";")[0].trim())
        .filter(Boolean)
        .join("; ");
}

/**
 * Authenticates against Salty Bet with the credentials from the environment
 * and stores the resulting session cookie in memory.
 *
 * Returns `true` when a session cookie was obtained, `false` otherwise.
 * Throws when credentials are not configured.
 */
export async function authenticate() {
    const email = process.env.SALTY_BET_USER_EMAIL;
    const pword = process.env.SALTY_BET_USER_PWORD;
    if (!email || !pword) {
        throw new Error("Salty Bet credentials are not configured.");
    }

    const body = new URLSearchParams({ email, pword, authenticate: "signin" });

    const response = await fetch(`${SALTY_BET_BASE_URL}${SALTY_BET_AUTH_PATH}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": SALTY_BET_USER_AGENT,
        },
        body,
        // Capture the Set-Cookie header from the redirect response itself
        // rather than following it and losing the session cookie.
        redirect: "manual",
    });

    const setCookies = response.headers.getSetCookie?.() ?? [];
    sessionCookie = setCookies.length > 0 ? toCookieHeader(setCookies) : null;

    return sessionCookie !== null;
}

/**
 * Sends a single place-bet request using the current session cookie.
 * The endpoint returns `1` on success and `0` on failure.
 */
async function sendBet({ selectedplayer, wager }) {
    const body = new URLSearchParams({
        selectedplayer,
        wager: String(wager),
    });

    const response = await fetch(`${SALTY_BET_BASE_URL}${SALTY_BET_BET_PATH}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": SALTY_BET_USER_AGENT,
            Cookie: sessionCookie ?? "",
        },
        body,
        redirect: "manual",
    });

    const responseBody = (await response.text()).trim();

    return {
        status: response.status,
        body: responseBody,
        success: responseBody === "1",
    };
}

/**
 * Places a bet, authenticating first if there is no session yet. If the bet
 * does not succeed (e.g. an expired session), re-authenticates once and retries.
 *
 * @param {{ selectedplayer: string, wager: number }} bet
 * @returns {Promise<{ success: boolean, status: number, body: string }>}
 */
export async function placeBet({ selectedplayer, wager }) {
    if (!sessionCookie) {
        await authenticate();
    }

    let result = await sendBet({ selectedplayer, wager });

    if (!result.success) {
        // The session may have expired; refresh it once and retry.
        const authenticated = await authenticate();
        if (authenticated) {
            result = await sendBet({ selectedplayer, wager });
        }
    }

    return result;
}

// Extracts a window of HTML around the balance element so the surrounding
// markup (e.g. a "tournament balance" indicator) can be inspected later.
function extractBalanceContext(html) {
    const index = html.search(/id="balance(wrapper)?"/i);
    if (index === -1) return null;

    const start = Math.max(0, index - BALANCE_CONTEXT_BEFORE);
    const end = index + BALANCE_CONTEXT_AFTER;
    return html.slice(start, end);
}

/**
 * Fetches the home page with the current session cookie and extracts both the
 * balance (as a number; the raw value is comma-formatted, e.g. "1,000,000")
 * and a snippet of the surrounding HTML. `balance` is null when it cannot be
 * found (e.g. an unauthenticated response) or isn't a valid number.
 */
async function fetchBalancePage() {
    const response = await fetch(`${SALTY_BET_BASE_URL}${SALTY_BET_HOME_PATH}`, {
        headers: {
            "User-Agent": SALTY_BET_USER_AGENT,
            Cookie: sessionCookie ?? "",
        },
    });

    if (!response.ok) return { balance: null, context: null };

    const html = await response.text();
    const context = extractBalanceContext(html);

    const match = html.match(BALANCE_REGEX);
    if (!match) return { balance: null, context };

    // Strip the thousands separators before parsing. Number (not parseInt)
    // keeps full precision and won't silently cap at the 32-bit int max.
    const balance = Number(match[1].replace(/,/g, "").trim());
    return { balance: Number.isNaN(balance) ? null : balance, context };
}

/**
 * Returns the account balance and surrounding HTML as `{ balance, context }`,
 * authenticating first if there is no session and re-authenticating once if
 * the balance can't be read (session likely expired). `balance` is null on failure.
 */
export async function getBalanceInfo() {
    if (!sessionCookie) {
        await authenticate();
    }

    let info = await fetchBalancePage();

    if (info.balance === null) {
        const authenticated = await authenticate();
        if (authenticated) {
            info = await fetchBalancePage();
        }
    }

    return info;
}

/**
 * Returns the account balance as a number (null on failure). Thin wrapper over
 * getBalanceInfo for callers that don't need the surrounding HTML.
 */
export async function getBalance() {
    const { balance } = await getBalanceInfo();
    return balance;
}

/**
 * Whether a session cookie is currently held in memory.
 */
export function isAuthenticated() {
    return sessionCookie !== null;
}
