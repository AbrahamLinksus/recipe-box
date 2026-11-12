# STATE — recipe-box

> Source of truth for resuming. Updated after every task.

| Field        | Value                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Problem      | Single-user recipe box web app: add, search by title/tag, scale servings, favourite; data saved locally |
| Repo         | AbrahamLinksus/recipe-box (public)                                                                      |
| Stage | 7 Build |
| Milestone | M4 · Scale (T-16 done, T-17 next) — M1 done (8666dd4), M2 done (04137c2), M3 done (44e6b69) |
| Next step | Fresh session: `/setup-project resume recipe-box` → start T-17 (servings control on the recipe view, frontend-coder); run `npm ci` in every new worktree first |
| Last updated | 2026-11-12 |

## Config

- Owner: Jake · GitHub owner: AbrahamLinksus
- Approval mode: batch-low-risk · Cost mode: balanced (owner chose "Batch + economy")

## Team

| Agent | Model | Why on this project |
| ----- | ----- | ------------------- |
| frontend-coder | Sonnet | M2–M5 shell + screens, M8 search UI |
| backend-coder | Sonnet | M1 launcher, M6 model, M7 scaling, M9–M10 store/persistence |
| tester | Sonnet | every task: check.sh vs acceptance criteria |
| reviewer | Opus (Sonnet on low-risk, balanced mode) | every task, read-only |
| debugger | Opus (Sonnet on low-risk) | failures, max 2 rounds |
| docs | Haiku | milestone README/docs |

## Open work

- Tasks in progress live on `wip/*` branches (see `taskgit.sh list`); their step states are in each branch's TASK_PROGRESS.md.

## Open decisions (waiting for the owner)

- none

## How to run
```bash
npm ci
npm start      # or start.cmd
bash scripts/check.sh
```

```bash
uv sync            # python deps
# npm ci           # frontend deps
# uv run ...       # start commands
```

## Context additions

Context gaps agents reported (`Context gap:` in a REPORT). The Orchestrator adds these to the
`Read:` field for that role on top of the per-role defaults in brief-template.md.

| Role | Also read | Why (from gap report) |
| ---- | --------- | --------------------- |
| architect | <plugin root>/skills/setup-project/scopes.json; package.json; .prettierignore; web/js/ui (grep) + affected screen files for CR impact | scopes override format; §0.4 package pins (gap reports: plan lld, M1-docs); CR-1 needed screens to judge task impact |
| reviewer | DECISIONS.md (rows relevant to the task); docs/SPEC.md §5 when fixtures are involved | T-02 / T-03 reviews needed decisions + spec examples |
| debugger | docs/CONVENTIONS.md logging rules | T-05 debug needed them |
| reviewer (UI) | web/js/ui/dom.js; TASKS.md rows of later tasks touching the same screen | T-12 review needed them to judge coverage |
| architect, docs | a file with `git diff <since>..main --stat` (Orchestrator writes it) | no shell tool to run git (M2-docs gap reports) |

