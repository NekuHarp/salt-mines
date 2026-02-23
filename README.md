# salt-mines

REST API for tracking fighters and head-to-head matchups, with live data scraping from Salty Bet.

## Stack

- Node.js (ESM), Express 4
- Sequelize 6 + MySQL (mysql2)
- express-validator, helmet, qs

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_* credentials and SALTY_BET_API_URL
npx sequelize-cli db:migrate
npm run dev
```

## Environment Variables

| Variable              | Description                               |
| --------------------- | ----------------------------------------- |
| `NODE_ENV`            | `development`, `staging`, or `production` |
| `PORT`                | Server port                               |
| `DATABASE_HOST`       | MySQL host                                |
| `DATABASE_PORT`       | MySQL port                                |
| `DATABASE_NAME`       | Database name                             |
| `DATABASE_USER`       | MySQL username                            |
| `DATABASE_PASSWORD`   | MySQL password                            |
| `SALTY_BET_API_URL`   | URL polled by the scrape endpoints        |

## Endpoints

### Health

```
GET /health_check
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

### State (Salty Bet scraping)

```
GET /state       Current matchup prediction
PUT /state/auto  Automatic scrape
```

**`GET /state`** (`currentMatchupPrediction`) — Fetches `SALTY_BET_API_URL`, finds or creates both fighters from `p1name`/`p2name`, and returns a win-chance prediction for P1 using `getWinRate` (`src/shared/winRate.js`). Response: `{ p1, p2, p1WinChance }`.

**`PUT /state/auto`** — Derives the winner from the API's `status` field (`"1"` → p1 wins, `"2"` → p2 wins). Before acting, compares `p1name`, `p2name`, and `status` against the last seen values stored in `LastBet` (id=0). If all three are identical, polls every 3 seconds until the data changes. If `status` is not `"1"` or `"2"`, polls every 3 seconds until a winner is determined (7-minute timeout per match). Only creates fighters and records stats when a winner is found. Updates `LastBet` after each match.

| Field              | Type    | Description                                              |
| ------------------ | ------- | -------------------------------------------------------- |
| `matchesToRecord`  | integer | Optional (1–10, default `1`). Number of matches to record in a single request. |
| `predictions`      | boolean | Optional. If `true`, includes `p1WinChance` in each match result (calculated before stats are updated). |

When `matchesToRecord` > 1, the endpoint loops, waiting for each successive match to complete before moving to the next. Each match has its own 7-minute timeout. The response contains results keyed as `Match1`, `Match2`, etc.:

```json
{
  "Match1": { "p1": { ... }, "p2": { ... }, "matchup": { ... }, "p1WinChance": 62.07 },
  "Match2": { "p1": { ... }, "p2": { ... }, "matchup": { ... }, "p1WinChance": 45.3 }
}
```

If a match times out without a winner, the endpoint returns results for all previously completed matches.

## Query Parameters

All list endpoints accept:

| Parameter       | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `offset`        | Records to skip (default: `0`)                                        |
| `limit`         | Max records to return (default: `1000`, max: `50000`)                 |
| `sort`          | Field to sort by; prefix with `-` for descending (e.g. `-createdAt`) |
| `createdBefore` | ISO 8601 upper bound on `createdAt`                                   |
| `createdAfter`  | ISO 8601 lower bound on `createdAt`                                   |
| `updatedBefore` | ISO 8601 upper bound on `updatedAt`                                   |
| `updatedAfter`  | ISO 8601 lower bound on `updatedAt`                                   |

Sortable fields — fighters: `name`, `matches`, `wins`, `losses`, `createdAt`, `updatedAt`. Matchups: `P1_name`, `P2_name`, `createdAt`, `updatedAt`.

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

Singleton table (always id=0). Stores the last values seen by `PUT /state/auto` to detect changes.

| Field     | Type | Notes                                        |
| --------- | ---- | -------------------------------------------- |
| `id`      | `0`  | Always 0; pre-seeded by migration            |
| `content` | JSON | `{ p1name, p2name, status }` or `null`       |
