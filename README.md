# salt-mines

REST API for tracking fighters and head-to-head matchups, with live data scraping from Salty Bet — plus win-chance predictions, automatic result recording, and automated betting through your Salty Bet account.

## Stack

- Node.js (ESM), Express 4
- Sequelize 6 + MySQL (mysql2)
- express-validator, helmet, qs

## Setup

```bash
npm install
cp .env.example .env   # fill in the variables below
npx sequelize-cli db:migrate
npm run dev
```

## Environment Variables

| Variable                   | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `NODE_ENV`                 | `development`, `staging`, or `production`                 |
| `PORT`                     | Server port                                               |
| `DATABASE_HOST`            | MySQL host                                                |
| `DATABASE_PORT`            | MySQL port                                                |
| `DATABASE_NAME`            | Database name                                             |
| `DATABASE_USER`            | MySQL username                                            |
| `DATABASE_PASSWORD`        | MySQL password                                            |
| `SALT_MINES_USER_NAME`     | Username for the API's HTTP Basic Auth                    |
| `SALT_MINES_USER_PASSWORD` | Password for the API's HTTP Basic Auth                    |
| `SALTY_BET_USER_EMAIL`     | Salty Bet account email (used to authenticate and bet)    |
| `SALTY_BET_USER_PWORD`     | Salty Bet account password (used to authenticate and bet) |

The Salty Bet website URL is no longer an environment variable — it lives as a constant (`SALTY_BET_BASE_URL`) in `src/constants/app.js`.

## Authentication

Every endpoint requires **HTTP Basic Auth** (`SALT_MINES_USER_NAME` / `SALT_MINES_USER_PASSWORD`), with two exceptions that are public:

- `GET /health_check`
- `GET /state`

Requests without valid credentials receive `401` with a `WWW-Authenticate: Basic realm="salt-mines"` header.

```bash
curl -u "$SALT_MINES_USER_NAME:$SALT_MINES_USER_PASSWORD" http://localhost:3000/fighters
```

## Endpoints

### Health

```
GET /health_check        Public
```

### Fighters

```
GET    /fighters
POST   /fighters
GET    /fighters/:uuid
PATCH  /fighters/:uuid
DELETE /fighters/:uuid
```

### Matchups

```
GET    /matchups
POST   /matchups
GET    /matchups/:uuid
PATCH  /matchups/:uuid
DELETE /matchups/:uuid
```

### Remainings

CRUD for the `Remaining` lookup table (unique `remaining` strings from the Salty Bet API and their detected match mode). Once populated, these entries take priority over the heuristic mode detection, allowing manual correction of misdetected modes.

```
GET    /remainings
POST   /remainings
GET    /remainings/:uuid
PATCH  /remainings/:uuid
DELETE /remainings/:uuid
```

The list endpoint additionally accepts a `?mode=` filter (`Matchmaking`, `Tournament`, or `Exhibition`).

### State (Salty Bet)

```
GET /state          Public   Current match snapshot
GET /state/balance  Auth     Salty Bet account balance
PUT /state/auto     Auth     Record match result(s)
```

**`GET /state`** (`currentMatchData`) — Read-only snapshot of the current match. Looks up existing fighters and their matchup **without creating them**; missing entries are mocked with zeroed stats. Returns win chances for both players, the matchup stats, and (if the match has ended) the winner. Returns `422` for exhibition matches. Response:

```json
{
    "p1": { "name": "...", "matches": 0, "wins": 0, "losses": 0 },
    "p2": { "name": "...", "matches": 0, "wins": 0, "losses": 0 },
    "matchup": { "matches": 0, "p1Wins": 0, "p2Wins": 0 },
    "p1WinChance": 62.07,
    "p2WinChance": 37.93,
    "winner": "The match is still ongoing!",
    "mode": "Matchmaking"
}
```

Win rates are computed using a Bradley-Terry model (prior from general win rates) with Bayesian Beta updating, so head-to-head data overrides the prior as sample size grows. See `src/shared/winRate.js` for details.

**`GET /state/balance`** (`currentBalance`) — Fetches the Salty Bet home page using the authenticated session (signing in automatically if there is no session yet) and parses out the account balance. Returns it as a number (thousands separators stripped). Response: `{ "balance": 1000000 }`.

