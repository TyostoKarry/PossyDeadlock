# PossyDeadlock

A Discord bot that automatically posts Deadlock news and patch notes to your server.

## Features

- Automatic news polling every 5 minutes via Steam News API
- Official only or all news modes
- Full patch notes thread for official Valve posts
- Role ping on new posts
- Simple slash command configuration

## Commands

All commands require **Manage Server** permission.

| Command | Description |
|---|---|
| `/news set-channel [channel]` | Set the channel for news posts. Leave empty to disable. |
| `/news set-mode <mode>` | `official` (default) — Valve patch notes only. `all` — all news including third-party articles. |
| `/news set-ping-role [role]` | Set a role to ping on new posts. Leave empty to clear. |
| `/news config` | Show current configuration. |
| `/news last-post` | Show the most recent news post. |

## Setup

### Prerequisites

- Node.js >= 24.14.1
- npm >= 11.10.0

If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root to set both automatically.

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

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
```

- **DISCORD_TOKEN**: [Discord Developer Portal](https://discord.com/developers/applications) → Your App → **Bot** → Token → Reset Token
- **CLIENT_ID**: [Discord Developer Portal](https://discord.com/developers/applications) → Your App → **General Information** → Application ID

### 4. Install Dependencies

```bash
npm install
```

### 5. Register Slash Commands

```bash
npm run deploy
```

### 6. Start the Bot

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm run start
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run in development mode with tsx |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run start` | Run compiled production build |
| `npm run deploy` | Register slash commands with Discord |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run clear-seen` | Clear seen posts from DB (development) |

## Project Structure

```
src/
  commands/
    news/
      index.ts        — /news command registration and routing
      setChannel.ts   — set-channel subcommand
      setMode.ts      — set-mode subcommand
      setPingRole.ts  — set-ping-role subcommand
      config.ts       — config subcommand
      lastPost.ts     — last-post subcommand
  db/
    database.ts       — SQLite setup and queries
  jobs/
    newsPoller.ts     — cron job for polling Steam news
  utils/
    formatUtils.ts    — HTML/BBCode stripping and section splitting
    logger.ts         — timestamped logger
    steamApi.ts       — Steam News API client
  index.ts            — bot entry point
  deploy.ts           — slash command registration script
data/
  database.sqlite     — SQLite database (gitignored)
```
