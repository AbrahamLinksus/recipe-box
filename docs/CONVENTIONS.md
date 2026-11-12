# CONVENTIONS — Recipe Box

> Written by the Architect with the LLD and approved by the owner. Every coder reads this
> before every task; the Tester enforces section 6 automatically, and the Reviewer
> enforces sections 2–5. LLD section numbers (§n) refer to `docs/LLD.md`.

## 1. Stack-specific style
- **JavaScript ES modules only** (`"type": "module"`), no build step. Browser and Node run the source files as written. Node ≥ 24.
- **No runtime npm packages.** `server/` uses Node built-ins (`node:http`, `node:fs`, …) imported with the `node:` prefix; `web/` uses browser APIs only. Adding any package is a Tier 1 decision.
- **Types via JSDoc**, checked by `tsc --noEmit` in strict mode: every exported function/class has `@param`/`@returns` types; shared shapes are `@typedef`s in their owning module (`web/js/core/recipe/types.js`, `web/js/store/ports.js`, `server/config.js`). Never use `{*}` or `{any}`; use `unknown` and narrow.
- Relative imports always include the `.js` extension (`import { parseAmount } from '../recipe/amount.js'`).
- **Named exports only**, no default exports. One concept per file; file names `kebab-case.js`; functions/variables `camelCase`; classes `PascalCase`; constants `UPPER_SNAKE_CASE`.
- Prefer pure functions and immutable data: return new objects/arrays; store data is deep-frozen (§9).
- **DOM:** build elements with `h()` from `web/js/ui/dom.js`; set text with `textContent`. `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`eval` are forbidden (recipe text is user input). Every interactive element is a real `<button>`, `<a>` or form control, and carries the `data-testid` listed in its LLD screen section.
- **Accessible form fields** (made concrete by the recipe form, LLD §5.4): a field with a visible label uses `<label for>` + matching input `id`; a field without one (table-like rows) has an `aria-label`; a symbol-only button (`✕`, `↑`, `↓`) has an `aria-label`. An inline error is a `<p class="err" id="…">`; the invalid input gets `aria-invalid="true"` and `aria-describedby="<that id>"`. Tap targets stay ≥ 40 px (also chip/small buttons). A control that cannot act right now (end of list, read-only store) is a disabled `<button>`, not a hidden one or an `<a>` without `href`.
- **Exact user-facing texts** come from the SPEC/LLD (e.g. `MESSAGES` in `core/recipe/validation.js`, console messages in LLD §1.2). Do not reword them in code.
- Console output: server code logs only through `server/log.js`; web code calls `console.error` only in `web/js/ui/app.js` (global error handler). Server console text is ASCII only (Windows console).
- Formatting by Prettier (default options + `singleQuote: true`, `printWidth: 100`). Don't hand-format.

## 2. Layering (dependencies point inward only)
```
Browser (web/js):
  ui/ (screens, router, dialogs)  →  store/ (RecipeStore)  →  core/ (recipe, scaling, search)
  (DOM only, no storage)             (in-memory + port)        (pure logic, no DOM, no I/O)
                                          ↑ ports.js (CollectionPersistence)
  persistence/ ───────────────────────────┘ implements the port; may use core/recipe types
  main.js = the ONLY composition root: constructs persistence + store, passes them to ui/app.js

Server (server/):
  main.js (composition root) → config.js, log.js, static-handler.js, listen.js, probe.js, browser.js, launcher.js
  (launcher.js receives listen / probe / openBrowser / log from main.js; static-handler.js imports config.js for ConfigError)
