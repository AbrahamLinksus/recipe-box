# DECISIONS — {{project}}

## Tier 1 — decided by the owner

| ID  | Date | Decision | Chosen | Alternatives | Task |
| --- | ---- | -------- | ------ | ------------ | ---- |

## Tier 2 — decided by agents (overrule any time)

| ID  | Date | Decision | Chosen | Agent | Task |
| --- | ---- | -------- | ------ | ----- | ---- |
| A-01 | 2026-11-11 | h() handles unsafe attrs | silently skips on* strings and javascript:/data: URLs | frontend debugger | T-07 |
| A-02 | 2026-11-11 | routeToHash(notFound) | '#/not-found' | frontend-coder | T-07 |
| A-03 | 2026-11-11 | Bad tags in assertRecipeInput | throw ValidationError({}) (no tags key in FieldErrors) | backend debugger | T-03 |
| A-04 | 2026-11-11 | Fixture values not in SPEC | Tomato Soup ingredients/steps and Banana Bread steps invented | backend-coder | T-03 |
| A-05 | 2026-11-11 | Store copies loaded recipes | structuredClone before deep-freeze; reload() + watch wired in T-04 | backend-coder | T-04 |
