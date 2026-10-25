---
name: Release
about: Prepare a release (version bump and changelog), see docs/RELEASING.md
title: "Prepare vX.Y.Z release: version bump and changelog"
labels: []
---

## Overview

Prepare the codebase for the vX.Y.Z release: sync `package.json`'s version with the release and finalize the CHANGELOG's `X.Y.Z` entry.

## Background

- `package.json`'s `version` needs to match the `vX.Y.Z` tag.
- `docs/CHANGELOG.md` has an `[Unreleased]` section that needs finalizing as `[X.Y.Z]`.

## Implementation

- Bump `package.json` version to `X.Y.Z` (`/help` surfaces it automatically via `src/utils/version.ts` — no code change).
- Finalize `docs/CHANGELOG.md`: rename `## [Unreleased]` → `## [X.Y.Z] - <date>`, add a new empty `## [Unreleased]` above it, update the compare links, and confirm every merged change has an entry.

## Notes

- Depends on the release's other issues being merged first.
- After this PR merges, tag `vX.Y.Z`, create the release, and deploy.

## Documentation

- None.