**`PUT /state/auto`** — Derives the winner from the API's `status` field (`"1"` → p1 wins, `"2"` → p2 wins). Before acting, compares `p1name`, `p2name`, and `status` against the last seen values stored in `LastBet` (id=0). If all three are identical, polls every 3 seconds until the data changes. If `status` is not `"1"` or `"2"`, polls every 3 seconds until a winner is determined (7-minute timeout per match). Only creates fighters and records stats when a winner is found. Match mode is detected via `resolveMatchMode` using the `remaining` string captured _before_ polling for the winner. Updates `LastBet` after each match.

| Field             | Type    | Description                                                                                                    |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `matchesToRecord` | integer | Optional (1–25, default `1`). Number of matches to record in a single request.                                 |
| `predictions`     | boolean | Optional. If `true`, includes `p1WinChance` in each match result (calculated before stats are updated).        |
| `recordRemaining` | boolean | Optional. If `true`, stores unique `remaining` strings and their detected match mode in the `Remaining` table. |

When `matchesToRecord` > 1, the endpoint loops, waiting for each successive match to complete before moving to the next. Each match has its own 7-minute timeout. The response contains results keyed as `Match1`, `Match2`, etc.:

```json
{
    "Match1": {
        "p1": { "...": "..." },
        "p2": { "...": "..." },
        "matchup": { "...": "..." },
        "p1WinChance": 62.07
    },
    "Match2": {
        "p1": { "...": "..." },
        "p2": { "...": "..." },
        "matchup": { "...": "..." },
        "p1WinChance": 45.3
    }
}
```

If a match times out without a winner, the endpoint returns results for all previously completed matches.

### Bet (Salty Bet)

```
PUT /bet/login   Auth   Authenticate against Salty Bet
PUT /bet         Auth   Place a bet on the current match
```

Betting requires a Salty Bet session cookie, kept in memory and separate from the API's own Basic Auth. The session is established from `SALTY_BET_USER_EMAIL` / `SALTY_BET_USER_PWORD`, and re-established automatically when it expires.

**`PUT /bet/login`** — Forces authentication against Salty Bet. Returns `{ "authenticated": true }`. Fails with `500` if the credentials are unset, or `502` if authentication failed.

**`PUT /bet`** — Places a bet on the current match. The match's `status` must be `open` (betting only opens for a short window before each match), otherwise the endpoint returns `422`. On a bet the site rejects, returns `502`. On success returns `{ "placed": true, "selectedplayer": "player1", "wager": 500 }`.

| Field            | Type    | Description                           |
| ---------------- | ------- | ------------------------------------- |
| `selectedplayer` | string  | Required. `"player1"` or `"player2"`. |
| `wager`          | integer | Required. Amount to bet (≥ 1).        |

### Listener (background scraping)

```
GET /listener        Auth   Listener status
PUT /listener/start  Auth   Start listener
PUT /listener/stop   Auth   Stop listener
```

**`GET /listener`** — Returns the current listener status: `{ active: boolean, params: { ... } | null }`.

**`PUT /listener/start`** — Starts the background listener. Returns `409` if already running. The listener polls the Salty Bet state URL every 3 seconds and automatically records match results (fire-and-forget). Accepts an optional body:

| Field             | Type    | Description                                                                                                                             |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `matchesToRecord` | integer | Optional (1–25). If provided, the listener auto-stops after recording that many matches. If omitted, runs until manually stopped.       |
| `strictMode`      | boolean | Optional (default `false`). Skips exhibition matches always; when `true`, also skips tournament matches — only matchmaking is recorded. |
| `recordRemaining` | boolean | Optional (default `false`). Stores unique `remaining` strings and their detected match mode in the `Remaining` table.                   |
| `bettingMode`     | boolean | Optional (default `false`). Automatically places a bet each time a match's betting window opens (see below).                            |

**`PUT /listener/stop`** — Stops the background listener. Returns `409` if not running.

#### Auto-betting (`bettingMode`)

When `bettingMode` is enabled, the listener places one bet per match, the moment betting opens (`status: "open"`). It computes the current P1 win chance the same way as `GET /state`, bets on the favourite (an exact 50-50 split goes to `player1`), and sizes the wager against the live account balance, rounded up:

- **Exhibition** — never bets.
- **Tournament** — all-in (100% of balance) on the favourite.
- **Matchmaking** — tiered by the favourite's win chance `c` (exact boundaries fall to the lower tier):

    | Win chance    | Wager (% of balance) |
    | ------------- | -------------------- |
    | `c ≤ 60`      | 5%                   |
    | `60 < c ≤ 70` | 10%                  |
    | `70 < c ≤ 85` | 15%                  |
    | `85 < c ≤ 95` | 20%                  |
    | `c > 95`      | 25%                  |

