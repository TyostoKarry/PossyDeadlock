# Development

## Prerequisites

- Node.js >= 24.22.1
- npm >= 11.10.0

If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root to automatically use the correct version.

## Create a Dev Bot

It is recommended to use a separate Discord application for development so you don't accidentally affect the production bot.

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Optionally, go to **Bot** to set a custom icon and banner

### 2. Invite the Bot

Go to **OAuth2 → URL Generator** and select the following:

**Scopes:**
- `bot`
- `applications.commands`

**Bot Permissions:**
- `Send Messages`
- `Embed Links`
- `View Channel`
- `Read Message History`
- `Create Public Threads`
- `Send Messages in Threads`

Use the generated URL to invite the bot to your server.

## Environment Setup

Copy `.env.example` to `.env.dev` and fill in your dev bot values:

```bash
cp .env.example .env.dev
```

```env
DISCORD_TOKEN=your_dev_bot_token_here
CLIENT_ID=your_dev_bot_client_id_here
ENVIRONMENT=development
```

- **DISCORD_TOKEN** — [Discord Developer Portal](https://discord.com/developers/applications) → Your App → **Bot** → Token → Reset Token
- **CLIENT_ID** — [Discord Developer Portal](https://discord.com/developers/applications) → Your App → **General Information** → Application ID
- **ENVIRONMENT** — controls which database file is used. Set to `development` to use `database.dev.sqlite`, keeping dev data separate from production.

## Install Dependencies

```bash
npm ci
```

## Register Slash Commands

Register commands on your dev bot:

```bash
npm run deploy:dev
```

## Running Locally

```bash
npm run dev
```

This uses `tsx` to run TypeScript directly without compiling, and reads from `.env.dev`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run in development mode with tsx using `.env.dev` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled production build using `.env` |
| `npm run deploy` | Register slash commands using production `.env` |
| `npm run deploy:dev` | Register slash commands using `.env.dev` |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Fix ESLint issues that can be fixed automatically |
| `npm run format` | Check formatting with Prettier |
| `npm run format:fix` | Format code with Prettier |
| `npm run clear-seen` | Clear seen posts from production DB |
| `npm run clear-seen:dev` | Clear seen posts from dev DB |
| `npm run backup` | Back up the production DB to `data/` (safe while the bot is running) |
| `npm run backup:dev` | Back up the dev DB to `data/` |

## Project Structure

```
src/
  commands/
    help/
      index.ts        — /help command registration, routing, and topic select menu
      deadlockApi.ts  — Deadlock API topic embed
      general.ts      — General topic embed (default)
      heroes.ts       — Heroes topic embed
      news.ts         — News topic embed
    heroes/
      index.ts        — /heroes command registration, routing, autocomplete, and button handling
      list.ts         — list subcommand (sorting and pagination)
      matchup.ts      — matchup subcommand
      random.ts       — random subcommand
      stats.ts        — stats subcommand
    news/
      index.ts        — /news command registration and routing
      setChannel.ts   — set-channel subcommand
      setMode.ts      — set-mode subcommand
      setPingRole.ts  — set-ping-role subcommand
      config.ts       — config subcommand
      lastPost.ts     — last-post subcommand
  db/
    database.ts                   — SQLite setup and queries
    migrations/
      001_initial.ts              — initial schema (news settings, seen posts)
      002_hero_tables.ts          — hero, matchup, and synergy tables
      003_hero_type_complexity.ts — adds hero type and complexity columns
      004_seen_posts_per_guild.ts — tracks seen posts per server
      index.ts                    — ordered list of migrations
  jobs/
    heroPoller.ts     — cron job for polling deadlock-api.com (on startup, then daily at 06:00)
    newsPoller.ts     — cron job for polling Steam news (every 5 minutes)
  schemas/
    heroes.ts         — zod schemas for deadlock-api.com responses
  types/
    heroes.ts         — Hero, HeroMatchup, and HeroSynergy types
  utils/
    deadlockApi.ts    — deadlock-api.com client
    formatUtils.ts    — HTML/BBCode stripping and section splitting
    logger.ts         — timestamped logger
    steamApi.ts       — Steam News API client
  index.ts            — bot entry point
  deploy.ts           — slash command registration script
scripts/
  backup.mjs          — database backup script (VACUUM INTO)
data/
  database.sqlite     — production SQLite database (gitignored)
  database.dev.sqlite — development SQLite database (gitignored)
```

The database runs in WAL mode, so `-wal` and `-shm` files may appear next to it while the bot is running. Don't delete them while the bot is running: they can hold recent writes.

## Hero Data

Hero stats, matchups, and synergies are stored in the database and kept up to date by `src/jobs/heroPoller.ts`, which runs once on startup and then daily at 06:00 (server time).

The poller fetches data from [deadlock-api.com](https://deadlock-api.com) via `src/utils/deadlockApi.ts`, validates the responses against the zod schemas in `src/schemas/heroes.ts`, and writes them in a single transaction: `clearHeroData` empties the hero tables, then `upsertHero`, `upsertHeroMatchup`, and `upsertHeroSynergy` from `src/db/database.ts` write the fresh data. Commands therefore see either the old data or the new, never a half-finished refresh, and heroes or pairs the API no longer returns are removed. If any response is an empty list, the refresh is skipped and the existing data is kept. All hero stat endpoints are filtered to Phantom 1+ ranked matches (`min_average_badge=90`).

Database tables for hero data are created by the migrations in `src/db/migrations/`, which run automatically on startup via a `PRAGMA user_version`-based migration runner in `src/db/database.ts`. Each migration runs in a transaction with its version bump, so a failed migration leaves the database at the previous version.

## Linting and Formatting

The plain scripts only check and never change files; the `:fix` variants write changes:

```bash
npm run lint          # check
npm run format        # check
npm run lint:fix      # auto-fix
npm run format:fix    # auto-format
```

CI runs `format`, `lint`, and `build` on every pull request to `main`, and the PR can't be merged until it passes.
