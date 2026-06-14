# Commands

Commands are split into two groups:

- `/news` — require **Manage Server** permission
- `/heroes` — available to everyone. Hero data comes from [deadlock-api.com](https://deadlock-api.com) and refreshes daily; win rate and pick rate figures are based on Phantom 1+ ranked matches.

## `/news set-channel [channel]`

Set the channel where Deadlock news will be posted.

| Option | Required | Description |
|---|---|---|
| `channel` | No | The text channel to post news in. Leave empty to disable. |

**Examples:**
- `/news set-channel #deadlock-news` — posts news to #deadlock-news
- `/news set-channel` — disables news posting, preserves other settings

---

## `/news set-mode <mode>`

Set the type of Deadlock news to post.

| Option | Required | Description |
|---|---|---|
| `mode` | Yes | `official` or `all` |

**Modes:**
- `official` (default) — Valve patch notes only (`steam_community_announcements`)
- `all` — all news including third-party articles (PC Gamer, PCGamesN, etc.)

Official posts also get a full patch notes thread created automatically with sections split out.

---

## `/news set-ping-role [role]`

Set a role to ping when new Deadlock news is posted.

| Option | Required | Description |
|---|---|---|
| `role` | No | The role to ping. Leave empty to clear. |

**Examples:**
- `/news set-ping-role @Deadlock News` — pings that role on new posts
- `/news set-ping-role` — clears the ping role

---

## `/news config`

Show the current news configuration for this server.

Displays the configured news channel, news mode, and ping role. Only visible to you.

---

## `/news last-post`

Show the most recent Deadlock news post based on the current news mode.

Fetches live from the Steam News API and posts the latest entry as an embed.

---

## `/heroes stats <hero>`

Show base stats and performance for a specific hero.

| Option | Required | Description |
|---|---|---|
| `hero` | Yes | The hero name. Supports autocomplete. |

Displays hero type and complexity, base stats (HP, move speed, sprint speed, stamina), win rate, pick rate, total matches, and the heroes this hero performs best/worst against.

**Examples:**
- `/heroes stats Bebop` — shows stats for Bebop

---

## `/heroes matchup <hero>`

Show best/worst synergies and counters for a specific hero.

| Option | Required | Description |
|---|---|---|
| `hero` | Yes | The hero name. Supports autocomplete. |

Displays the heroes this hero performs best/worst with (synergies) and best/worst against (counters), each with win rate and match count.

**Examples:**
- `/heroes matchup Bebop` — shows synergies and counters for Bebop

---

## `/heroes list [sort]`

List all heroes with their win rate and pick rate, 15 per page.

| Option | Required | Description |
|---|---|---|
| `sort` | No | `Name` (default), `Win Rate`, or `Pick Rate`. Sets the initial sort order. |

Use the sort buttons to change the sort field, or click the active sort again to reverse its direction. Use the pagination buttons to move between pages.

**Examples:**
- `/heroes list` — lists all heroes sorted by name (ascending)
- `/heroes list sort:Win Rate` — lists all heroes sorted by win rate (descending)

---

## `/heroes random`

Show a random hero with its win rate and pick rate.

No options.

Includes a Re-roll button to get another random hero. Only the person who ran the command can re-roll.

**Examples:**
- `/heroes random` — shows a random hero with a Re-roll button
