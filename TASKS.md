# TASKS — Recipe Box

Status: Backlog → In progress → Review → Needs you → Done

`Context:` lists exactly what the task's agents need to read: spec stories, LLD sections
(by number) and file globs. The Orchestrator builds every brief's `Read:` field from it.

Notes for every task
- `docs/CONVENTIONS.md` is always read by coders, tester and reviewer, so it is not repeated in `Context:`.
- "Checks pass" = `bash scripts/check.sh` exits 0 (lint, format, types, layer rules, unit tests with ≥ 80 % coverage); UI tasks run `bash scripts/check.sh --e2e` (Playwright in Edge, projects `desktop` 1280×800 and `narrow` 390×844, port 47399).
- The owner of a task writes its unit tests (`tests/unit/<area>/<file>.test.js`) and, for screen tasks, the e2e spec named in its criteria. E2E selectors use the `data-testid`s from the LLD screen section.
- SPEC §5 example data (Pancakes, Tomato Soup, Banana Bread) lives in `tests/helpers/recipes.fixture.js` (created in T-03) and is reused by unit and e2e tests.
- Milestone-closing `M<n>-docs` tasks (README etc.) are added by the Orchestrator.

## M1 · Walking skeleton

### T-01 · Static server: config, logger and request handler

- Owner: backend-coder
- Depends on: —
- Context: SPEC US-11 · LLD §0.5, §1.1, §1.2, §1.5, §11.6 · files: server/*, tests/unit/server/*
- Status: Done
- Acceptance criteria:
  - [x] `server/config.js`, `server/log.js`, `server/static-handler.js` export the §1.1 signatures; `loadConfig({})` gives port 47321, host `127.0.0.1`, origin `http://127.0.0.1:47321`; `RECIPE_BOX_PORT=80` or `abc` throws `ConfigError` with the exact §1.2 message
  - [x] Unit tests (handler started on port 0) cover every §1.2 contract row: `GET /` → 200 index.html, `/__recipe-box/health` → `{"app":"recipe-box","version":…}`, MIME types for .html/.js/.css/.svg/.json, 404 for missing / directory / unknown extension / `..` / `%00`, 405 with `Allow: GET, HEAD` for POST, 403 "Forbidden host" for a foreign `Host` header
  - [x] Every response carries the §1.2 headers (`Cache-Control: no-cache`, `X-Content-Type-Options`, `Referrer-Policy`, the exact CSP), asserted in a test
  - [x] Checks pass (coverage ≥ 80 % over `server/**` except `server/main.js`)
- Result: ✅ 4/4 goals · 59 pass 1 skip · 99.6% cov · 1 debugger round · D-06 · 94e8683

### T-02 · Launcher and the one start command

- Owner: backend-coder
- Depends on: T-01
- Context: SPEC US-11, US-08 · LLD §0.5, §1.1, §1.2, §1.4, §1.5 · files: server/*, start.cmd, package.json, tests/unit/server/*
- Status: Done
- Acceptance criteria:
  - [x] `server/probe.js`, `server/browser.js`, `server/launcher.js` implement §1.1; `server/main.js` (replacing the skeleton stub) wires them; `npm start` prints `Recipe Box is running at http://127.0.0.1:47321/ - opening your browser. Close this window to stop it.` and the default browser opens that address (terminal + browser screenshots in `.results/T-02/`)
  - [x] Unit tests with fake `listen` / `probe` / `openBrowser` cover all four outcomes and their exact §1.2 messages and exit codes: started (keeps running), already-running (opens browser, exit 0), port-conflict incl. probe `other`/timeout and `none`→retry-once (exit 1), port-forbidden on `EACCES` (exit 1)
  - [x] Running `npm start` a second time while the first runs prints the "already running" message and exits 0; `RECIPE_BOX_NO_OPEN=1` opens no browser
  - [x] Server listens on `127.0.0.1` only (test asserts the bound address); `start.cmd` matches §1.5 and keeps the window open on error
  - [x] Checks pass
- Result: ✅ 5/5 goals · 182 tests · live npm start verified · accf1c3

### T-03 · Recipe model, amount parsing, tags and validation

- Owner: backend-coder
- Depends on: —
- Context: SPEC US-01, US-09, §4 F-1, §5 · LLD §6.1, §6.2, §6.3, §6.5 · files: web/js/core/recipe/*, tests/unit/core/recipe/*, tests/helpers/*
- Status: Done
- Acceptance criteria:
  - [x] `web/js/core/recipe/{types,amount,tags,validation,errors}.js` export the §6.1 signatures; no DOM/storage access (lint `core/` globals rule passes)
  - [x] Unit tests cover every §6.2 `parseAmount` row: `2`, `300`, `0.5`, `.5`, `1.25`, `½`, `1½`, `1 ½`, `1/2`, `1 1/2` parse to their values; `a pinch`, `2-3`, `1/0`, `0,5`, empty → `value: null` with text kept
  - [x] `validateDraft` tests: empty title → "Title is required"; servings `0`/`2.5`/`` → "Servings must be 1 or more"; "Toast" serves 1 with no ingredients → "Add at least one ingredient"; no steps → "Add at least one step"; row with amount but no name → "Enter the ingredient name" at its index; all errors reported at once; tags `Breakfast`, `sweet ` → `breakfast`, `sweet`
  - [x] `tests/helpers/recipes.fixture.js` holds the SPEC §5 recipes (Pancakes serves 4 with 200 g flour, 2 eggs, 300 ml milk, a pinch of salt and 4 steps; Tomato Soup `lunch`/`vegetarian`; Banana Bread serves 8 with 3 bananas, 1 tsp baking soda, 250 g flour, `breakfast`/`baking`)
  - [x] Checks pass
- Result: ✅ 5/5 goals · 71 tests · 100% cov · 1 debugger round · e46115d · open minors → T-04/T-05: save guard accepts untrimmed text and sparse arrays

### T-04 · Recipe store: port, errors and read side

- Owner: backend-coder
- Depends on: T-03
- Context: SPEC US-02, US-08 · LLD §9.1, §9.5 · files: web/js/store/*, tests/unit/store/*, tests/helpers/*
- Status: Done
- Acceptance criteria:
  - [x] `web/js/store/ports.js` (`CollectionPersistence`, `LoadResult` typedefs) and `errors.js` (`RecipeNotFoundError`, `StoreReadOnlyError`, `PersistenceWriteError` with `.id` / `.status` / `.reason`) match §9.1
  - [x] `RecipeStore` constructor, `init`, `status`, `statusReason`, `list`, `get`, `subscribe` implemented; `init()` maps `ok` → ready with recipes, `empty` → ready with `[]` and nothing written, `unreadable` / `unavailable` → that status with `list()` = `[]` (one test each)
  - [x] Returned recipes and the `list()` snapshot are deep-frozen (test tries to mutate and fails)
  - [x] `tests/helpers/memory-persistence.js` implements the port and is used by the tests; checks pass
- Result: ✅ 4/4 goals · 117 tests · 7113cbf · minors m1 (init twice) + m2 (load reject → stuck loading) carried into T-05

### T-05 · Recipe store: writes, favourite toggle and cross-tab reload

- Owner: backend-coder
- Depends on: T-04
- Context: SPEC US-01, US-07, US-09, US-10 · LLD §9.1, §9.4, §9.5 · files: web/js/store/*, tests/unit/store/*, tests/helpers/memory-persistence.js
- Status: Done
- Acceptance criteria:
  - [x] `create` (new id, favourite false, createdAt = updatedAt = injected `now`), `update` (keeps id, favourite, createdAt), `remove`, `toggleFavourite` work per §9.1; unknown id → `RecipeNotFoundError`; invalid input → `ValidationError`
  - [x] Every write calls `persistence.save` before committing; a rejected save leaves `list()` unchanged and rejects with the `PersistenceWriteError` (rollback test for each write method)
  - [x] Writes while status is `unreadable` / `unavailable` reject with `StoreReadOnlyError` and never call `save`; concurrent writes are serialised (test fires two writes, both persisted in order)
  - [x] Subscribers are notified after each successful write and after `reload()`; a `watch` callback triggers `reload()`, and a reload that yields `unreadable` switches the store to read-only
  - [x] Checks pass
- Result: ✅ 5/5 goals + carried fixes · 206 tests · 2 debugger rounds · 9e5d1dc

### T-06 · Local persistence: collection codec and localStorage adapter

- Owner: backend-coder
- Depends on: T-04
- Context: SPEC US-08, §6 · LLD §10.1, §10.3, §10.5, §9.1 · files: web/js/persistence/*, tests/unit/persistence/*, tests/helpers/*
- Status: Done
- Acceptance criteria:
  - [x] `encodeCollection` / `decodeCollection` round-trip the Pancakes fixture exactly (amount `{ text, value }` kept, incl. "a pinch of salt" with `value: null`); stored shape matches §10.3 under key `recipe-box:collection`, version 1
  - [x] `decodeCollection` tests: `null` → empty; `"{oops"` → unreadable `not JSON`; version 2 / missing → unreadable `unknown version …`; a recipe with servings 0 → unreadable `invalid recipe at index 0`
  - [x] `LocalStoragePersistence` with `tests/helpers/fake-storage.js`: `SecurityError` on read → `unavailable`; `QuotaExceededError` on save → `PersistenceWriteError('quota')`; `watch` fires only for `recipe-box:collection` or `null` key; `requestDurability` returns false on errors
  - [x] No file in `web/js/persistence/` references `localStorage` directly (storage is injected); layer rule `persistence-only-ports` passes; checks pass
- Result: ✅ 4/4 goals · 226 tests · load never writes · 1 debugger round · 285e375

### T-07 · UI shell primitives: page, DOM helper, router, dialogs, banner, filter state

- Owner: frontend-coder
- Depends on: —
- Context: SPEC US-10, §4 F-1, §7 · LLD §2.1, §2.4, §2.5 · files: web/index.html, web/favicon.svg, web/js/ui/{dom,router,dialogs,banner,filter-state}.js, tests/unit/ui/*, docs/wireframes/*.html
- Status: Done
- Acceptance criteria:
  - [x] `web/index.html` has the app root, the banner region (`data-testid="banner"`, `role="alert"`) and the native `<dialog id="confirm-dialog">` with `confirm-ok` / `confirm-cancel`; loads only `/js/main.js` and `/css/app.css` (CSP-compatible: no inline script or style)
  - [x] `parseRoute` / `routeToHash` unit tests cover `''`, `#/`, `#/recipe/abc`, `#/recipe/abc/edit`, `#/new` and an unknown hash → `notFound`; `createRouter` honours `canLeave()` false by restoring the previous hash with `replaceState`
  - [x] `createFilterState` tests: default `{ query: '', tag: null, favouritesOnly: false }`, `set` patches, `reset` restores defaults
  - [x] `h()` sets text via `textContent` only (lint `no-restricted-syntax` passes); `confirmDialog` resolves false on Esc/backdrop and focuses the cancel button
  - [x] Checks pass
- Result: ✅ 5/5 goals · 36 tests · 1 debugger round (router re-entrancy) · c6fa362

### T-08 · Composition root, app wiring and empty recipe list

- Owner: frontend-coder
- Depends on: T-02, T-06, T-07
- Context: SPEC US-02, US-08, US-11, §4 F-0 · LLD §1.4, §2.1, §2.5, §3.1, §3.4, §11.6 · files: web/js/main.js, web/js/ui/app.js, web/js/ui/screens/*, web/css/app.css, tests/e2e/*, docs/wireframes/recipe-list.html
- Status: Done
- Acceptance criteria:
  - [x] `web/js/main.js` (≤ 30 lines) builds `LocalStoragePersistence` → `RecipeStore` → `init()` → `requestDurability()` → `createApp(...).start()`; `app.js` mounts screens per route, shows "Page not found" + "All recipes" for unknown routes, and routes unhandled rejections to the banner
  - [x] With no stored data, `npm start` shows "No recipes yet" and an "Add your first recipe" button (`empty-state`, `add-first-recipe`); screenshots at 1280 and 390 px in `.results/T-08/`
  - [x] Base layout in `web/css/app.css` (mobile-first single column, page max-width 1100 px) with the list header and "Add recipe" button (`add-recipe`)
  - [x] E2E `tests/e2e/list.spec.js` (empty state) and `tests/e2e/persistence.spec.js` (stored value `{oops` → banner "Your saved recipes could not be read, so Recipe Box will not change them. Nothing has been deleted.", Add disabled, stored value byte-identical afterwards) pass in both projects; e2e seed helper `tests/e2e/helpers/seed.js` writes `recipe-box:collection` via `page.addInitScript`
  - [x] `bash scripts/check.sh --e2e` passes
- Result: ✅ 5/5 goals · e2e 14/14 · 3491ef1

## M2 · Add, list and open

### T-09 · Search, filter and A–Z sort (pure logic)

- Owner: frontend-coder
- Depends on: T-03
- Context: SPEC US-02, US-03, US-04, US-07, §5 F-2 · LLD §8.1, §8.2 · files: web/js/core/search/*, tests/unit/core/search/*, tests/helpers/recipes.fixture.js
- Status: Done
- Acceptance criteria:
  - [x] `filterRecipes`, `sortByTitle`, `listTags`, `hasActiveFilters` match §8.1; `core/search` imports only `core/recipe` (layer rules pass)
  - [x] Unit tests cover every §8.2 row with the SPEC §5 fixture: none → Banana Bread, Pancakes, Tomato Soup; `b` → Banana Bread; `PAN` → Pancakes; tag `breakfast` → Banana Bread, Pancakes; `xyz` → []; favouritesOnly (Banana Bread starred) → Banana Bread; `breakfast` + `pan` + favouritesOnly → []
  - [x] Sort is case-insensitive with ties by createdAt then id (two "Pancakes" test); `listTags` returns unique tags A–Z; input arrays are not mutated
  - [x] Checks pass
- Result: ✅ 4/4 goals · checks pass · 99.93% cov · 0 major, 1 minor (listTags default sort; tags stored lowercase) · 95c79c2

### T-10 · Recipe form model (pure draft operations)

- Owner: frontend-coder
- Depends on: T-03
- Context: SPEC US-01, US-09, §4 F-1 · LLD §5.1, §6.1 · files: web/js/ui/form-model.js, tests/unit/ui/form-model.test.js, tests/helpers/recipes.fixture.js
- Status: Done
- Acceptance criteria:
  - [x] Every §5.1 function exists and returns a new draft (immutability test on each)
  - [x] `emptyDraft()` has one empty ingredient row and one empty step row; removing the last ingredient/step row leaves one empty row; `moveStep` is a no-op at the ends and swaps otherwise
  - [x] `addTag(d, 'Breakfast ')` adds `breakfast`; adding it again is ignored; `draftFromRecipe(Pancakes)` keeps amount texts as typed and servings `'4'`
  - [x] `isDirty` is false for an untouched draft and for whitespace-only changes, true after any field change; checks pass
- Result: ✅ 4/4 goals · checks pass · 99.94% cov · 0 major, 2 minors (redundant tag trim; duplicate immutability tests) · 5e10737

### T-11 · Recipe list rows, A–Z order and count

- Owner: frontend-coder
- Depends on: T-08, T-09
- Context: SPEC US-02, §5 F-2 · LLD §3.1, §3.4, §3.5 · files: web/js/ui/screens/list-screen.js, web/css/app.css, tests/e2e/list.spec.js, tests/e2e/helpers/*, docs/wireframes/recipe-list.html
- Status: Done
- Acceptance criteria:
  - [x] Seeded with the SPEC §5 recipes, the list shows Banana Bread, Pancakes, Tomato Soup in that order with tag chips and a star (☆/★ from stored state), and `recipe-count` reads "3 recipes" ("1 recipe" for one)
  - [x] Each row title is a link to `#/recipe/<id>`; rows re-render on store change via `subscribe`
  - [x] Results region is separate from the (future) filter panel per §3.1, so later filter controls keep focus
  - [x] `tests/e2e/list.spec.js` extended for A–Z order and count passes in both projects; screenshots 1280/390 px in `.results/T-11/`
- Result: ✅ 4/4 goals · check.sh --e2e pass (20 e2e) · 0 major, 2 minors (star aria-label → T-15; href on one row) · 8b1a191

### T-12 · Recipe view (read-only, base servings)

- Owner: frontend-coder
- Depends on: T-08
- Context: SPEC US-05, §4 F-3 · LLD §4.1, §4.4, §4.5 · files: web/js/ui/screens/view-screen.js, web/css/app.css, tests/e2e/view-scale.spec.js, tests/e2e/helpers/*, docs/wireframes/recipe-view.html
- Status: Done
- Acceptance criteria:
  - [x] Opening seeded "Pancakes" shows title (`recipe-title`), "Serves 4", 4 `ingredient-line`s as typed ("200 g flour", "2 eggs", "300 ml milk", "a pinch of salt"), 4 numbered `step-line`s in order and tags `breakfast` `sweet` (`recipe-tags`)
  - [x] "Edit" (`edit-recipe`) links to `#/recipe/<id>/edit`; a back link (`back-to-list`) returns to the list; unknown id shows "Recipe not found" + "All recipes" (`not-found`)
  - [x] Two-column ingredients/steps at ≥ 800 px, single column at 390 px without horizontal overflow
  - [x] `tests/e2e/view-scale.spec.js` (open-at-base case) passes in both projects; screenshots in `.results/T-12/`
- Result: ✅ 4/4 goals + D-08 · 1 owner rework (m1 m2 m4 m5 m6) · 30 e2e pass · open: n1 duplicated Pancakes fixture in e2e helper, n2 new testids for as-built LLD · 8e87194

### T-13 · Recipe form: add a recipe

- Owner: frontend-coder
- Depends on: T-05, T-10, T-11, T-12
- Context: SPEC US-01, US-08, §4 F-1, §5 F-1 · LLD §5.1, §5.4, §5.5, §6.2, §2.4 · files: web/js/ui/screens/form-screen.js, web/js/ui/app.js, web/css/app.css, tests/e2e/add.spec.js, tests/e2e/helpers/*, docs/wireframes/recipe-form.html
- Status: Done
- Acceptance criteria:
  - [x] `#/new` shows "Add recipe" with title, servings, ingredient rows (amount/unit/name, add/remove), step rows (add/remove/up/down), tag chips (Enter or comma adds, ✕ removes) and the two help texts from §5.4
  - [x] SPEC §5 F-1: entering Pancakes with tags `Breakfast`, `sweet ` and saving opens its view with tags `breakfast` `sweet`; back on the list it appears; after `page.reload()` it is still there with all fields intact
  - [x] Empty title → "Title is required" under the title (`error-title`), nothing saved; "Toast" serves 1 with no ingredients → "Add at least one ingredient"; first invalid field focused and `aria-invalid` set
  - [x] Cancel or navigating away with changes asks "Discard changes?" (Keep editing keeps the form; Discard goes to the list); Save is disabled while saving
  - [x] `tests/e2e/add.spec.js` covers the three F-1 rows and the discard confirm, passing in both projects; screenshots in `.results/T-13/`
- Result: ✅ 5/5 goals · 1 fix round (M-1 unlabelled inputs + m-1,2,4,5,6,7,9) · 52 e2e pass · open: m-3 Save while read-only → D-11 (disable), m-8 window via ScreenContext, n-1 add.spec.js:189 test title · 35e517b

### T-05b · Store: keep the last loaded recipes when a reload fails (CR-1)

- Owner: backend-coder
- Depends on: T-05
- Context: SPEC US-08 · LLD §9.1, §9.5 · files: web/js/store/recipe-store.js, tests/unit/store/*, tests/helpers/memory-persistence.js
- Status: Done
- Acceptance criteria:
  - [x] The non-ready branch of `#load()` in `web/js/store/recipe-store.js` no longer resets the snapshot. A first load that is `unreadable`, `unavailable` or rejects still gives `list()` = `[]` and `get(id)` = `undefined`, with the §9.5 status and reason (one unit test per case)
  - [x] After a good load, a `reload()` that is `unreadable`, `unavailable` or rejects keeps the same frozen recipes in `list()`, `get(id)` still finds them, `status`/`statusReason` are set and subscribers are notified exactly once. `create`, `update`, `remove` and `toggleFavourite` then reject with `StoreReadOnlyError` and `save` is never called
  - [x] A later `reload()` returning `ok` → `ready` with the fresh data, reason `null`, notified once; returning `empty` → `ready` with `[]`; switching between `unreadable` and `unavailable` notifies; a successful write followed by a failing reload keeps the written data
  - [x] Existing store tests that expected `[]` after a failed reload are updated (not deleted); the T-04 start-up tests still pass unchanged; checks pass
- Result: ✅ 4/4 goals · 0 major · open: 2 minor test-strength notes (reload-failure test reason assertion; empty-recovery reason-null) · e104b93

## M3 · Find and favourite

### T-14 · List search, tag filter, favourites-only and no-match state

- Owner: frontend-coder
- Depends on: T-11
- Context: SPEC US-03, US-04, US-07, §4 F-2, §5 F-2 · LLD §2.1, §3.1, §3.4, §8.1 · files: web/js/ui/screens/list-screen.js, web/css/app.css, tests/e2e/list.spec.js, tests/e2e/helpers/*, docs/wireframes/recipe-list.html
- Status: Done
- Acceptance criteria:
  - [x] Typing "pan" shows Pancakes and hides Tomato Soup as you type; "b" → Banana Bread only; search box keeps focus and caret while typing
  - [x] Tag select (`tag-filter`) offers "All tags" + tags from saved recipes A–Z; `breakfast` → Banana Bread, Pancakes; back to "All tags" shows all three; search, tag and "Favourites only" combine
  - [x] "xyz" → "No recipes match your search" (`no-match-state`) + "Clear filters" (`clear-filters`) which resets all controls and focuses the search box
  - [x] Filters survive list → view → list (filter-state); sidebar filters at ≥ 800 px, stacked at 390 px
  - [x] `tests/e2e/list.spec.js` covers search "pan", "b", "xyz" and tag `breakfast`, passing in both projects; screenshots in `.results/T-14/`
- Result: ✅ 5/5 goals · 62 e2e · coverage 99.94% · review 0 major, 3 minor · 170a8eb

### T-15 · Favourite star on list and view

- Owner: frontend-coder
- Depends on: T-05b, T-12, T-14
- Context: SPEC US-07, US-08, §4 F-4, §5 F-4 · LLD §3.4, §3.5, §4.4, §4.5, §2.5 · files: web/js/ui/screens/{list-screen,view-screen}.js, web/css/app.css, tests/e2e/favourite.spec.js, tests/e2e/persistence.spec.js, tests/e2e/helpers/*
- Status: Done
- Acceptance criteria:
  - [x] Star (`favourite-toggle`, `<button aria-pressed>`) on a list row and on the view toggles favourite immediately: ★ with `aria-label="Remove from favourites"`, ☆ with `aria-label="Mark as favourite"`
  - [x] SPEC §5 F-4: star Banana Bread, tick "Favourites only" (`favourites-only`) → list shows Banana Bread only; after `page.reload()` the star is still filled
  - [x] Stars (list rows and view) and both list Add buttons (`add-recipe`, `add-first-recipe`) are disabled while `store.status !== 'ready'` and recomputed on every store notification (header included, §3.5, §4.5). Corrupt seed at start → all disabled. A rejected toggle shows the "Could not save: …" banner and the star keeps its stored state
  - [x] Cross-tab e2e in `tests/e2e/persistence.spec.js`: seed the SPEC §5 recipes, open the list, then a second page in the same context writes `{oops` to `recipe-box:collection` → all three rows stay listed (search "b" still filters), status banner shown, Add/stars disabled, stored value byte-identical. The second page then writes valid data → banner cleared, controls enabled. Same on the Pancakes view: star disabled, then enabled
  - [x] `tests/e2e/favourite.spec.js` passes in both projects; screenshots in `.results/T-15/`
- Result: ✅ 5/5 goals · 76 e2e · coverage 99.94% · review 0 major, 5 minor · fc6a73e

## M4 · Scale

### T-16 · Scaling and kitchen fractions (pure logic)

- Owner: backend-coder
- Depends on: T-03
- Context: SPEC US-06, §4 F-3, §5 F-3 · LLD §7.1, §7.2, §6.1 · files: web/js/core/scaling/*, tests/unit/core/scaling/*, tests/helpers/recipes.fixture.js
- Status: Done
- Acceptance criteria:
  - [x] `roundToQuarter`, `formatQuarter`, `scaleAmount`, `formatIngredientLine`, `parseServingsInput`, `stepServings` match §7.1; `core/scaling` imports only `core/recipe`
  - [x] Unit tests cover every §7.2 row: Pancakes 4→6 `300 g`, `3`, `450 ml`; 4→3 `150 g`, `1½`, `225 ml`; 4→1 `50 g`, `½`, `75 ml`; 4→4 as typed; salt unchanged in all; Banana Bread 8→2 `¾`, `¼ tsp`, `62½ g`; 8→1 `½` (0.375 rounds up), `¼ tsp` (never 0), `31¼ g`; `1 1/2 cup` 2→2 as typed; `½` 1→3 `1½`
  - [x] `parseServingsInput` returns previous (3) for `'0'`, `''`, `'abc'`, `'2.5'`, `'-1'` and 6 for `' 6 '`; `stepServings(1, -1)` = 1; typed `0` scales to `0`
  - [x] Checks pass
- Result: ✅ 4/4 goals · 125 tests · batch-approved early (owner) · 06c9266

### T-17 · Servings control on the recipe view

- Owner: frontend-coder
- Depends on: T-15, T-16
- Context: SPEC US-06, §4 F-3, §5 F-3 · LLD §4.1, §4.4, §4.5, §7.1 · files: web/js/ui/screens/view-screen.js, web/css/app.css, tests/e2e/view-scale.spec.js, tests/e2e/helpers/*, docs/wireframes/recipe-view.html
- Status: Done
- Acceptance criteria:
  - [x] − / number / + (`servings-dec`, `servings-input`, `servings-inc`) rescale every ingredient instantly via `formatIngredientLine`; − is disabled at 1; typing `0`, empty or `abc` keeps the previous value and blur resets the input text
  - [x] SPEC §5 F-3 in e2e: Pancakes 4→6 "300 g flour", "3 eggs", "450 ml milk", "a pinch of salt"; 4→3 "150 g", "1½", "225 ml"; 4→1 "50 g", "½", "75 ml"; Banana Bread 8→2 "¾", "¼ tsp", "62½ g"; 8→1 "½", "¼ tsp", "31¼ g"
  - [x] "Reset (4)" (`servings-reset`) and the note "Recipe saved for 4 servings; scaling is not saved." appear only while scaled; reopening the recipe or reloading shows base servings and stored data is unchanged
  - [x] `tests/e2e/view-scale.spec.js` passes in both projects; screenshots of Pancakes at 3 servings (1280/390 px) in `.results/T-17/`
  - [x] A store notification while scaled keeps the screen-local servings (§4.5). On Pancakes at 3 servings, toggling the star (or a cross-tab reload) re-renders the view still at 3 with "150 g flour", "1½ eggs", "225 ml milk"
- Result: ✅ 5/5 goals · 1 major (focus after +/−/Reset) fixed in 2 debugger rounds · 0 major on re-review, 3 minor (M4 tidy-up) · 2958941

## M5 · Edit, delete and finish

### T-18 · Edit a recipe

- Owner: frontend-coder
- Depends on: T-13
- Context: SPEC US-09, §4 F-5, §5 F-5 · LLD §5.1, §5.4, §5.5, §2.4, §2.5 · files: web/js/ui/screens/form-screen.js, web/js/ui/app.js, web/css/app.css, tests/e2e/edit.spec.js, tests/e2e/helpers/*
- Status: Done
- Acceptance criteria:
  - [x] `#/recipe/<id>/edit` shows "Edit recipe" pre-filled with every field (amounts as typed); unknown id → not-found state
  - [x] SPEC §5 F-5: Pancakes serves 4 → 6 plus tag `weekend`, Save → view shows "Serves 6" and tags `breakfast` `sweet` `weekend`, list shows the new tag, and both survive `page.reload()`; Back after save does not return to the form
  - [x] Change the title, press Cancel → "Discard changes?"; Discard → view shows the old title; Keep editing → form keeps the change; closing the tab while dirty triggers the browser's leave prompt (`beforeunload`)
  - [x] Same validation as add (empty title blocked). Save rejected by the store, i.e. `StoreReadOnlyError` (edit hash opened after a cross-tab `{oops`: form pre-filled from the kept recipe) / `RecipeNotFoundError` / write failure → banner, form stays open and dirty, stored value unchanged
  - [x] `tests/e2e/edit.spec.js` passes in both projects; screenshots in `.results/T-18/`
- Result: ✅ 5/5 goals · 0 major, 4 minor (M4 tidy-up) · D-11 + shared save-failure text + ctx beforeunload folded in · 3cbe826

### T-19 · Delete a recipe with confirm

- Owner: frontend-coder
- Depends on: T-17
- Context: SPEC US-10, §4 F-6, §5 F-6 · LLD §4.4, §4.5, §2.1, §2.5 · files: web/js/ui/screens/view-screen.js, web/css/app.css, tests/e2e/delete.spec.js, tests/e2e/helpers/*
- Status: Done
- Acceptance criteria:
  - [x] "Delete" (`delete-recipe`) on Tomato Soup opens `confirm-dialog` with "Delete 'Tomato Soup'? Are you sure?" and Cancel / Delete; focus starts on Cancel
  - [x] Cancel (and Esc) keeps the recipe and stays on the view; Delete removes it and lands on the list showing Banana Bread, Pancakes; after `page.reload()` it is still gone; Back does not reopen the deleted recipe
  - [x] Delete is disabled while `store.status !== 'ready'` and recomputed on every store notification. With the view open, a second page writing `{oops` → recipe still shown, Delete disabled; valid data written again → Delete enabled. A rejected `remove` shows the banner and stays on the view
  - [x] `tests/e2e/delete.spec.js` passes in both projects; screenshot of the dialog in `.results/T-19/`
- Result: ✅ 4/4 goals · 2 debugger rounds (M-1 vacuous Back test fixed; fixed-port server process test → OS port) · 3 minors (M5 sync / T-20) · a50003f

### T-20 · Responsive layout, accessibility pass and full e2e run

- Owner: frontend-coder
- Depends on: T-18, T-19
- Context: SPEC §7, §9, §12 · LLD §2.5, §11.6 · files: web/css/app.css, web/js/ui/**, tests/e2e/*, docs/wireframes/*.html
- Status: Done
- Acceptance criteria:
  - [x] New `tests/e2e/layout.spec.js`: on every screen (list, view, add, edit, not-found) at 390 px `document.documentElement.scrollWidth <= clientWidth` and every button/link/input is ≥ 40 px tall
  - [x] Each screen has one `<h1>`; every interactive element is a real button/link/control with its LLD `data-testid`; stars have `aria-pressed` and `aria-label`
  - [x] Screenshots of list, view (Pancakes at 3 servings), form (with a validation error) and delete dialog at 1280 and 390 px in `.results/T-20/`, side by side with the wireframe renders, with differences listed in the report
  - [x] Fix the pre-existing test bug in `tests/e2e/persistence.spec.js` "cross-tab corrupt write on the list … recover" (search filter `b` left active, so it counts 1 star instead of 3) — D-12
  - [x] `bash scripts/check.sh --e2e` passes with all specs (list, add, view-scale, favourite, edit, delete, persistence, layout) in both projects
- Result: ✅ 5/5 goals · 170 e2e pass · 0 major, 3 minor (M5 sync) · T-19 m-7 folded in · ffef845

### T-21 · Delete: already-deleted recipe counts as deleted (D-13)

- Owner: frontend-coder
- Depends on: T-19
- Context: DECISIONS D-13 · LLD §2.5, §4.5 · files: web/js/ui/screens/view-screen.js, tests/e2e/delete.spec.js
- Status: Backlog
- Acceptance criteria:
  - [ ] With the delete dialog open on Tomato Soup, a second page removes Tomato Soup; confirming Delete shows no "Could not save" banner and lands on the list (Banana Bread, Pancakes) via replace; Back does not reopen it
  - [ ] Other rejected removes (read-only store, write failure) keep the existing banner behaviour
  - [ ] T-19 m-8: e2e test for Back with the dialog open, then confirm → nothing removed
  - [ ] `bash scripts/check.sh --e2e` passes in both projects
- Result: —

## User story coverage

| Story | Tasks |
|---|---|
| US-01 Add recipe | T-03, T-05, T-10, T-13 |
| US-02 Browse list (A–Z, empty state) | T-04, T-08, T-09, T-11 |
| US-03 Search by title | T-09, T-14 |
| US-04 Filter by tag | T-09, T-14 |
| US-05 Open recipe | T-12 |
| US-06 Scale servings | T-16, T-17 |
| US-07 Favourite + "Favourites only" | T-05, T-09, T-14, T-15 |
| US-08 Data persists across restart | T-02 (fixed address), T-04, T-05b, T-06, T-08, T-13, T-15, T-18 (reload checks) |
| US-09 Edit recipe | T-03, T-05, T-10, T-18 |
| US-10 Delete with confirm | T-05, T-07, T-19 |
| US-11 One-command start | T-01, T-02, T-08 |
