# PossyDeadlock

A Discord bot that automatically posts Deadlock news and patch notes to your server, and provides Deadlock hero stats lookup commands.

## Features

- Automatic news polling every 5 minutes via Steam News API
- Official only or all news modes
- Full patch notes thread for official Valve posts
- Role ping on new posts
- Simple slash command configuration
- Hero stats, matchups/synergies, and a sortable hero list, backed by a daily-refreshed database from deadlock-api.com

## Commands

### `/help [topic]`

Available to everyone. Replies are only visible to you.

| Command | Description |
|---|---|
| `/help` | Show general info, data sources, and a list of command groups. |
| `/help topic:Deadlock API` | Show info about deadlock-api.com and how it's used. |
| `/help topic:Heroes` | Show a quick reference for `/heroes` commands. |
| `/help topic:News` | Show a quick reference for `/news` commands. |

Includes a dropdown to switch between topics without re-running the command.

### `/news`

Requires **Manage Server** permission.

| Command | Description |
|---|---|
| `/news set-channel [channel]` | Set the channel for news posts. Leave empty to disable. |
| `/news set-mode <mode>` | `official` (default) or `all` news mode. |
| `/news set-ping-role [role]` | Set a role to ping on new posts. Leave empty to clear. |
| `/news config` | Show current configuration. |
| `/news last-post` | Show the most recent news post. |

### `/heroes`

Available to everyone.

| Command | Description |
|---|---|
| `/heroes stats <hero>` | Show base stats and performance for a hero. |
| `/heroes matchup <hero>` | Show best/worst synergies and counters for a hero. |
| `/heroes list [sort]` | List all heroes, sortable by name, win rate, or pick rate, with pagination. |
| `/heroes random` | Show a random hero, with a re-roll button. |

See [docs/COMMANDS.md](docs/COMMANDS.md) for full details and examples.

## Documentation

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — local dev setup and project structure
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — production deployment with pm2
- [docs/COMMANDS.md](docs/COMMANDS.md) — command reference
