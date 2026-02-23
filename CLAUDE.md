# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start server with nodemon
- `npm run start` — Start server with node
- `npm run lint` — Run ESLint

Copy `.env.example` to `.env` and fill in `DATABASE_*` credentials and `SALTY_BET_API_URL` before running.

Migrations are managed via Sequelize CLI (configured in `.sequelizerc`). The first migration reads raw SQL from `src/database/migrations/tables-structures.sql`; subsequent ones are standard Sequelize CJS migration files.

There are no tests.

## Architecture

Express REST API for tracking fighters and head-to-head matchups, with live data scraping from Salty Bet. Three resources: `Fighter`, `Matchup`, `LastBet`.

**Stack:** Node.js (ESM, v24), Express 4, Sequelize 6, MySQL (mysql2), express-validator, helmet, qs

**Request lifecycle:**
1. `helmet` + `res.fail()` middleware applied globally
2. `/health_check` handled before JSON body parsing
3. `express.json()` parses body
4. Routes under `MAIN_API_ROOT` (currently `""`) → `apiRouter`
5. `errorHandler` (4-arg) catches anything thrown by controllers

**Key patterns:**

- **`res.fail(errorObject)`** — added by the `fail` middleware (`src/shared/fail.js`); used everywhere for error responses. Error objects (`INTERNAL_SERVER_ERROR`, `NOT_FOUND`, `INVALID_VALUE`) are defined in `src/shared/errors.js` with shape `{ httpCode, message, errorCode }`.

- **Router `.param("uuid", ...)`** — each router validates the `:uuid` param with express-validator, runs `validationErrorHandler`, then `findFighterByUuid`/`findMatchupByUuid`, which loads the model instance into `req.model[ModelName]`. Controllers read from `req.model` rather than querying again.

- **`matchedData(req, { locations, includeOptionals })`** — controllers always use this instead of `req.body`/`req.query` directly to get only validated/sanitized data.

- **`filterAll(query, where)`** — `src/api/utils/filters.js` composes offset/limit/sort/timestamp filters with a per-endpoint `where` object into a single Sequelize `findAndCountAll` options object. Custom field filters support operator arrays: `[operator, value]` or `[operator, min, max]` for ranges (operators defined in `src/constants/api.js` as `FILTER_OPERATORS`).

- **`getSort(value)`** — `src/api/utils/sort.js` translates `"-name"` → `[["name", "DESC"]]` and underscore notation for nested fields (e.g. `"P1_name"` → `[["P1", "name", "ASC"]]`).

- **Validator arrays** — validators are exported as flat arrays of express-validator middleware + `validationErrorHandler` appended at the end. Shared validator builders (`paginationValidatorBuilder`, `sortValidatorBuilder`, `timestampValidator`) live in `src/api/validators/shared/`.

- **Model factory pattern** — each model file exports `(sequelize) => { class Foo extends Sequelize.Model {} ... return Foo; }`. `src/database/models/index.js` is the single import point for all models and the sequelize instance (`db.Fighter`, `db.Matchup`, `db.LastBet`, `db.sequelize`).

**Salty Bet scraping & predictions (`src/api/routers/state.js`):**
- `GET /state` (`currentMatchupPrediction`) — fetches the API, finds or creates both fighters, and returns `{ p1, p2, p1WinChance }` using `getWinRate` (`src/shared/winRate.js`).
- `PUT /state/auto` (`autoDataScrape`) — derives the winner from the API's `status` field (`"1"` = p1, `"2"` = p2). Compares against `LastBet` id=0; if unchanged, polls every 3s until data changes. If status isn't `"1"`/`"2"`, polls every 3s until a winner is determined (7-minute timeout per match). Only creates fighters/matchup when a winner is found. Accepts optional body `matchesToRecord` (int 1–10, default 1) to record multiple consecutive matches in one request, returning results keyed as `Match1`, `Match2`, etc. Optional body `predictions` (boolean) includes `p1WinChance` in each match result, calculated before stats are updated. Validated by `autoScrapeValidator`.

**Background listener (`src/shared/listener.js`, `src/api/routers/listener.js`):**
- In-process `setInterval`-based service that polls `SALTY_BET_API_URL` every 3s and records match results automatically (fire-and-forget). Managed via `start(params)`, `stop()`, `getStatus()` exports.
- `GET /listener` — returns `{ active, params }`.
- `PUT /listener/start` — starts the listener; returns `409` if already running. Optional body `matchesToRecord` (int 1–10) auto-stops after that many matches.
- `PUT /listener/stop` — stops the listener; returns `409` if not running.
- Concurrency guard (`processing` flag) prevents overlapping ticks. Errors are silently skipped.

**Win rate calculation (`src/shared/winRate.js`):**
- `getWinRate(p1Uuid, p2Uuid)` — returns P1's predicted win chance (0–100, max 2 decimals). If head-to-head data exists, blends general and matchup stats with matchup data weighted 10× (1× from general + 9× extra). If no head-to-head data, mocks the rate as `50 + (p1GeneralWinRate - p2GeneralWinRate)`, clamped to [0, 100]. Fighters with no matches default to 0% general win rate.

**Relationships:**
- `Fighter` hasMany `Matchup` as both `MatchupsAsP1` (foreignKey `p1Uuid`) and `MatchupsAsP2` (foreignKey `p2Uuid`)
- `Matchup` belongsTo `Fighter` as `P1` and `P2`; deleting a Fighter cascades
- `LastBet` is a singleton (always id=0, pre-seeded by migration); no associations

## Code Conventions

- ESM throughout (`"type": "module"`); `.sequelizerc` and migration files are the only CommonJS (`.cjs`)
- 4-space indentation, trailing commas (`es5`)
- ESLint: sorted imports (warn), no implicit coercion, security plugin, node plugin (`flat/recommended-module`)
- New resources follow the pattern: `constants/api.js` → `models/` → `validators/` → `controllers/` → `routers/` → register in `api/index.js`
