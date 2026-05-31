# PossyDeadlock

A Discord bot that automatically posts Deadlock news and patch notes to your server.

## Features

- Automatic news polling every 5 minutes via Steam News API
- Official only or all news modes
- Full patch notes thread for official Valve posts
- Role ping on new posts
- Simple slash command configuration

## Commands

All commands are under `/news` and require **Manage Server** permission.

| Command | Description |
|---|---|
| `/news set-channel [channel]` | Set the channel for news posts. Leave empty to disable. |
| `/news set-mode <mode>` | `official` (default) or `all` news mode. |
| `/news set-ping-role [role]` | Set a role to ping on new posts. Leave empty to clear. |
| `/news config` | Show current configuration. |
| `/news last-post` | Show the most recent news post. |

See [docs/COMMANDS.md](docs/COMMANDS.md) for full details and examples.

## Documentation

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — local dev setup and project structure
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — production deployment with pm2
- [docs/COMMANDS.md](docs/COMMANDS.md) — command reference
