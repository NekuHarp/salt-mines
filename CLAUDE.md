# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start server with nodemon
- `npm run start` — Start server with node
- `npm run lint` — Run ESLint

Copy `.env.example` to `.env` and fill in `DATABASE_*` credentials, the `SALT_MINES_USER_NAME`/`SALT_MINES_USER_PASSWORD` API Basic Auth credentials, and the `SALTY_BET_USER_EMAIL`/`SALTY_BET_USER_PWORD` Salty Bet account credentials before running. The Salty Bet website URL is a constant (`SALTY_BET_BASE_URL` in `src/constants/app.js`), not an env var.

Migrations are managed via Sequelize CLI (configured in `.sequelizerc`). The first migration reads raw SQL from `src/database/migrations/tables-structures.sql`; subsequent ones are standard Sequelize CJS migration files.

There are no tests.

## Architecture

Express REST API for tracking fighters and head-to-head matchups, with live data scraping from Salty Bet. Models: `Fighter`, `Matchup`, `LastBet`, `Remaining`, `TournamentLog`.

**Stack:** Node.js (ESM, v24), Express 4, Sequelize 6, MySQL (mysql2), express-validator, helmet, qs

**Request lifecycle:**

1. `helmet` + `res.fail()` middleware applied globally
2. `/health_check` handled before JSON body parsing
3. `express.json()` parses body
4. Routes under `MAIN_API_ROOT` (currently `""`) → `apiRouter`
5. `apiRouter` applies `basicAuth` to every mount except `stateRouter`; the state router applies it per-route (`GET /state/balance`, `PUT /state/auto`), leaving `GET /state` public
6. `errorHandler` (4-arg) catches anything thrown by controllers

**Key patterns:**

- **`res.fail(errorObject)`** — added by the `fail` middleware (`src/shared/fail.js`); used everywhere for error responses. Error objects (`INTERNAL_SERVER_ERROR`, `NOT_FOUND`, `INVALID_VALUE`) are defined in `src/shared/errors.js` with shape `{ httpCode, message, errorCode }`.

- **`basicAuth` (`src/shared/basicAuth.js`)** — HTTP Basic Auth middleware validating the `Authorization` header against `SALT_MINES_USER_NAME`/`SALT_MINES_USER_PASSWORD` (constant-time compare via SHA-256 + `timingSafeEqual`). Returns `401` with `WWW-Authenticate: Basic realm="salt-mines"` on failure (errorCode 70). Applied to all routes except `GET /state`.

- **Router `.param("uuid", ...)`** — each router validates the `:uuid` param with express-validator, runs `validationErrorHandler`, then `findFighterByUuid`/`findMatchupByUuid`, which loads the model instance into `req.model[ModelName]`. Controllers read from `req.model` rather than querying again.

- **`matchedData(req, { locations, includeOptionals })`** — controllers always use this instead of `req.body`/`req.query` directly to get only validated/sanitized data.

- **`filterAll(query, where)`** — `src/api/utils/filters.js` composes offset/limit/sort/timestamp filters with a per-endpoint `where` object into a single Sequelize `findAndCountAll` options object. Custom field filters support operator arrays: `[operator, value]` or `[operator, min, max]` for ranges (operators defined in `src/constants/api.js` as `FILTER_OPERATORS`).

- **`getSort(value)`** — `src/api/utils/sort.js` translates `"-name"` → `[["name", "DESC"]]` and underscore notation for nested fields (e.g. `"P1_name"` → `[["P1", "name", "ASC"]]`).

- **Validator arrays** — validators are exported as flat arrays of express-validator middleware + `validationErrorHandler` appended at the end. Shared validator builders (`paginationValidatorBuilder`, `sortValidatorBuilder`, `timestampValidator`) live in `src/api/validators/shared/`.

- **Model factory pattern** — each model file exports `(sequelize) => { class Foo extends Sequelize.Model {} ... return Foo; }`. `src/database/models/index.js` is the single import point for all models and the sequelize instance (`db.Fighter`, `db.Matchup`, `db.LastBet`, `db.Remaining`, `db.TournamentLog`, `db.sequelize`).

**Salty Bet scraping & predictions (`src/api/routers/state.js`):**

