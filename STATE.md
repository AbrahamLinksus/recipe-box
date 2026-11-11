# STATE — recipe-box

> Source of truth for resuming. Updated after every task.

| Field | Value |
|---|---|
| Problem | Single-user recipe box web app: add, search by title/tag, scale servings, favourite; data saved locally |
| Repo | AbrahamLinksus/recipe-box (public) |
| Stage | 4 LLD (spec, HLD, team approved) |
| Milestone | — (planning) |
| Next step | LLD: researcher → architect on wip/plan |
| Last updated | 2026-11-11 |

## Config
- Owner: Jake · GitHub owner: AbrahamLinksus
- Approval mode: batch-low-risk · Cost mode: balanced (owner chose "Batch + economy")
- Optional agents declined: devops (no CI; handover skips the devops step)

## Team
| Agent | Model | Why on this project |
|---|---|---|
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
uv sync            # python deps
# npm ci           # frontend deps
# uv run ...       # start commands
```

## Context additions
Context gaps agents reported (`Context gap:` in a REPORT). The Orchestrator adds these to the
`Read:` field for that role on top of the per-role defaults in brief-template.md.
| Role | Also read | Why (from gap report) |
|---|---|---|

## Notes for the next session
- 
