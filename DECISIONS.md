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
| D-09 | 2026-11-12 | Unreadable data after a cross-tab reload (LLD §9.5 vs §3.5/§4.5) | Keep the last loaded recipes visible, read-only, with banner → CR-1 | Show nothing and amend §3.5/§4.5; decide later | T-12 |
| D-10 | 2026-11-12 | CR-1 · keep last recipes visible on unreadable reload | LLD §9.5 load-path table (+§2.5/§3.5/§4.5/§5.5); new T-05b in M2; T-15/T-17/T-18/T-19 criteria updated | Cancel CR | CR-1 |
| D-11 | 2026-11-12 | Save on the recipe form while the store is read-only (LLD §2.5 vs §5.5) | Disable Save live, following store.status (§2.5 / CR-1); architect aligns §5.5 at M2 as-built sync; add form gets it in T-15/T-18 | Keep Save enabled, store rejects with StoreReadOnlyError (§5.5) | T-13 |
| D-12 | 2026-11-12 | Pre-existing failing e2e test (persistence.spec.js cross-tab list recover: search filter left active) | Fix in T-20 (full e2e pass) | Fix now / fold into T-19 | T-17, T-18 |

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
| A-11 | 2026-11-12 | Tie-break compare in sortByTitle | plain string < on ISO createdAt then id | frontend-coder | T-09 |
| A-12 | 2026-11-12 | isDirty | trimmed JSON fingerprint of both drafts; no-op ops return a fresh draft sharing untouched arrays | frontend-coder | T-10 |
| A-13 | 2026-11-12 | List star before T-15 | non-interactive span (★/☆ from stored state); becomes the labelled toggle button in T-15 | frontend-coder | T-11 |
| A-14 | 2026-11-12 | Disabled Edit on the view | disabled <button> with the same testid (not an href-less link) | frontend-coder | T-12 |
| A-15 | 2026-11-12 | Unknown id on the edit hash | reuse mountNotFoundScreen | frontend-coder | T-18 |
| A-16 | 2026-11-12 | Cancel on the edit form | returns to the recipe view | frontend-coder | T-18 |
| A-17 | 2026-11-12 | beforeunload + save-failure text | ctx.onBeforeUnload in ScreenContext; one reason→text map in web/js/ui/save-failure.js | frontend-coder | T-18 |
| A-18 | 2026-11-12 | Servings state on the view | reset only on first show of a recipe id; kept across store notifications (with focus and typed text) | frontend-coder | T-17 |
| A-19 | 2026-11-12 | Focus after re-render | shared renderKeepingFocus in web/js/ui/focus-keeper.js; fallback per control (servings → input; star none) | debugger | T-17 |
