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
| A-06 | 2026-11-11 | Launcher structure | server/listen.js (createListen) for bound-address test; browser opener errors logged, never fatal | backend-coder | T-02 |
| A-07 | 2026-11-11 | Listener errors in the store | isolated per listener, reported via globalThis.reportError (microtask fallback); never fail a saved write | backend debugger | T-05 |
| A-08 | 2026-11-11 | Stored-data check | lenient shape check (types only) separate from write-side assertRecipeInput | backend debugger | T-06 |
| A-09 | 2026-11-11 | Save over data it can't read | adapter refuses (PersistenceWriteError 'unavailable') if stored value is v2 / missing version / not JSON | backend debugger | T-06 |
| A-10 | 2026-11-11 | Not-yet-built routes | #/new, view, edit show Page not found until M2 | frontend-coder | T-08 |
