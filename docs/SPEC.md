# SPEC — Recipe Box

> Written by the planner from the owner's answers, round by round. Approved before any design.
> Lines marked *(assumed)* were decided by the planner (owner chose "decide for me", or a low-risk default
> the owner can change on the spec card).

## 1. Goal
A small personal recipe box web app for one person (Jake). It replaces scattered recipes with one place to
add, edit and delete recipes (title, ingredients with amounts, steps, tags), find them again by title or tag,
open one and scale it to a different number of servings with the amounts recalculated as kitchen fractions,
and mark favourites. It runs on Jake's own computer: one command opens it in the browser. All data stays in
that browser on that computer and is still there after the app/browser/computer is restarted. There are no
accounts, no hosting, no sync and no backup.

## 2. Users
| User | What they want | How often |
|---|---|---|
| Jake (sole user, no login, one computer's browser) | Store his own recipes, find one quickly, cook from it at the right quantity | Several times a week (browse/cook); a few new recipes a month |

## 3. User stories
| ID | As a… | I want to… | So that… | Acceptance (checkable) |
|---|---|---|---|---|
| US-01 | cook | add a recipe with title, base servings, ingredients (amount + unit + name), steps and tags | it's stored for later | After saving "Pancakes" (serves 4, 4 ingredients, 4 steps, tags `breakfast`, `sweet`) it appears in the recipe list and shows all fields intact when reopened |
| US-02 | cook | browse all my recipes | I can see what I have | The list shows every saved recipe sorted A–Z by title (title + tags + favourite star); with 0 recipes it shows "No recipes yet" and an "Add your first recipe" button |
| US-03 | cook | search my recipes by title | I find one quickly | Typing "pan" shows "Pancakes" and hides "Tomato Soup"; match is case-insensitive and partial; list updates as you type |
| US-04 | cook | filter my recipes by tag | I can browse a category | Choosing tag `breakfast` shows only Banana Bread and Pancakes; clearing the tag shows all again |
| US-05 | cook | open a recipe | I can read ingredients and steps while cooking | Opening "Pancakes" shows title, servings, all ingredients with amounts, numbered steps and tags |
| US-06 | cook | scale a recipe to a different number of servings | the amounts match how many I'm feeding | Changing "Pancakes" from 4 to 3 servings shows 150 g flour, 1½ eggs, 225 ml milk, a pinch of salt; amounts are shown as kitchen fractions rounded to the nearest ¼ |
| US-07 | cook | mark / unmark a recipe as favourite | my go-to recipes are easy to find | Toggling the star on "Banana Bread" shows it as favourite in the list; "Favourites only" shows just Banana Bread; state survives restart |
| US-08 | cook | have my data persist locally | I never lose recipes on restart | Add a recipe, close the browser and restart the computer, run the start command again: recipes and favourites still there |
| US-09 | cook | edit any field of a recipe | I can fix mistakes | Editing "Pancakes" to serve 6 and adding tag `weekend` then saving shows the new values in the view and list, also after restart |
| US-10 | cook | delete a recipe after confirming | I can remove old ones without accidents | Choosing Delete on "Tomato Soup" asks "Delete 'Tomato Soup'? Are you sure?"; Cancel keeps it; Delete removes it from the list permanently |
| US-11 | cook | start the app with one command | I can open it quickly without hosting anything | Running the one documented start command on the owner's computer opens the recipe list in the default browser, with no internet connection needed |

## 4. Main flows
### F-0 · Start the app (US-11, US-08)
1. Run the one start command (documented in the README) on the owner's computer.
2. The default browser opens on the recipe list, always at the same local address, so previously saved recipes are found.
- Errors / edge cases:
  - One-time setup steps (if any) are documented in the README; day-to-day use is only the one command.
  - Closing the command window stops the app; recipes stay saved and appear again on the next start *(assumed)*.
  - Running the command when the app is already running opens the browser on the running app (or shows a clear message saying it's already running) instead of failing silently *(assumed)*.

### F-1 · Add a recipe (US-01, US-08)
1. From the recipe list, choose "Add recipe".
2. Enter title, base servings, ingredient rows (amount, unit, name), step rows, tags.
3. Save → the new recipe's view opens and it is stored locally.
- Errors / edge cases:
  - Title empty → cannot save, message "Title is required".
  - Servings must be a whole number ≥ 1 → otherwise "Servings must be 1 or more".
  - Ingredient amount may be a whole number, decimal or fraction (2, 0.5, ½, 1½); an ingredient without a number ("a pinch of salt", "salt to taste") is allowed and never scaled.
  - At least 1 ingredient and 1 step required → otherwise "Add at least one ingredient" / "Add at least one step".
  - Duplicate titles are allowed (two "Pancakes" can exist).
  - Tags are lower-cased and trimmed; duplicates within a recipe are ignored.
  - Cancel or leaving the form with unsaved changes → "Discard changes?" confirm (Keep editing / Discard).
  - Ingredient rows can be added and removed; step rows can be added, removed and moved up/down.

### F-2 · Browse, search and filter (US-02, US-03, US-04, US-07)
1. Open the app → recipe list, all recipes sorted by title A–Z.
2. Type in the search box → list narrows by title as you type.
3. Pick one tag (and/or tick "Favourites only") → list narrows further; search, tag and favourites combine (all must match).
- Errors / edge cases: no matches → "No recipes match your search" with a "Clear filters" button; no recipes at all → empty state "No recipes yet" with "Add your first recipe".

### F-3 · Open and scale (US-05, US-06)
1. Click a recipe in the list → recipe view at its base servings.
2. Change servings with − / + or by typing a whole number → every numeric amount is multiplied by new ÷ base servings.
3. Amounts are shown as kitchen fractions rounded to the nearest ¼ (whole numbers plus ¼, ½, ¾), e.g. 1½ eggs, 225 ml.
4. Scaling is view-only: the saved recipe keeps its base servings; reopening the recipe shows base servings again. A "Reset" link returns to base servings.
- Errors / edge cases:
  - Servings < 1, empty or non-numeric → not accepted, previous value kept; − is disabled at 1.
  - Non-numeric amounts ("a pinch", "to taste") stay unchanged.
  - A non-zero amount that would round to 0 is shown as ¼ (never 0).
  - Exactly halfway between two quarters rounds up (0.375 → ½).
  - The ¼ rounding also applies to g/ml (62½ g), confirmed by the owner.

### F-4 · Favourite (US-07)
1. Click the star on a list row or on the recipe view → toggles favourite, saved immediately; the star is filled (★) when favourite and empty (☆) when not.

### F-5 · Edit (US-09)
1. On the recipe view choose "Edit" → the recipe form opens pre-filled with every field.
2. Change any field → Save → the recipe view shows the updated recipe; Cancel → back to the view unchanged (with the "Discard changes?" confirm if anything was changed).
- Errors / edge cases: same validation as F-1.

### F-6 · Delete (US-10)
1. On the recipe view choose "Delete" → a confirm dialog "Delete 'Tomato Soup'? Are you sure?" with Cancel / Delete.
2. Delete → recipe removed permanently, back to the list; Cancel → stays on the view, nothing changed.
- Errors / edge cases: there is no undo and no backup (owner's choice).

## 5. Inputs and outputs (concrete examples)
| Flow | Example input | Expected output |
|---|---|---|
| F-0 | Run the start command with no internet connection | Browser opens on the recipe list showing previously saved recipes |
| F-1 | Title "Pancakes", serves 4; 200 g flour, 2 eggs, 300 ml milk, a pinch of salt; steps "Whisk flour and salt", "Beat in eggs and milk", "Rest 10 min", "Fry in a hot pan"; tags `Breakfast`, `sweet ` | "Pancakes" view opens with tags `breakfast` `sweet`; it appears in the list |
| F-1 | Title left empty, Save | Not saved; "Title is required" under the title field |
| F-1 | Title "Toast", serves 1, no ingredients, Save | Not saved; "Add at least one ingredient" |
| F-2 | Recipes: Pancakes (`breakfast`, `sweet`), Tomato Soup (`lunch`, `vegetarian`), Banana Bread (`breakfast`, `baking`); open app | Banana Bread, Pancakes, Tomato Soup (A–Z) |
| F-2 | Search "b" | Banana Bread only (title match) |
| F-2 | Tag `breakfast` | Banana Bread, Pancakes (A–Z) |
| F-2 | Search "xyz" | "No recipes match your search" + "Clear filters" |
| F-3 | Pancakes, servings 4 → 6 | 300 g flour, 3 eggs, 450 ml milk, a pinch of salt (unchanged) |
| F-3 | Pancakes, servings 4 → 3 | 150 g flour, 1½ eggs, 225 ml milk, a pinch of salt |
| F-3 | Pancakes, servings 4 → 1 | 50 g flour, ½ egg, 75 ml milk, a pinch of salt |
| F-3 | Banana Bread (serves 8: 3 bananas, 1 tsp baking soda, 250 g flour), servings 8 → 2 | ¾ banana, ¼ tsp baking soda, 62½ g flour |
| F-3 | Banana Bread, servings 8 → 1 | ½ banana (0.375 rounds up), ¼ tsp baking soda (0.125, never 0), 31¼ g flour |
| F-4 | Star on Banana Bread, then "Favourites only" | List shows Banana Bread only |
| F-5 | Edit Pancakes: serves 4 → 6, add tag `weekend`, Save | View shows serves 6, tags `breakfast` `sweet` `weekend` |
| F-5 | Edit Pancakes, change title, press Cancel | "Discard changes?"; Discard → view shows the old title |
| F-6 | Delete Tomato Soup → confirm Delete | List shows Banana Bread, Pancakes |

## 6. Data
- What is stored: recipes (title, base servings, ingredients [amount, unit, name], ordered steps, tags, favourite flag).
- Where it comes from: typed in by the owner only; no import, export or backup (owner's choice: accepts the risk of losing data if browser data is cleared).
- Where it lives: inside one browser on one computer; survives closing the browser, stopping the app and restarting the computer; not shared with other browsers or devices.
- Rough volume: tens to a few hundred recipes, text only, no images.
- Retention: kept until the owner deletes them (or clears the browser's site data).

## 7. Screens (UI projects)
| Screen | Purpose | Key elements | Wireframe |
|---|---|---|---|
| recipe-list | Browse, search, filter | Search box, tag filter, "Favourites only" toggle, recipe rows (title, tags, star), "Add recipe" button, empty and no-match states | docs/wireframes/recipe-list.html (source) with renders recipe-list.png (390 px) and recipe-list-desktop.png (1280 px) |
| recipe-view | Read and scale | Title, star, servings control (− / number / +, Reset), scaled ingredient list, numbered steps, tags, Edit and Delete buttons, delete confirm dialog | docs/wireframes/recipe-view.html (source) with renders recipe-view.png (390 px) and recipe-view-desktop.png (1280 px) |
| recipe-form | Add and edit | Title, servings, ingredient rows (amount, unit, name, add/remove), step rows (add/remove/move up/down), tags input, Save / Cancel, validation messages, discard-changes confirm | docs/wireframes/recipe-form.html (source) with renders recipe-form.png (390 px) and recipe-form-desktop.png (1280 px) |

## 8. Integrations
- None: no external services, accounts or API keys.

## 9. Non-functional
- Scale / load: not a concern (one user, up to a few hundred text-only recipes).
- Latency: search and filter results update as you type; scaling updates instantly when servings change; the app opens in a few seconds after the start command *(assumed)*.
- Offline: fully works without an internet connection (runs on the owner's computer, no online services).
- Security & privacy: single user, no login; recipe data never leaves the computer; the app is reachable only from the owner's own computer, not from other devices on the network *(assumed)*.
- Cost limits: zero running cost (no hosting, accounts or paid services).
- Platforms/devices: one current desktop browser (Chrome, Edge or Firefox) on one computer (Windows); desktop layout is primary, and the layout stays usable in a narrow window (390px) *(assumed)*.

## 10. Constraints
- Stack preferences or bans: none; the architect proposes the stack and the owner approves it at the LLD step.
- Deadline: none *(assumed)*: change on the spec card if there is one.
- Deployment target: runs locally on the owner's computer, started with one command that opens it in the browser; no hosting.
- Budget: zero
- Repo: AbrahamLinksus/recipe-box (public)

## 11. Non-goals (explicitly out of v1, confirmed by the owner)
- Export / import / backup of recipes
- Accounts, multiple users, sharing, or sync across browsers/devices
- Hosting / putting the app online
- Importing recipes from websites / URLs
- Photos or images on recipes
- Unit conversion (e.g. cups ↔ grams)
- Nutrition info
- Meal planning
- Shopping lists
- Printing / print layout

## 12. Definition of done
To confirm on the spec card:
- [ ] I run one command and the recipe box opens in my browser
- [ ] I can add the "Pancakes" example and see it in the list
- [ ] Searching "pan" and filtering by tag `breakfast` find it
- [ ] Opening it and changing 4 → 3 servings shows 150 g flour, 1½ eggs, 225 ml milk
- [ ] I can star a recipe and see only favourites with "Favourites only"; I can edit a recipe, and delete one after an "Are you sure?" confirm
- [ ] After restarting the computer and running the command again, all recipes, edits and favourites are still there

## Open questions
- None. Remaining items for the spec card: confirm the deadline assumption (none) and the done list.