- `GET /state` (`currentMatchData`) — read-only snapshot of the current match. Looks up existing fighters/matchup without creating them; mocks missing entries with zeroed stats. Returns `{ p1, p2, matchup, p1WinChance, p2WinChance, winner, mode }` with UUIDs stripped. Returns 422 for exhibition matches. Uses `getWinRateFromData` so win rates work even with mocked data.
- `GET /state/balance` (`currentBalance`) — **protected by `basicAuth`.** Fetches the Salty Bet home page (via the authenticated session in `saltyBet.js`, auto-signing-in if there's no cookie) and parses `<span id="balance">` out of the HTML. Returns `{ balance }` as a number (thousands separators stripped, parsed via `Number` to avoid a 32-bit cap). Fails with 500 errorCode 62 if credentials are unset, 502 errorCode 64 if the balance can't be read.
- `PUT /state/auto` (`autoDataScrape`) — derives the winner from the API's `status` field (`"1"` = p1, `"2"` = p2). Compares against `LastBet` id=0; if unchanged, polls every 3s until data changes. If status isn't `"1"`/`"2"`, polls every 3s until a winner is determined (7-minute timeout per match). Only creates fighters/matchup when a winner is found. Uses `resolveMatchMode` with the `remaining` string captured _before_ polling for the winner (since the API's `remaining` may already reflect the next match by the time the winner status appears). Accepts optional body `matchesToRecord` (int 1–25, default 1) to record multiple consecutive matches in one request, returning results keyed as `Match1`, `Match2`, etc. Optional body `predictions` (boolean) includes `p1WinChance` in each match result, calculated before stats are updated. Optional body `recordRemaining` (boolean, default `false`) stores unique `remaining` strings and their detected mode in the `Remaining` table. Validated by `autoScrapeValidator`.

**Betting (`src/api/routers/bet.js`, `src/api/controllers/bet.js`, `src/shared/saltyBet.js`):**

- Placing a bet requires an authenticated Salty Bet session (cookie), which is separate from the API's own Basic Auth. `src/shared/saltyBet.js` manages that session in memory:
    - `authenticate()` — POSTs `SALTY_BET_USER_EMAIL`/`SALTY_BET_USER_PWORD` (+ `authenticate=signin`) as `application/x-www-form-urlencoded` to `/authenticate?signin=1` with `redirect: "manual"`, and stores the `Set-Cookie` values as the session cookie. Returns `true` if a cookie was obtained. Throws if credentials are unset.
    - `placeBet({ selectedplayer, wager })` — authenticates if there is no session, POSTs the bet to `/ajax_place_bet.php`, and re-authenticates once + retries if the bet does not succeed (session likely expired). The endpoint returns `1` on success / `0` on failure; `success` is `body === "1"`.
    - `getBalanceInfo()` — GETs the home page with the session cookie (re-authenticating once if the balance can't be read) and returns `{ balance, context }`: the `<span id="balance">` value as a number, plus a snippet of the surrounding HTML (for discovering the "tournament balance" indicator). `getBalance()` is a thin wrapper returning just `balance` (used by `GET /state/balance`).
- `PUT /bet/login` (`login`) — forces authentication; returns `{ authenticated: true }` or fails (500 errorCode 62 if credentials unset, 502 errorCode 63 if auth failed).
- `PUT /bet` (`bet`) — body `selectedplayer` (`"player1"`/`"player2"`, from `SELECTED_PLAYERS`) and `wager` (int ≥ 1), validated by `placeBetValidator`. First fetches the state and requires `status === "open"` (betting only opens for a short window before each match), else 422 errorCode 60. On a rejected bet returns 502 errorCode 61. On success returns `{ placed: true, selectedplayer, wager }`.

**Background listener (`src/shared/listener.js`, `src/api/routers/listener.js`):**

- In-process `setInterval`-based service that polls the Salty Bet state URL (`SALTY_BET_BASE_URL` + `SALTY_BET_STATE_PATH`) every 3s and records match results automatically (fire-and-forget). Uses the `remaining` stored in `LastBet` from the previous poll for mode detection, since the API's `remaining` field may already reflect the next match when the winner status appears. Managed via `start(params)`, `stop()`, `getStatus()` exports.
- `GET /listener` — returns `{ active, params }`.
- `PUT /listener/start` — starts the listener; returns `409` if already running. Optional body `matchesToRecord` (int 1–25) auto-stops after that many matches. Optional body `strictMode` (boolean, default `false`) skips exhibition matches always and tournament matches when `true`, only recording matchmaking matches. Optional body `recordRemaining` (boolean, default `false`) stores unique `remaining` strings and their detected mode in the `Remaining` table. Optional body `bettingMode` (boolean, default `false`) automatically places a bet each time a match's betting window opens (see below).
- `PUT /listener/stop` — stops the listener; returns `409` if not running.

**Auto-betting (`bettingMode`, in `src/shared/listener.js`):** when enabled, the tick that first sees `status === "open"` for a match places one bet (the top-of-tick dedup against `LastBet` guarantees a single bet per window). It computes the current P1 win chance via `computeP1WinChance` (stored fighter/matchup stats, zeroed when absent, same as `currentMatchData`), bets on the favourite (a 50-50 split goes to `player1`), and sizes the wager against the live `getBalanceInfo()`, rounded up (`Math.ceil`):

- **Exhibition** — never bets.
- **Tournament** — all-in (100% of balance) on the favourite.
- **Matchmaking** — tiered by the favourite's win chance `c` (exact boundaries fall to the lower tier): `c<=60` → 5%, `60<c<=70` → 10%, `70<c<=85` → 15%, `85<c<=95` → 20%, `c>95` → 25%.
- Skips silently if the balance can't be read, is ≤ 0, or the computed wager is < 1. Betting failures are caught so they never stop the listener.
- **Tournament diagnostics:** every tournament-detected bet writes a `TournamentLog` row (fighters, `remaining`, balance, and a `balanceContext` HTML snippet) *before* the bet is placed, then prunes the table to the newest 50 rows (`TOURNAMENT_LOG_LIMIT`). This is intended to surface buggy Salty Bet `remaining` strings that misclassify matchmaking as tournament, and to capture the "tournament balance" indicator markup during a real tournament. **Note:** there are currently no safety guards on the all-in — a misclassified matchmaking match still bets 100% of the real balance.
- Concurrency guard (`processing` flag) prevents overlapping ticks. Errors are silently skipped.

**Match mode detection (`src/shared/matchMode.js`):**

- `resolveMatchMode(remaining)` — async; checks the `Remaining` table for an exact match on the `remaining` string first. If found, returns the stored `mode`. Otherwise falls back to `getMatchMode()`.
- `getMatchMode(remaining)` — parses the `remaining` string from the Salty Bet API to determine the current mode: `"exhibition"` (contains "exhibition matches left"), `"tournament"` (contains "characters are left in the bracket"), or `"matchmaking"` (anything else). Used as the fallback when no `Remaining` entry exists.
- `shouldRecord(mode, strictMode)` — returns `false` for exhibitions always; returns `false` for tournaments when `strictMode` is `true`; returns `true` otherwise.
- `MATCH_MODES` — constants object with `EXHIBITION`, `TOURNAMENT`, `MATCHMAKING` keys; defined in `src/constants/database.js`.

**Win rate calculation (`src/shared/winRate.js`):**

- Uses a **Bradley-Terry model** to derive a prior win probability from both fighters' general win rates. General win rates are Laplace-smoothed (`(wins + 1) / (matches + 2)`) to avoid 0/1 extremes; fighters with no matches default to 50%. Each fighter's smoothed rate is converted to a strength parameter (odds ratio), and the prior is `s1 / (s1 + s2)`.
- Head-to-head data is incorporated via **Bayesian Beta updating**. The prior is encoded as a Beta distribution with `PRIOR_STRENGTH` (currently 5) virtual games. Observed matchup wins/losses are added to the Beta parameters, and the posterior mean is the final prediction. This means head-to-head data naturally overrides general rates as sample size grows — with 0 matchup games the result is pure Bradley-Terry, with many matchup games it converges to the observed matchup win rate.
- `getWinRate(p1Uuid, p2Uuid)` — async; looks up fighters and matchups by UUID, then delegates to `computeWinRate`. Returns P1's predicted win chance (0–100, max 2 decimals).
- `getWinRateFromData(p1, p2, matchup)` — sync; takes fighter and matchup objects directly (real or mocked) and delegates to `computeWinRate`. Used by `currentMatchData` to compute win rates without requiring DB records.

**Relationships:**

- `Fighter` hasMany `Matchup` as both `MatchupsAsP1` (foreignKey `p1Uuid`) and `MatchupsAsP2` (foreignKey `p2Uuid`)
- `Matchup` belongsTo `Fighter` as `P1` and `P2`; deleting a Fighter cascades
- `LastBet` is a singleton (always id=0, pre-seeded by migration); `content` JSON stores `{ p1name, p2name, status, remaining }`; no associations
- `Remaining` stores unique `remaining` strings from the Salty Bet API with their detected match mode (`Matchmaking`, `Tournament`, `Exhibition`); no associations
- `TournamentLog` is a capped diagnostic log (newest 50 rows) of tournament-detected auto-bets; `uuid` PK, no associations

## Code Conventions

- ESM throughout (`"type": "module"`); `.sequelizerc` and migration files are the only CommonJS (`.cjs`)
- 4-space indentation, trailing commas (`es5`)
- ESLint: sorted imports (warn), no implicit coercion, security plugin, node plugin (`flat/recommended-module`)
- New resources follow the pattern: `constants/api.js` → `models/` → `validators/` → `controllers/` → `routers/` → register in `api/index.js`
