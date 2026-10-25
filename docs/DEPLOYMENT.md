# Deployment

## Prerequisites

- A Linux server
- Node.js >= 24.22.1
- npm >= 11.10.0
- [pm2](https://pm2.keymetrics.io/) for process management

## Create a Production Bot

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

## Server Setup

### 1. Clone the repository

```bash
git clone https://github.com/TyostoKarry/PossyDeadlock.git
cd PossyDeadlock
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your production values:

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=your_prod_bot_token_here
CLIENT_ID=your_prod_bot_client_id_here
ENVIRONMENT=production
```

- **DISCORD_TOKEN** — [Discord Developer Portal](https://discord.com/developers/applications) → Your App → **Bot** → Token → Reset Token
- **CLIENT_ID** — [Discord Developer Portal](https://discord.com/developers/applications) → Your App → **General Information** → Application ID
- **ENVIRONMENT** — set to `production` to use `database.sqlite`

### 4. Register slash commands

```bash
npm run deploy
```

### 5. Build

```bash
npm run build
```

### 6. Start with pm2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 save` persists the process list so it survives reboots. `pm2 startup` generates a startup script so pm2 itself starts on boot.

## Updating

```bash
git pull
npm ci
npm run build
pm2 restart possydeadlock
```

If the update added or changed slash commands, run `npm run deploy` before restarting.

## Backups

```bash
npm run backup
```

This writes a consistent copy of the database to `data/database-backup-<timestamp>.sqlite` using SQLite's `VACUUM INTO`. It's safe to run while the bot is running. Don't back up by copying `database.sqlite` while the bot is running: the database runs in WAL mode, so recent writes may still be in `database.sqlite-wal`, and a copy taken mid-write can be inconsistent.

The first start after upgrading to WAL mode switches the database over, so don't run `backup` or `clear-seen` at the same moment.

To restore a backup:

```bash
pm2 stop possydeadlock
cp data/database-backup-<timestamp>.sqlite data/database.sqlite
rm -f data/database.sqlite-wal data/database.sqlite-shm
pm2 start possydeadlock
```

Remove the leftover `-wal` and `-shm` files before starting. Otherwise SQLite applies the old log to the restored file, which can corrupt it.

## Hero Data

The `/heroes` commands are backed by data from [deadlock-api.com](https://deadlock-api.com), a public API that requires no API key or extra configuration. The bot fetches hero stats, matchups, and synergies on startup and then daily at 06:00 (server time), storing them in the same SQLite database used for news settings. The required tables are created automatically by the built-in migration runner.

## Useful pm2 Commands

| Command | Description |
|---|---|
| `pm2 status` | Show running processes |
| `pm2 logs possydeadlock` | Tail live logs |
| `pm2 restart possydeadlock` | Restart the bot |
| `pm2 stop possydeadlock` | Stop the bot |
| `pm2 delete possydeadlock` | Remove from pm2 |
