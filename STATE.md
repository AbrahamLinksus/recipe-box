# STATE — recipe-box

> Source of truth for resuming. Updated after every task.

| Field        | Value                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Problem      | Single-user recipe box web app: add, search by title/tag, scale servings, favourite; data saved locally |
| Repo         | AbrahamLinksus/recipe-box (public)                                                                      |
| Stage        | 1 Spec interview                                                                                        |
| Milestone    | — (planning)                                                                                            |
| Next step    | Spec interview round 1 · planner                                                                        |
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
| architect | <plugin root>/skills/setup-project/scopes.json; package.json; .prettierignore | scopes override format; §0.4 package pins (gap reports: plan lld, M1-docs) |
| reviewer | DECISIONS.md (rows relevant to the task); docs/SPEC.md §5 when fixtures are involved | T-02 / T-03 reviews needed decisions + spec examples |
| debugger | docs/CONVENTIONS.md logging rules | T-05 debug needed them |

## Notes for the next session
- M1 approved 2026-11-12 (milestone card). Owner chose: continue M2 in a fresh session via `/setup-project resume recipe-box`.
- After the plan merge, DECISIONS.md/STATE.md rows recorded on main during planning were overwritten; restored in 3f7e683. Verify rows after any merge that owns shared files.
- Owner chose: T-16 (scaling, pure) starts as soon as T-03 is Done, in parallel with M2.
- T-02 must pass createLogger() to createRequestHandler (D-06) and catch ConfigError at startup.
- T-08 brief: add a global error handler in ui/app.js (window error + unhandledrejection → banner) so reportError from the store surfaces (A-07).
- M1 as-built LLD sync list: §1.1 createRequestHandler opts.log (D-06); createRequestHandler throws ConfigError("Web folder not found: <path>") (add to §1.1 @throws and §1.2 message table); FieldErrors empty → generic error (A-03).; §10.1 lenient stored-shape check (A-08) + save refuses foreign data (A-09); §9 listener isolation via reportError (A-07).
- T-04/T-05 briefs: carry T-03 minors (assertRecipeInput: trim title/names/steps per §6.3; reject sparse arrays).
- M1 tidy-up list (minors, owner-approved to defer): T-02 browser.js own URL guard; probe.js overall deadline + body size cap; createServer in listen.js vs CONVENTIONS (main-only); HEALTH_PATH defined twice.; T-05 m2 a save that never settles stalls the queue; T-06 m-A isForeignData duplicates codec version check (base it on decodeCollection before any v2 format).; T-08: Add button disabled computed once at mount (stale after cross-tab status change); pre-start errors miss the banner (listeners installed in start()); status-sync banner.clear() can wipe a generic error banner.
- Main checkout needs `npm ci` after a fresh clone (pre-commit hook skips checks without node_modules).
- No python on PATH: screenshots use `node scripts/screenshot.mjs` (Playwright via Edge), not capture.py.

-