```
- `ui/` never imports `persistence/` or touches `localStorage`/`sessionStorage`/`indexedDB`; it talks to data only through `RecipeStore` (§9).
- `store/` never imports `ui/`, `persistence/` or `main.js`; it receives its `CollectionPersistence` in the constructor.
- `persistence/` imports only `core/recipe/` types and `store/ports.js` / `store/errors.js`.
- `core/` imports nothing outside `core/`; `core/recipe/` imports nothing from `core/scaling/` or `core/search/`. No `window`, `document`, `localStorage`, `fetch` or timers in `core/`.
- `server/` and `web/` never import each other. `web/` never imports Node built-ins.
- Only `web/js/main.js` and `server/main.js` construct concrete dependencies (`new LocalStoragePersistence(...)`, `spawn`, `http.createServer`). Everything else receives them.

## 3. SOLID: what it means in this project

| Principle | Rule here |
|---|---|
| **S**ingle responsibility | One reason to change per file. Screens render and react to events; draft operations live in `form-model.js`; rules live in `core/`; storage lives in `persistence/`. No `utils.js` / `helpers.js` grab-bags: name files by capability (`fractions.js`, `collection-codec.js`). |
| **O**pen/closed | The named variation points get an interface: `CollectionPersistence` (§9.1, D1) and the launcher's injected `listen` / `probe` / `openBrowser` (§1.1). A new storage location = a new class implementing the port, no `if (mode === …)` branches in the store. |
| **L**iskov substitution | Every `CollectionPersistence` implementation returns the same `LoadResult` kinds and rejects only with `PersistenceWriteError`; no method left unimplemented (`watch` may legitimately be a no-op returning a no-op unsubscribe). |
| **I**nterface segregation | Screens receive one `ScreenContext` (§2.1) and use only what they need; the port has exactly four methods. Don't widen the port for one caller. |
| **D**ependency inversion | `RecipeStore` gets its persistence (and `newId` / `now`) via the constructor; `LocalStoragePersistence` gets `storage` / `storageManager` / `eventTarget` via the constructor; the launcher gets `listen` / `probe` / `openBrowser` / `log`. Wiring happens only in the two `main.js` files. |

**Where to abstract** (and where not): only the variation points above. `core/` functions, screens,
router, dialogs and the static handler are concrete. Don't add an interface with a single
implementation and no planned second one.

## 4. Limits
- Function ≤ 40 lines; cyclomatic complexity ≤ 10; parameters ≤ 5 (use an options object beyond 3 optional values); nesting depth ≤ 4.
- File ≤ 300 lines; class ≤ 200 lines (reviewer-checked).
- No commented-out code, no `console.log` debugging, no TODOs without a task ID (`// TODO(T-12): …`).

## 5. Errors, logging, config, tests
- **Errors:** custom error classes per area: `ValidationError` (§6), `RecipeNotFoundError` / `StoreReadOnlyError` / `PersistenceWriteError` (§9), `ConfigError` (§1). Throw/reject with these, never strings. Map them to user messages only in `ui/` (banner, inline errors) and in `server/main.js` (console message + exit code).
- **Never lose data silently:** unreadable stored data puts the store in read-only mode (§9.5, §10.5); nothing may write in that state. A failed write leaves the in-memory state unchanged.
- **Logging:** server logs one line per event, `key=value` style after the human message for errors (`error="EADDRINUSE" port=47321`); never log recipe contents.
- **Config:** server settings only from `loadConfig(process.env)` (§0.5); no magic numbers elsewhere (port, host, key name, schema version are named constants in their owning module).
- **Tests:** `node:test` + `node:assert/strict`; files `tests/unit/<area>/<source-file>.test.js`; `describe('<function or class>')` + `it('<condition> -> <expected>')`, e.g. `it('0.375 (halfway) -> rounds up to ½')`. Arrange-Act-Assert, one behaviour per test. Every SPEC §5 example and LLD contract table row is a test. Fakes go through the interfaces (`tests/helpers/fake-storage.js`, `memory-persistence.js`, fake `listen`/`probe`/`openBrowser`), never by patching module internals. Tests never use port 47321 or the real `localStorage` origin of the owner. E2E (if approved): `tests/e2e/*.spec.js`, selectors by `data-testid` only.

## 6. Automated checks (`scripts/check.sh` must pass; Tester runs it on every task)
Run from Git Bash: `bash scripts/check.sh` (add `--e2e` for Playwright on UI tasks, if approved). Needs `npm install` (dev tools) once.

| Check | Command (npm script) | What it enforces |
|---|---|---|
| Lint + complexity/size | `npm run lint` → `eslint .` | ESLint recommended; `complexity` 10, `max-lines-per-function` 40, `max-params` 5, `max-lines` 300, `max-depth` 4, `no-console`, no `innerHTML`, no storage globals outside `main.js`, no browser globals in `core/` (LLD §11.2) |
| Format | `npm run format:check` → `prettier --check .` | Formatting |
| Types | `npm run typecheck` → `tsc -p tsconfig.web.json && tsc -p tsconfig.node.json` | Strict JSDoc types (LLD §11.3) |
| Layer rules | `npm run deps` → `depcruise server web/js` | Section 2 layering, no cycles, no runtime npm imports, no Node built-ins in `web/` (LLD §11.4) |
| Tests + coverage | `npm test` → `node --test --experimental-test-coverage …` | Unit tests; lines/branches/functions ≥ 80 % over `server/` and non-DOM `web/js/` (LLD §11.1) |
| E2E (if approved) | `npm run test:e2e` → `playwright test` | SPEC §5 flows in installed Edge at 1280 px and 390 px (LLD §11.6) |
