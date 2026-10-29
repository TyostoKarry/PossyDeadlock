# Commands

- `/help` — available to everyone. Quick in-Discord reference with an interactive topic dropdown.
- `/news` — require **Manage Server** permission
- `/heroes` — available to everyone. Hero data comes from [deadlock-api.com](https://deadlock-api.com) and refreshes daily; win rate and pick rate figures are based on Phantom 1+ ranked matches.
- `/steam` — available to everyone. Links your Steam account to your Discord account. Server-only; all replies are only visible to you.

Commands with a `[visibility]` option reply privately by default, so only you can see the result. Add `visibility:Public` to post the reply in the channel for everyone. Messages like "hero not found" are always private.

## `/help [topic]`

Show help and command information. Only visible to you.

| Option | Required | Description |
|---|---|---|
| `topic` | No | `General` (default), `Deadlock API`, `Heroes`, `News`, or `Steam`. Shows a quick reference for that topic. |

Includes a dropdown to switch between topics without re-running the command.

**Examples:**
- `/help` — shows general info, data sources, and a list of command groups
- `/help topic:Heroes` — shows a quick reference for `/heroes` commands

---

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

## `/news last-post [visibility]`

Show the most recent Deadlock news post based on the current news mode.

| Option | Required | Description |
|---|---|---|
| `visibility` | No | `Private` (default) or `Public`. Choose `Public` to post the reply in the channel. |

Fetches live from the Steam News API and shows the latest entry as an embed, with the title linking to the original post and a preview image when available.

**Examples:**
- `/news last-post` — shows the latest post, only to you
- `/news last-post visibility:Public` — posts the latest post in the channel

---

## `/heroes stats <hero> [visibility]`

Show base stats and performance for a specific hero.

| Option | Required | Description |
|---|---|---|
| `hero` | Yes | The hero name. Supports autocomplete. |
| `visibility` | No | `Private` (default) or `Public`. Choose `Public` to post the reply in the channel. |

Displays hero type and complexity, base stats (HP, move speed, sprint speed, stamina), win rate, pick rate, total matches, and the heroes this hero performs best/worst against.

**Examples:**
- `/heroes stats Bebop` — shows stats for Bebop, only to you
- `/heroes stats Bebop visibility:Public` — posts Bebop's stats in the channel

---

## `/heroes matchup <hero> [visibility]`

Show best/worst synergies and counters for a specific hero.

| Option | Required | Description |
|---|---|---|
| `hero` | Yes | The hero name. Supports autocomplete. |
| `visibility` | No | `Private` (default) or `Public`. Choose `Public` to post the reply in the channel. |

Displays the heroes this hero performs best/worst with (synergies) and best/worst against (counters), each with win rate and match count.

**Examples:**
- `/heroes matchup Bebop` — shows synergies and counters for Bebop

---

## `/heroes list [sort] [visibility]`

List all heroes with their win rate and pick rate, 15 per page.

| Option | Required | Description |
|---|---|---|
| `sort` | No | `Name` (default), `Win Rate`, or `Pick Rate`. Sets the initial sort order. |
| `visibility` | No | `Private` (default) or `Public`. Choose `Public` to post the reply in the channel. |

Use the sort buttons to change the sort field, or click the active sort again to reverse its direction. Use the pagination buttons to move between pages.

**Examples:**
- `/heroes list` — lists all heroes sorted by name (ascending)
- `/heroes list sort:Win Rate` — lists all heroes sorted by win rate (descending)

---

## `/heroes random [visibility]`

Show a random hero with its win rate and pick rate.

| Option | Required | Description |
|---|---|---|
| `visibility` | No | `Private` (default) or `Public`. Choose `Public` to post the reply in the channel. |

Includes a Re-roll button to get another random hero. Only the person who ran the command can re-roll.

**Examples:**
- `/heroes random` — shows a random hero with a Re-roll button

---

## `/steam link <steam>`

Link your Steam account to your Discord account. You can only link your own account, and only one at a time.

| Option | Required | Description |
|---|---|---|
| `steam` | Yes | Your account ID (Steam32), SteamID64, or a `steamcommunity.com/profiles/…` link. |

Custom profile URLs (`steamcommunity.com/id/…`) aren't supported. You can find your SteamID64 at [store.steampowered.com/account](https://store.steampowered.com/account). The ID is only checked for format, not looked up on Steam, so double-check the profile preview in the reply.

If you're already linked, the command refuses and asks you to run `/steam unlink` first.

Other members can see that you've linked an account with `/steam list-linked`. Your Steam ID isn't shown there.

**Examples:**
- `/steam link 52079950` — links by account ID
- `/steam link 76561198012345678` — links by SteamID64
- `/steam link https://steamcommunity.com/profiles/76561198012345678` — links by profile link

---

## `/steam unlink`

Remove your linked Steam account. The link is deleted completely.

No options.

---

## `/steam show`

Show your linked Steam account: its account ID and SteamID64, with a link to the Steam profile.

No options.

---

## `/steam list-linked`

List the members of this server who have linked a Steam account, shown as mentions (nobody is pinged). Steam IDs aren't shown. Links are per Discord account, not per server, but only members of the current server are listed. Shows up to 100 members.

No options.
