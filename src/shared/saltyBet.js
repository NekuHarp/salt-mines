import {
    SALTY_BET_AUTH_PATH,
    SALTY_BET_BASE_URL,
    SALTY_BET_BET_PATH,
    SALTY_BET_HOME_PATH,
    SALTY_BET_USER_AGENT,
} from "../constants/index.js";

// Balance lives in <span id="balance">1,000,000</span> on the home page.
const BALANCE_REGEX = /<span[^>]*id="balance"[^>]*>([^<]*)<\/span>/i;

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
 * Whether the place-bet endpoint's reply means the bet was taken.
 *
 * Two accepted replies are observed: a bare `"1"` (matchmaking and exhibition),
 * and the balance with `1` appended (tournament) — `"15361"` at a balance of
 * 1536. A rejected bet echoes the balance with no trailing flag (`"1536"`, e.g.
 * betting once the window has closed).
 *
 * Both forms are accepted regardless of match mode, deliberately: mode can be
 * deliberately overridden in the `Remaining` table (see the "17 characters are
 * left in the bracket!" entry), so it is not something this can be keyed on.
 *
 * The balance is required to read the tournament form: for a balance ending in 1
 * the accepted and rejected replies have the same shape (`"15311"` vs `"1531"`),
 * so the body alone cannot distinguish them.
 */
function isAccepted(responseBody, balance) {
    if (responseBody === "1") return true;
    if (balance === null || balance === undefined) return false;

    return responseBody === `${balance}1`;
}

/**
 * Sends a single place-bet request using the current session cookie.
 * `balance` is the account balance the reply is interpreted against.
 */
async function sendBet({ selectedplayer, wager, balance }) {
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
        success: isAccepted(responseBody, balance),
    };
}

/**
 * Places a bet, authenticating first if there is no session yet.
 *
 * `balance` is optional. The reply can only be interpreted against the balance
 * (see isAccepted), so it is read here when the caller does not already have it;
 * callers that just read it should pass it in to save a request. If it cannot be
 * read at all, only the bare `"1"` reply can be recognised.
 *
 * @param {{ selectedplayer: string, wager: number, balance?: number }} bet
 * @returns {Promise<{ success: boolean, status: number, body: string }>}
 */
export async function placeBet({ selectedplayer, wager, balance }) {
    if (!sessionCookie) {
        await authenticate();
    }

    // getBalance re-authenticates when the balance can't be read, so this also
    // refreshes an expired session before the bet is sent.
    const knownBalance = balance ?? (await getBalance());

    let result = await sendBet({
        selectedplayer,
        wager,
        balance: knownBalance,
    });
    if (result.success) return result;

    // Re-sending is harmless in itself — Salty Bet keeps only the latest bet for
    // a match, so a resend replaces rather than adds to it — but it is two wasted
    // requests when it cannot help. A readable balance proves the session is
    // alive, which means the rejection was something a resend will not fix (the
    // window having closed, say), so only retry when the balance is unreadable
    // and an expired session is the plausible cause. The balance stays valid for
    // that retry: a rejected bet does not move it, and accepted wagers are only
    // debited at settlement.
    if ((await fetchBalance()) !== null) return result;

    const authenticated = await authenticate();
    if (authenticated) {
        result = await sendBet({
            selectedplayer,
            wager,
            balance: knownBalance,
        });
    }

    return result;
}

/**
 * Fetches the home page with the current session cookie and extracts the
 * balance from <span id="balance">, returning it as a number (the raw value
 * is comma-formatted, e.g. "1,000,000"). Returns null when the balance cannot
 * be found (e.g. an unauthenticated response) or isn't a valid number.
 */
async function fetchBalance() {
    const response = await fetch(`${SALTY_BET_BASE_URL}${SALTY_BET_HOME_PATH}`, {
        headers: {
            "User-Agent": SALTY_BET_USER_AGENT,
            Cookie: sessionCookie ?? "",
        },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const match = html.match(BALANCE_REGEX);
    if (!match) return null;

    // Strip the thousands separators before parsing. Number (not parseInt)
    // keeps full precision and won't silently cap at the 32-bit int max.
    const balance = Number(match[1].replace(/,/g, "").trim());
    return Number.isNaN(balance) ? null : balance;
}

/**
 * Returns the account balance as a number, authenticating first if there is no
 * session and re-authenticating once if the balance can't be read (session
 * likely expired). Returns null on failure.
 */
export async function getBalance() {
    if (!sessionCookie) {
        await authenticate();
    }

    let balance = await fetchBalance();

    if (balance === null) {
        const authenticated = await authenticate();
        if (authenticated) {
            balance = await fetchBalance();
        }
    }

    return balance;
}

/**
 * Whether a session cookie is currently held in memory.
 */
export function isAuthenticated() {
    return sessionCookie !== null;
}
