---
name: release-bump
description: Bump the app version, add a new phase to the JOURNAL and run all checks. Started by the user with /release-bump.
disable-model-invocation: true
---

# Release bump

1. Read the current version from `package.json` and ask the user for the new one (suggest the next one, e.g. 0.3.1 → 0.3.2 or 0.4.0).
2. Run `npm version <new-version> --no-git-tag-version`. Then update every place that mentions the version: the expected value in `src/App.test.tsx` (`__APP_VERSION__`), the "Versions" list in `README.md` (English and Serbian parts) and the first paragraph of `REPORT.md`.
3. In `docs/development/JOURNAL.md` add a new section at the end, `## <new-version> — <short title>`, in the same style as the existing ones: a few sentences about what changed and what the user learned, in simple words, with a comparison to Python where it helps.
4. Run `npm run typecheck`, `npm run lint` and `npm test` in that order, then report the result briefly.
5. Do not make a commit or a PR. The user makes them. At the end suggest an English commit message, e.g. `chore: release <new-version>`.
