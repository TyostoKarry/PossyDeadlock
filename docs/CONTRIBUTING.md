# Contributing

How changes get from an idea into `main`. For setting up and running the bot locally, see [DEVELOPMENT.md](DEVELOPMENT.md). For cutting a release, see [RELEASING.md](RELEASING.md).

## Workflow

**issue → branch → commits → PR → merge.** Every change starts with an issue, including small fixes and dependency updates.

### 1. Open an issue

**New issue** offers two templates:

- **[Change](https://github.com/TyostoKarry/PossyDeadlock/issues/new?template=change.md)**: features, bug fixes, and maintenance (dependency updates, docs). Fill in the sections: **Overview**, **Background**, **Implementation**, **Notes**, and **Documentation** (which docs need updating, or "None").
- **[Release](https://github.com/TyostoKarry/PossyDeadlock/issues/new?template=release.md)**: release prep only, see [RELEASING.md](RELEASING.md).

Name the issue after what it does, starting with a verb (`Add …`, `Fix …`, `Update …`). The title becomes the branch name.

### 2. Create a branch

Create the branch from the issue: **Development → Create a branch** in the issue sidebar, branching from `main`. GitHub names it `<issue-number>-<issue-title>` (lowercase, words joined by hyphens, punctuation dropped) and links it to the issue.

| Issue | Branch |
|---|---|
| #20 Add contributing and release docs with issue templates | `20-add-contributing-and-release-docs-with-issue-templates` |

Then check it out locally:

```bash
git fetch origin
git checkout <branch-name>
```

### 3. Commit

Small, focused commits, each doing one thing. Messages are short, imperative, and capitalized, with no trailing period:

- `Implement /heroes stats subcommand`
- `Fix hero pick rate by scoping match count to the same rank`
- `Document /help command`

Code, docs, and the changelog entry are usually separate commits.

### 4. Update the CHANGELOG

Add an entry under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md), in the right category (in order: **Added / Changed / Deprecated / Removed / Fixed / Security**). Write it for someone running the bot, not for a code reviewer.

- **Needs an entry:** anything users or server admins notice, including new or changed commands, bug fixes, security and dependency fixes, and new setup steps.
- **No entry:** repo-only docs (CONTRIBUTING, templates, typos), refactors with no visible effect.

The category also decides the next version number, see [RELEASING.md](RELEASING.md): **Added/Changed** → minor, **Fixed/Security** only → patch.

### 5. Update the docs

If the change affects how the bot is used or run, update the matching docs in the same PR:

- New or changed commands: [COMMANDS.md](COMMANDS.md), the `/help` topics in `src/commands/help/`, and the README command list
- Setup or environment changes: [DEVELOPMENT.md](DEVELOPMENT.md) and/or [DEPLOYMENT.md](DEPLOYMENT.md)

### 6. Check and open the PR

```bash
npm run format:fix && npm run lint:fix && npm run build
```

This formats the code, fixes what ESLint can fix automatically, and compiles. All three must pass cleanly. CI runs the check-only versions (`npm run format`, `npm run lint`, `npm run build`) on every PR, so anything missed here fails the PR. Then open the PR against `main`:

- **Title:** the issue title
- **Body:** a `## Summary` of what changed and why, ending with `close #<issue>` so merging closes the issue
- If slash commands changed, run `npm run deploy:dev` and test them on the dev bot before merging

Merge into `main` once it's done. Delete the branch afterwards.

## CI

Every pull request to `main` runs the [CI workflow](../.github/workflows/ci.yml): `npm ci`, then `npm run format`, `npm run lint`, and `npm run build`. These are the same check-only scripts you can run locally.

`main` is protected: changes only land through a pull request, the **Verify** check must pass, and the branch must be up to date with `main` before merging.

If CI fails, open the failing step in the PR's **Checks** tab, then:

| Failing step | Fix locally |
|---|---|
| Check formatting | `npm run format:fix` |
| Run linter | `npm run lint:fix`, then fix anything it reports that it can't fix itself |
| Build project | `npm run build` and fix the type errors it reports |

Commit the fix and push; CI reruns automatically.
