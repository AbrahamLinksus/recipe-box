# DECISIONS — recipe-box

## Tier 1 — decided by the owner

| ID  | Date | Decision | Chosen | Alternatives | Task |
| --- | ---- | -------- | ------ | ------------ | ---- |
| D-01 | 2026-11-11 | Where data is stored (D1) | localStorage in the browser, behind CollectionPersistence port | JSON file on disk (%LOCALAPPDATA%\RecipeBox) | plan |
| D-02 | 2026-11-11 | Stack (D6) | Node built-in http + vanilla ES modules, no build, zero runtime deps | Vite + Preact | plan |
| D-03 | 2026-11-11 | Browser tests | Add @playwright/test (channel msedge, no browser download) | Manual checklist only | plan |
| D-04 | 2026-11-11 | Rest of LLD | Approved: 127.0.0.1:47321 loopback, npm start launcher, {text,value} amounts + hand-written ¼ rounding, {version:1,recipes} format, node:test, tsc --noEmit over JSDoc, dev pkgs eslint, @eslint/js, globals, prettier, typescript, @types/node, dependency-cruiser | see LLD | plan |
| D-05 | 2026-11-11 | Spec, assumptions, HLD, team | Approved as proposed; devops declined | — | plan |
| D-06 | 2026-11-11 | 500 errors in the static server | Log them: optional `log` in createRequestHandler opts (LLD §1.1, synced at M1 as-built); main.js passes createLogger() | Keep §1.1, silent 500 | T-01 |
| D-07 | 2026-11-11 | Leftover review minors | Carry T-03 minors into T-05 and T-04 m1/m2 into T-05 (owner: "fix in T-05"); defer other minors to the M1 tidy-up list | Fix in each task before approval | T-03, T-04 |
| D-08 | 2026-11-11 | Browser for e2e (amends D-03) | Edge (channel msedge) when installed, else the Playwright Chromium already on the machine; same Chromium engine. Implemented in T-12 | Always Chromium; skip e2e in the cloud | T-12 |

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