Betting is skipped silently if the balance can't be read, is ≤ 0, or the computed wager rounds to < 1. Betting failures never stop the listener.

Every tournament-detected bet is recorded in the `TournamentLog` table (capped at the newest 50 rows) with the fighters, the `remaining` string that triggered the tournament classification, the balance, and a snippet of the surrounding balance HTML. This is a diagnostic aid for spotting buggy Salty Bet `remaining` strings and for capturing the "tournament balance" indicator markup during a real tournament. Note that there is currently no safeguard on the tournament all-in: a matchmaking match misclassified as a tournament will bet 100% of the real balance.

## Query Parameters

All list endpoints accept:

| Parameter       | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| `offset`        | Records to skip (default: `0`)                                       |
| `limit`         | Max records to return (default: `1000`, max: `50000`)                |
| `sort`          | Field to sort by; prefix with `-` for descending (e.g. `-createdAt`) |
| `createdBefore` | ISO 8601 upper bound on `createdAt`                                  |
| `createdAfter`  | ISO 8601 lower bound on `createdAt`                                  |
| `updatedBefore` | ISO 8601 upper bound on `updatedAt`                                  |
| `updatedAfter`  | ISO 8601 lower bound on `updatedAt`                                  |

Sortable fields — fighters: `name`, `matches`, `wins`, `losses`, `createdAt`, `updatedAt`. Matchups: `P1_name`, `P2_name`, `createdAt`, `updatedAt`. Remainings: `value`, `mode`, `createdAt`, `updatedAt`.

Advanced field filtering uses array query syntax: `?field[]=<operator>&field[]=<value>`. For range operators: `?field[]=between&field[]=<min>&field[]=<max>`.

Available operators: `equals`, `not`, `contains`, `lte`, `gte`, `lt`, `gt`, `between`, `before`, `after`.

## Schemas

### Fighter

| Field     | Type        | Notes             |
| --------- | ----------- | ----------------- |
| `uuid`    | UUID v4     | Auto-generated PK |
| `name`    | string      | Unique            |
| `matches` | integer ≥ 0 |                   |
| `wins`    | integer ≥ 0 |                   |
| `losses`  | integer ≥ 0 |                   |

### Matchup

| Field     | Type        | Notes                             |
| --------- | ----------- | --------------------------------- |
| `uuid`    | UUID v4     | Auto-generated PK                 |
| `p1Uuid`  | UUID v4     | FK → Fighter; unique pair with p2 |
| `p2Uuid`  | UUID v4     | FK → Fighter                      |
| `matches` | integer ≥ 0 |                                   |
| `p1Wins`  | integer ≥ 0 |                                   |
| `p2Wins`  | integer ≥ 0 |                                   |

### LastBet

Singleton table (always id=0). Stores the last values seen by `PUT /state/auto` and the listener to detect changes.

| Field     | Type | Notes                                             |
| --------- | ---- | ------------------------------------------------- |
| `id`      | `0`  | Always 0; pre-seeded by migration                 |
| `content` | JSON | `{ p1name, p2name, status, remaining }` or `null` |

### Remaining

Stores unique `remaining` strings from the Salty Bet API along with their detected match mode. Populated when `recordRemaining: true` is passed to `PUT /state/auto` or `PUT /listener/start`, or via the `/remainings` CRUD endpoints. Once populated, entries in this table take priority over the heuristic-based detection — allowing manual correction of misdetected modes.

| Field   | Type    | Notes                                        |
| ------- | ------- | -------------------------------------------- |
| `uuid`  | UUID v4 | Auto-generated PK                            |
| `value` | string  | Unique `remaining` string from the API       |
| `mode`  | enum    | `Matchmaking`, `Tournament`, or `Exhibition` |

### TournamentLog

Capped diagnostic log (newest 50 rows) of every bet the auto-bettor placed while it detected a tournament. Written before the bet is placed and pruned on each insert. Used to inspect buggy `remaining` strings and to capture the "tournament balance" indicator markup during a real tournament.

| Field            | Type    | Notes                                                      |
| ---------------- | ------- | ---------------------------------------------------------- |
| `uuid`           | UUID v4 | Auto-generated PK                                          |
| `p1name`         | string  | Player 1 name                                              |
| `p2name`         | string  | Player 2 name                                              |
| `remaining`      | string  | The `remaining` string that triggered tournament detection |
| `balance`        | bigint  | Balance read at bet time (nullable)                        |
| `balanceContext` | text    | HTML snippet around the balance element (nullable)         |
| `selectedplayer` | string  | `"player1"` or `"player2"` — the favourite that was bet on |
