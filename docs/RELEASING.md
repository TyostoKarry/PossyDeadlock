# Releasing

How to cut a release once all the work for it is already merged into `main`. Four steps: **prepare issue → prepare PR → tag → GitHub release.**

> **Version number** ([SemVer](https://semver.org/)):
> - **major** (`N.0.0`): breaking changes, such as removed or renamed commands, or config/env changes that need manual action. Applies from 1.0.0 onward; before that, breaking changes go in a minor.
> - **minor** (`x.N.0`): new commands or features, behavior changes. Don't bundle features into a patch.
> - **patch** (`x.y.N`): bug fixes, security fixes, dependency/Node updates, docs-only changes. Nothing new for users.

---

## 1. Prepare vX.Y.Z issue

After the release's change issues are merged, open an issue with the [**Release** template](https://github.com/TyostoKarry/PossyDeadlock/issues/new?template=release.md). It's prefilled with the version bump + changelog finalize steps, so just replace every `X.Y.Z` with the version (title included).

## 2. Prepare vX.Y.Z PR

Branch off `main` (e.g. `prepare-vXYZ-release-version-bump-and-changelog`), then do the two changes.

### a. Bump the version

```bash
npm version X.Y.Z --no-git-tag-version
```

Updates **both** `package.json` and `package-lock.json` version fields — no install, no git commit/tag.

> Hand-edited `package.json` first? → `npm version` errors "Version not changed". Revert the edit and rerun, or just sync the lock with `npm install --package-lock-only`.

### b. Finalize the CHANGELOG (`docs/CHANGELOG.md`)

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. At release:

1. Rename `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD` (use the actual tag date), then add a new empty `## [Unreleased]` above it.
2. Confirm **every merged change is represented**. Categories in order, omitting empty ones: **Added / Changed / Deprecated / Removed / Fixed / Security**.
   - **Entries don't add themselves.** A PR that didn't touch the changelog (e.g. a security PR) still needs its entry written here.
3. Change the `[Unreleased]` link to `compare/vX.Y.Z...HEAD`, and add `[X.Y.Z]: …/compare/v<prev>...vX.Y.Z` below it.

### c. Commit & open the PR

Version first, then changelog (separate commits):

```bash
npm run format && npm run build && npm run lint

git add package.json package-lock.json
git commit -m "Bump version to X.Y.Z"

git add docs/CHANGELOG.md
git commit -m "Finalize changelog for X.Y.Z"
```

PR body: `## Summary` bullets + `close #<prep-issue>`. Merge into `main`.

## 3. Tag

Lightweight tags (consistent with all prior releases). On `main`, in sync with `origin/main`:

```bash
git checkout main && git pull
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 4. GitHub Release

1. **Releases → Draft a new release**.
2. **Choose a tag**: the existing `vX.Y.Z` you just pushed.
3. **Release title**: `vX.Y.Z`.
4. **Notes**: paste the `[X.Y.Z]` CHANGELOG section (the `###` category blocks, verbatim).
5. **Label**: **Latest** → **Publish release**.

Update production as described in [DEPLOYMENT.md § Updating](DEPLOYMENT.md#updating).

---

## Release checklist

- [ ] Release's change issues merged into `main`
- [ ] Prepare-vX.Y.Z issue filed (Release template)
- [ ] `npm version X.Y.Z --no-git-tag-version` (bumps package.json + lock)
- [ ] CHANGELOG: `[Unreleased]` → `[X.Y.Z] - <date>`, new empty `[Unreleased]` added, every change represented, compare links updated
- [ ] `npm run format && npm run build && npm run lint` clean
- [ ] Prepare PR merged into `main`
- [ ] `git checkout main && git pull && git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] GitHub Release published with the `[X.Y.Z]` notes, marked **Latest**
- [ ] Production updated (DEPLOYMENT.md § Updating)
