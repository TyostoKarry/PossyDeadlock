# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `npm run backup` writes a consistent copy of the database to `data/`, safe to run while the bot is running. See the Backups section in DEPLOYMENT.md for how to restore one.
- A short-lived cache for live deadlock-api lookups, groundwork for upcoming per-player commands. Repeated lookups will be served from memory instead of calling the API again. Adds the `lru-cache` dependency.

### Changed

- `/heroes` commands and `/news last-post` now reply privately by default, so results no longer fill up the channel. Use the new `visibility` option and choose `Public` to post a reply in the channel for everyone.
- Database upgrades now run atomically. A failed upgrade leaves the database at its previous version and logs which migration failed, instead of leaving it half-upgraded.
- The database now uses SQLite's WAL mode. `database.sqlite-wal` and `database.sqlite-shm` files may appear next to the database while the bot is running; don't delete them while it runs.
- `/heroes` commands and hero name autocomplete now read hero data from memory instead of querying the database on every call.

### Fixed

- `/heroes` no longer shows heroes that were removed from the game, or matchup and synergy stats for pairs that dropped below the 100-match minimum. Each daily refresh now replaces the hero data instead of only adding to it.
- A stalled deadlock-api request no longer hangs the daily hero refresh. Requests now time out after 15 seconds, and the existing hero data is kept.

- News posts now reach every server with a news channel set. Previously each post went only to the first server that accepted it, so other servers missed it (for example, an official post went to one server and never reached the others). Existing seen posts carry over on upgrade, so nothing is posted again.
- `zod` is now a production dependency — it was listed as a dev dependency despite being used at runtime, so deploying with `npm ci --omit=dev` would crash the bot on startup

### Security

- Updated the Node.js requirement to 24.22.1 to pick up the October 2026 security release
- Resolved all reported dependency vulnerabilities (undici, zod, brace-expansion) by updating dependencies; the undici `overrides` pin is no longer needed and was removed

## [0.2.1] - 2026-06-21

### Fixed

- Hero pick rates were drastically too low — the calculation divided Phantom 1+ hero matches by the total match count across all ranks. The denominator is now scoped to the same Phantom 1+ bracket.

### Security

- Updated the Node.js requirement to 24.17.0 to pick up the June 2026 security releases
- Resolved all reported dependency vulnerabilities — bumped esbuild and pinned undici to a patched release via `overrides`

## [0.2.0] - 2026-06-14

### Added

- `/heroes` command group — `stats`, `matchup`, `list` (sortable and paginated), and `random` subcommands, backed by a daily-refreshed database from [deadlock-api.com](https://deadlock-api.com)
- `/help [topic]` command with an interactive dropdown for General, Deadlock API, Heroes, and News topics
- Preview images in `/news last-post` and auto-posted news embeds, extracted from article content or the official post's `og:image`
- Bot version shown in `/help`
- `docs/CHANGELOG.md` to track version history

### Removed

- Noisy "Polling for news..." log line that fired every 5 minutes regardless of activity

## [0.1.1] - 2026-05-31

Patch release with quality of life improvements and development workflow fixes.

### Added

- Graceful shutdown on SIGTERM/SIGINT
- `ENVIRONMENT` variable to separate dev and production, including separate SQLite databases
- pm2 ecosystem config for production deployment
- `docs/` with DEVELOPMENT.md, DEPLOYMENT.md, and COMMANDS.md

### Changed

- News poller now uses a cache-first channel lookup

### Fixed

- Deprecated ephemeral flag warnings

## [0.1.0] - 2026-05-28

Initial release. The bot monitors the Steam News API and posts Deadlock updates to a configured Discord channel.

### Added

- Automatic Deadlock news polling every 5 minutes via the Steam News API
- Two news modes: official Valve posts only, or all posts including third-party articles
- Full patch notes thread for official Valve posts, with section splitting
- Customizable role ping on new posts
- `/news set-channel` — enable/disable news posting
- `/news set-mode` — switch between official and all news
- `/news set-ping-role` — configure the ping role
- `/news config` — view current configuration
- `/news last-post` — fetch the latest post on demand

[Unreleased]: https://github.com/TyostoKarry/PossyDeadlock/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/TyostoKarry/PossyDeadlock/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/TyostoKarry/PossyDeadlock/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/TyostoKarry/PossyDeadlock/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/TyostoKarry/PossyDeadlock/releases/tag/v0.1.0
