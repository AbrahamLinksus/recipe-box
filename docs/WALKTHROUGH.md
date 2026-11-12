# Codebase walkthrough — Recipe Box

> A guided tour so the owner can understand, own and explain this code. Written at handover
> by the architect. Line numbers are from the handover commit; if they drift, search for the
> function name. The as-built design is in `docs/ARCHITECTURE.md`; the detailed contracts are in `docs/LLD.md`.

## 1. Read these first (in order)
1. `docs/SPEC.md`: what the app must do (flows F-0..F-6, the exact example data in §5).
2. `docs/CONVENTIONS.md`: the layer rules, SOLID rules and size limits every file follows.
3. `server/main.js`: the server's composition root, 50 lines. Shows every server dependency being built and injected into `startOrReuse`.
4. `server/launcher.js`: the "start, or reuse the running copy, or explain the port problem" logic (`attempt`, `startOrReuse`, `exitCodeFor`). Pure decision code; all I/O is injected.
5. `web/index.html` and `web/js/main.js`: the page skeleton (`#banner`, `#app`, `#confirm-dialog`) and the browser's composition root, 15 lines.
6. `web/js/store/ports.js` and `web/js/store/recipe-store.js`: the `CollectionPersistence` interface and `RecipeStore`, the one gateway to data. Understand `#enqueue`, `#write` and `#load` and you understand the data rules (save before commit, read-only mode).
7. `web/js/persistence/local-storage-persistence.js` and `collection-codec.js`: how the store's port is implemented on `localStorage`, and how unreadable data is detected and protected.
8. `web/js/ui/app.js` and `web/js/ui/router.js`: how screens are chosen and what every screen receives (`ScreenContext`, typedefs at the top of `router.js`).
9. One screen end to end: `web/js/ui/screens/form-screen.js` with `web/js/ui/form-save.js` (traced below), then `screens/view-screen.js` and `screens/list-screen.js`.
10. `web/js/core/`: pure rules. `core/recipe/validation.js` (`validateDraft`, `assertRecipeInput`), `core/scaling/fractions.js` + `scaling.js` (¼ rounding), `core/search/search.js`.

## 2. Follow one request end to end
Trace: **the owner adds a recipe and clicks Save** (F-1). The same path serves edit (F-5); only the store call differs.

**Boot (once per page load)**
1. `web/index.html:20` loads `/js/main.js` as a module; `server/static-handler.js:136` `createRequestHandler` served it (host check `:143`, method check `:147`, file `:160`).
2. `web/js/main.js:5-9` builds `LocalStoragePersistence` with `window.localStorage`, `navigator.storage` and `window`; `:10` passes it into `new RecipeStore(persistence)`; `:11` `await store.init()`.
3. `web/js/store/recipe-store.js:73` `init()` runs `#load()` (`:255`) on the chain, which calls `persistence.load()` → `web/js/persistence/local-storage-persistence.js:56` → `decodeCollection` (`collection-codec.js:96`). Status becomes `ready` (or read-only), then `:76` starts `persistence.watch(...)` for other tabs.
4. `web/js/main.js:15` `createApp({ root, store, window }).start()` → `web/js/ui/app.js:101-107`: global error listeners, status banner sync (`createStatusSync`, `:33`), `router.start()`.
5. `web/js/ui/router.js:117-121` `start()` parses the current hash and calls `onRoute` → `app.js:82` `mount(route)` looks the screen up in `SCREENS` (`app.js:20-25`) and calls it with the `ScreenContext` built at `app.js:89`.

**Open the form**
6. The list's "+ Add recipe" button, `web/js/ui/screens/list-screen.js:95`, calls `router.navigate({ name: 'new' })`.
7. `router.js:129` sets `location.hash = '#/new'`; the `hashchange` handler `onHashChange` (`router.js:97`) asks the current screen `canLeave()` (`:106`, the list has none, so yes) and calls `onRoute` (`:110`).
8. `app.js:83` unmounts the list (its `store.subscribe` unsubscribe), `:85-91` mounts `mountFormScreen`.
9. `web/js/ui/screens/form-screen.js:90` `mountFormScreen`: `:94` initial draft (`emptyDraft()` from `web/js/ui/form-model.js:26`; edit uses `draftFromRecipe`), `:98` `createFormView` builds the `<form>`, `:103` `createSaveSync` (Save disabled unless `store.status === 'ready'`), `:104` `createSave`, `:106-109` the form's `submit` listener, `:111` subscribes `syncSave` to the store, `:112` registers `beforeunload` through `ctx.onBeforeUnload`, `:127` exposes `canLeave` (the "Discard changes?" dialog).

