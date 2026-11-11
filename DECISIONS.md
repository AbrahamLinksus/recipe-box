# DECISIONS — recipe-box

## Tier 1 — decided by the owner
| ID | Date | Decision | Chosen | Alternatives | Task |
|---|---|---|---|---|---|
| D-01 | 2026-11-11 | Where data is stored (D1) | localStorage in the browser, behind CollectionPersistence port | JSON file on disk (%LOCALAPPDATA%\RecipeBox) | plan |
| D-02 | 2026-11-11 | Stack (D6) | Node built-in http + vanilla ES modules, no build, zero runtime deps | Vite + Preact | plan |
| D-03 | 2026-11-11 | Browser tests | Add @playwright/test (channel msedge, no browser download) | Manual checklist only | plan |
| D-04 | 2026-11-11 | Rest of LLD | Approved: 127.0.0.1:47321 loopback, npm start launcher, {text,value} amounts + hand-written ¼ rounding, {version:1,recipes} format, node:test, tsc --noEmit over JSDoc, dev pkgs eslint, @eslint/js, globals, prettier, typescript, @types/node, dependency-cruiser | see LLD | plan |
| D-05 | 2026-11-11 | Spec, assumptions, HLD, team | Approved as proposed; devops declined | — | plan |

## Tier 2 — decided by agents (overrule any time)
| ID | Date | Decision | Chosen | Agent | Task |
|---|---|---|---|---|---|
