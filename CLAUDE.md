@CLAUDE_GRAPHIFY_GUIDE.md

## Token saving (permanent rule)

- Graphify first for definitions, callers, impact and tests; grep only for literal strings.
- Files over ~150 lines: outline with headroom/peek, read only the needed ranges.
- Keep command output short (`| tail`); run only affected tests while iterating, the full suite once per section.
- Heavy folders are ignored via `.claudeignore` and `permissions.deny` in `.claude/settings.json`.