**Typing**
10. Each field edits the draft through pure functions in `web/js/ui/form-model.js` (`setIngredientField`, `addStepRow`, `moveStep`, `addTag`…); the DOM sections are `form-top.js:35` `topFields`, `form-ingredients.js:75`, `form-steps.js:61`, `form-tags.js:54`.

**Save**
11. Clicking Save submits the form → `form-screen.js:108` `void save()` → `web/js/ui/form-save.js:46`.
12. `form-save.js:47` returns early if a save is pending or the store is not `ready`. `:48` takes `view.currentDraft()` (includes uncommitted tag text). `:49` `validateDraft(draft)` → `web/js/core/recipe/validation.js:49` (trims, parses amounts with `parseAmount`, normalises tags, collects every error). `:50` on errors: `view.render(errors)`, which rebuilds the form with inline messages and focuses the first `aria-invalid` field (`form-screen.js:64-72`). Nothing is saved.
13. Valid: `form-save.js:51-52` marks saving and disables Save; `:54-56` calls `store.create(value)` (or `store.update(id, value)` when editing).
14. `recipe-store.js:95` `create` → `:96` `#snapshotInput` (`:201`): `assertRecipeInput` + `structuredClone`, at call time. `:97` `#write(plan)` (`:213`) → `#enqueue` (`:189`) puts it on the serial chain.
15. Inside the chain: `:215` read-only guard (`StoreReadOnlyError`), `:216` builds the next array (new id from `crypto.randomUUID()`, timestamps), `:217` `await this.#persistence.save(next)`.
16. `local-storage-persistence.js:65` `save`: `:68` refuses if the stored value is foreign (`isForeignData`, `:26`), `:74` `setItem(STORAGE_KEY, encodeCollection(recipes))` (`collection-codec.js:8`), `:76` maps a quota error to `PersistenceWriteError('quota')`.
17. Back in the store: `:218` commits the frozen snapshot, `:219` `#notify()` (`:278`) calls every subscriber (status banner sync in `app.js`, the form's `syncSave`). `:220` resolves with the new recipe.
18. `form-save.js:57` marks the form saved (turns off the dirty guard), `:58` clears a banner the form showed earlier, `:59` `router.navigate({ name: 'view', id }, { replace: true })`.
19. `router.js:124-127`: `replaceState` (so Back does not return to the form) and `onRoute` directly → `app.js:83` unmounts the form (`form-screen.js:126` runs its unsubscribe and `beforeunload` remover) → `mountViewScreen` (`web/js/ui/screens/view-screen.js:175`) → `render()` (`:189`) reads `store.get(id)` (`:191`) and shows the recipe at base servings.

**If the save fails:** the store rejects (snapshot unchanged) → `form-save.js:60-61` `showFailure` → a `ValidationError` with field errors is rendered inline; anything else goes through `saveFailureMessage` (`web/js/ui/save-failure.js:14`) to `banner.show('error', …)`; `StoreReadOnlyError` shows nothing extra because the status banner already explains. The form stays open and dirty.

## 3. How the layers fit
| Folder | Layer | May import | Must not import |
|---|---|---|---|
| `web/js/core/` (`recipe/`, `scaling/`, `search/`) | Pure domain logic | only `core/` (`scaling/` and `search/` may use `recipe/`) | DOM, storage, `store/`, `persistence/`, `ui/` |
| `web/js/store/` | Application state (`RecipeStore`, port, errors) | `core/` | `ui/`, `persistence/`, `main.js` |
| `web/js/persistence/` | Adapter implementing the port | `store/ports.js`, `store/errors.js`, `core/recipe` types | `ui/`, rest of `store/`, `main.js` |
| `web/js/ui/` | Screens and widgets (DOM) | `store/`, `core/` | `persistence/`, `main.js`, `localStorage` |
| `web/js/main.js` | Browser composition root | everything | — |
| `server/` | Launcher + static server (Node) | Node built-ins, other `server/` files | anything in `web/` |

- Dependency direction: `ui → store → core`; `persistence` points **up** at the store's port (`web/js/store/ports.js`), so the store never knows about `localStorage` (dependency inversion).
- Wiring happens only in the two composition roots: `web/js/main.js` (persistence → store → app) and `server/main.js` (config, logger, handler, `createListen`, `probeExistingInstance`, `createBrowserOpener` → `startOrReuse`). Inside the UI, `web/js/ui/app.js` builds the shared services (router, dialogs, banner, filter state, `onBeforeUnload`) and hands them to each screen as `ScreenContext`.
- Enforcement: `.dependency-cruiser.cjs` (run by `npm run deps`) fails the build on a wrong import; `eslint.config.js` forbids browser globals in `core/` and storage globals outside `main.js`.

## 4. How to extend it
| I want to… | Touch these files | Pattern to copy |
|---|---|---|
| add an endpoint | `server/static-handler.js` (`handle` inside `createRequestHandler`), `tests/unit/server/static-handler.test.js`; LLD §1.2 contract table | The health route: a path constant like `HEALTH_PATH`, matched after the host and method checks, answered with `send(res, {...})`. Writes would need a method other than GET/HEAD and a CSRF/Origin check (see the unbuilt design in LLD §10.6). |
| add a screen | `web/js/ui/router.js` (new `Route` member + `parseRoute`/`routeToHash`), new `web/js/ui/screens/<name>-screen.js`, `web/js/ui/app.js` (`SCREENS` map), `tests/unit/ui/router.test.js`, a new `tests/e2e/<name>.spec.js` | `screens/not-found-screen.js` (smallest) or `screens/view-screen.js`: export one `MountScreen`, build DOM with `h()` from `dom.js`, `store.subscribe(rerender)` and return its unsubscribe as `unmount`, re-render through `renderKeepingFocus`, disable write controls unless `store.status === 'ready'`, give every control a `data-testid` and the screen one `<h1>` |
| swap a provider (e.g. storage location) | new `web/js/persistence/<name>-persistence.js`, `web/js/main.js` (construct it instead), `tests/unit/persistence/<name>-persistence.test.js` | `LocalStoragePersistence`: implement the four port methods of `CollectionPersistence` (`load`, `save`, `watch`, `requestDurability`), reuse `encodeCollection`/`decodeCollection`, reject only with `PersistenceWriteError`. LLD §10.6 already designs a file-on-disk variant. The store and UI do not change. Adding a package is an owner decision. |
| add a recipe field | `web/js/core/recipe/types.js`, `validation.js`, `web/js/persistence/collection-codec.js` (lenient check), `web/js/ui/form-model.js`, a form section, `view-screen.js` | Treat it as a schema change: keep old data readable (codec), bump `SCHEMA_VERSION` only with an upgrade path (LLD §10.5) |
| add a pure rule (e.g. a servings cap) | `web/js/core/scaling/servings.js` + `tests/unit/core/scaling/*.test.js` | Existing `parseServingsInput` / `stepServings` and their contract-table tests |

## 5. Tests
- **Unit tests** (`node:test` + `node:assert/strict`) live in `tests/unit/<area>/`, mirroring the source: `core/` (amount, tags, validation, scaling, search), `persistence/` (codec, adapter, no-write-on-load, form→storage round trip), `server/` (config, launcher, log, static handler, a real `server/main.js` process), `store/` (read side, writes, races, listeners, reload failure), `ui/` (router, form-model, focus-keeper, save-failure, filter-state, dom, dialogs, banner, index.html). 29 suites.
- **Fakes are injected through the interfaces, never by patching modules:**
  - `tests/helpers/memory-persistence.js` `MemoryPersistence` implements `CollectionPersistence`; tests set `result` / `failWith` and call `triggerExternalChange()` to simulate another tab (see `tests/unit/store/recipe-store.test.js:13-16`).
  - `tests/helpers/fake-storage.js` `FakeStorage` is an in-memory `Storage`; set `failGet` / `failSet` (e.g. `namedError('QuotaExceededError')`) to make reads or writes throw, for `LocalStoragePersistence`.
  - `tests/helpers/recipes.fixture.js` holds the SPEC §5 recipes (`PANCAKES`, `TOMATO_SOUP`, `BANANA_BREAD`, `ALL_RECIPES`).
  - `tests/unit/server/launcher.test.js` `harness(...)` passes scripted fake `listen` / `probe` / `openBrowser` / `log` into `startOrReuse`.
- **E2E tests** (Playwright) live in `tests/e2e/*.spec.js`, one per flow: `list`, `add`, `view-scale`, `favourite`, `edit`, `delete`, `persistence`, `layout`. `tests/e2e/playwright.config.js` starts its own `node server/main.js` on port 47399 with `RECIPE_BOX_NO_OPEN=1` (never the owner's 47321) and runs every spec in a `desktop` (1280×800) and a `narrow` (390×844) project. Data is seeded before page load with `seedRaw` (`tests/e2e/helpers/seed.js`), `seedCollection` (`helpers/collection.js`) or `seedPancakes` (`helpers/recipes.js`). Selectors use `data-testid` only.
- **Run things:**
  - everything: `bash scripts/check.sh` (add `--e2e` for the browser tests);
  - all unit tests fast, no coverage: `npm run test:nocov`;
  - one unit file: `node --test tests/unit/store/recipe-store.test.js`;
  - one unit test by name: `node --test --test-name-pattern="init ok" tests/unit/store/recipe-store.test.js`;
  - one e2e file: `npm run test:e2e -- delete.spec.js`; one project only: add `--project=narrow`.
- CI (`.github/workflows/ci.yml`, added at handover) runs two jobs on every push and pull request: `check`
  (`npm ci`, then `bash scripts/check.sh`) and `e2e` (`npm ci`, `npx playwright install --with-deps chromium`,
  then `bash scripts/check.sh --e2e`).

## 6. Talking points
**The 3 most interesting design decisions**
1. **No build, no runtime packages.** The browser runs the source files as written and the server is eight small files on Node built-ins (`server/`), so "one command" needs nothing but Node. Type safety still comes from JSDoc checked by `tsc --noEmit` in strict mode. Trade-off: no JSX/components framework, so the UI is hand-built with `h()` and explicit re-renders (`focus-keeper.js` exists because of that).
2. **Storage behind a port, with pessimistic writes.** `RecipeStore` only knows `CollectionPersistence` (`web/js/store/ports.js`). Every write is queued (`#enqueue`), saved first, and only then committed and announced (`#write`). The UI never shows a change that was not stored. Trade-off: the star does not flip until the save resolves (not noticeable with `localStorage`); a hung save would stall the queue.
3. **Never overwrite data you cannot read.** A stored value that is not JSON, has an unknown version or an invalid recipe puts the store in read-only mode with a banner; every write control is disabled live; and the adapter double-checks before each `setItem` (`isForeignData`). Reads use a deliberately lenient check, writes a strict one. Trade-off: more states to test (`tests/unit/store/recipe-store-reload-failure.test.js`, `tests/e2e/persistence.spec.js`).

**One problem hit during the build and how it was solved**
- At milestone M2 (T-12) the reviewer found that the LLD contradicted itself: the store rule (§9.5) emptied the list whenever a cross-tab reload returned unreadable data, while the list and view sections (§3.5, §4.5) assumed the recipes stayed visible. The owner chose to keep the last loaded recipes visible, read-only (D-09), which became change request CR-1: `#load()` in `recipe-store.js` no longer clears `#recipes` on a failed load, every screen recomputes its write controls on each store notification, and the form's Save follows the status live (D-11, `createSaveSync`). It is covered by one unit test per row of the LLD §9.5 table and by the cross-tab e2e tests in `persistence.spec.js`, `edit.spec.js` and `delete.spec.js`.

**What I'd do next with more time**
- Work through the tidy-up list (`docs/ARCHITECTURE.md` §9, `docs/LLD.md` "Known deferred minors"): star in-flight guard and banner clearing, servings cap, a unit test for `form-save.js` and `restoreFocus`, a dedicated delete-failure text (D-13), separate banner slots for status and generic errors.
- Give e2e a free port per run so parallel runs do not clash.
- The owner's biggest real-world risk is data loss (no backup by SPEC choice): an export/import, or the file-on-disk persistence already designed in LLD §10.6, would be the first feature to propose.