## Notes for the next session
- M3 approved 2026-11-12 (milestone card, 44e6b69). Owner chose: continue M4 in a fresh session. M3 deferred minors are in docs/LLD.md "Known deferred minors". Merged leftovers on origin: wip/T-14, wip/T-15, wip/M3-docs (ignore; owner deletes in GitHub UI). M3-docs approve first failed exit 5 only because node_modules was missing in the worktree.
- T-15 approved (fc6a73e). M3 tidy-up minors (T-15): failure-message helper duplicated with form-screen.js (fold into T-18); stale "Could not save" banner not cleared after a later successful toggle; no in-flight guard on star (double-click flips twice); focus drops to body when un-starring under Favourites only; tests: meaningless SPEC_RECIPES.length assertion, racy final click before navigation, wrong "(favourite)" comment in helpers/collection.js. T-15 agent decisions: star updates only after save succeeds (no optimistic update); focus restored to the same star after re-render; failure mapping copied not shared (T-18 area). M3 as-built LLD sync: favourite-toggle.js shared button; recipe-row-star retired; header Add recomputed per notification. wip/T-15 left on origin (merged).
- Session 2026-11-12 (3): T-14 approved (170a8eb). Old leftover branches were deleted by the owner; wip/T-14 remains on origin (merged; ignore on resume). T-14's 3 reviewer minors and 4 agent decisions were in a lost .results report; not recorded.
- Session 2026-11-12 (3): T-14 approved (170a8eb). Old leftover branches were deleted by the owner; wip/T-14 is left on origin (merged, ignore on resume). T-14 reviewer minors (3) and agent decisions (4) were in a lost .results report — carry to M3 tidy-up only if re-reviewed.
- M2 approved 2026-11-12 (milestone card, 04137c2). Owner chose: continue M3 in a fresh session. CR hold was skipped (owner-approved) for T-05b, T-13 and M2-docs via a patched copy of taskgit; do not assume that approval carries over — ask again if wip/CR-1 still exists.
- Leftover merged branches on origin now: wip/CR-1, wip/T-05b, wip/T-09..T-13, wip/M2-docs (all in main; ignore on resume, owner deletes them in the GitHub web UI).
- Architect and docs agents have no shell: put `git diff <last milestone>..main --stat` output in a file and list it in their Read: field.
- M2 deferred minors are listed in docs/LLD.md "Known deferred minors (M2 tidy-up list)" (incl. save-failure banner text → T-18).
- Session 2026-11-12 (2): T-05b (e104b93) and T-13 (35e517b) approved. Leftover wip/CR-1 on origin blocks taskgit approve (exit 8: CR hold) and cannot be deleted from cloud sessions (push --delete disconnects). Owner approved skipping the CR hold once for these two merges; ask the owner to delete wip/CR-1 + wip/T-09..T-12 in the GitHub web UI before the next approve.
- D-11 (owner): Save disabled live while store is read-only. T-18 brief: apply it to the shared form screen (add + edit), subscribe to store.status; remove the §5.5 "Save rejects" path from the UI.
- M2 tidy-up minors (T-13): m-8 beforeunload on global window (pass via ScreenContext), n-1 add.spec.js:189 test title says focus stays put but checks it moves; m-4 + m-9 fixes have no automated test. T-05b: 2 minor test-strength notes.
- M2 as-built LLD sync list (T-13): form split into form-widgets/form-ingredients/form-steps/form-tags.js; testids/ids error-<field> + aria-describedby; tag chip remove 40px; §5.5 align with D-11.
- Session 2026-11-12: T-09, T-10, T-11, T-12 approved; D-08 (e2e browser fallback), D-09 + CR-1 (D-10) merged. Owner chose to continue in a fresh session after CR-1.
- M1 approved 2026-11-12 (milestone card). Owner chose: continue M2 in a fresh session via `/setup-project resume recipe-box`.
- After the plan merge, DECISIONS.md/STATE.md rows recorded on main during planning were overwritten; restored in 3f7e683. Verify rows after any merge that owns shared files.
- Owner chose: T-16 (scaling, pure) starts as soon as T-03 is Done, in parallel with M2.
- T-02 must pass createLogger() to createRequestHandler (D-06) and catch ConfigError at startup.
- T-08 brief: add a global error handler in ui/app.js (window error + unhandledrejection → banner) so reportError from the store surfaces (A-07).
- M1 as-built LLD sync list: §1.1 createRequestHandler opts.log (D-06); createRequestHandler throws ConfigError("Web folder not found: <path>") (add to §1.1 @throws and §1.2 message table); FieldErrors empty → generic error (A-03).; §10.1 lenient stored-shape check (A-08) + save refuses foreign data (A-09); §9 listener isolation via reportError (A-07).
- T-04/T-05 briefs: carry T-03 minors (assertRecipeInput: trim title/names/steps per §6.3; reject sparse arrays).
- M2 tidy-up minors: T-12 n1 e2e helper duplicates Pancakes fixture; T-12 m3 hardcoded Edge paths; T-11 list.spec asserts href on one row only (star aria-label folds into T-15 brief); T-09 listTags default sort (no comparator); T-10 redundant tag trim in form-model, duplicated immutability tests. scripts/screenshot.mjs still hardcodes msedge (D-08 not applied there). .githooks/pre-commit not executable in fresh clones.
- M2 as-built LLD sync list: §4.4 new view testids (recipe-serves, recipe-tag, ingredients-panel, steps-panel, not-found-back); §4.5 Edit is a disabled <button> when store not ready; D-08 Playwright browser selection.
- taskgit approve may print a getcwd error (exit 1) after removing the worktree; check origin/main before treating it as a failure. Leftover merged branches on origin: wip/T-09, wip/T-10, wip/T-11, wip/T-12 (+ wip/CR-1 if listed) — all squashed into main and Done; on resume IGNORE them (do not restart), deleting them needs the owner (remote branch delete was blocked).
- Run `npm ci` in every new worktree before any check or approve (CR-1 approve failed without it).
- Debuggers cannot run git; the Orchestrator runs merges (git merge in the worktree), the debugger only edits files.
- M1 tidy-up list (minors, owner-approved to defer): T-02 browser.js own URL guard; probe.js overall deadline + body size cap; createServer in listen.js vs CONVENTIONS (main-only); HEALTH_PATH defined twice.; T-05 m2 a save that never settles stalls the queue; T-06 m-A isForeignData duplicates codec version check (base it on decodeCollection before any v2 format).; T-08: Add button disabled computed once at mount (stale after cross-tab status change); pre-start errors miss the banner (Add-button-at-mount minor → T-15, CR-1) (listeners installed in start()); status-sync banner.clear() can wipe a generic error banner.
- Main checkout needs `npm ci` after a fresh clone (pre-commit hook skips checks without node_modules).
- No python on PATH: screenshots use `node scripts/screenshot.mjs` (Playwright via Edge), not capture.py.
- Cloud sessions: clone to /home/user/recipe-box (taskgit takes that path; worktrees in /home/user/recipe-box-wt). No Edge there; D-08 falls back to /opt/pw-browsers Chromium.
- Flaky: server/main.js + start.cmd process tests failed once under parallel worktree runs, passed on rerun (T-10 tester). Watch for repeats.

-
