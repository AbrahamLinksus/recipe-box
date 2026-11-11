# STATE — recipe-box

> Source of truth for resuming. Updated after every task.

| Field        | Value                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Problem      | Single-user recipe box web app: add, search by title/tag, scale servings, favourite; data saved locally |
| Repo         | AbrahamLinksus/recipe-box (public)                                                                      |
| Stage        | 1 Spec interview                                                                                        |
| Milestone    | — (planning)                                                                                            |
| Next step    | Spec interview round 1 · planner                                                                        |
| Last updated | 2026-11-11                                                                                              |

## Config

- Owner: Jake · GitHub owner: AbrahamLinksus
- Approval mode: batch-low-risk · Cost mode: balanced (owner chose "Batch + economy")

## Team

| Agent | Model | Why on this project |
| ----- | ----- | ------------------- |

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

## Notes for the next session
- Owner chose: T-16 (scaling, pure) starts as soon as T-03 is Done, in parallel with M2.
- Main checkout needs `npm ci` after a fresh clone (pre-commit hook skips checks without node_modules).
- No python on PATH: screenshots use `node scripts/screenshot.mjs` (Playwright via Edge), not capture.py.

-
