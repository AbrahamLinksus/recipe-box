# Recipe Box

A small personal recipe box that runs on your own computer. It keeps your recipes in your browser, and nothing is sent anywhere.

> **Status: milestone M4 (scale and edit).** You can add a recipe, see all your recipes A–Z, open one to read it, scale its servings, edit it, search by title, filter by tag, show only favourites, and mark recipes as favourites. Deleting a recipe comes in a later milestone.

## Requirements

- Windows 10 or 11
- Node.js 24 or newer (from https://nodejs.org)
- Microsoft Edge, only needed for the browser tests

## How to run

1. Open a terminal in the project folder (the folder that contains this README).
2. Run `npm ci` once. It installs the development tools used by the checks. The app itself needs no install.
3. Start the app, either by running `npm start` or by double-clicking `start.cmd`.
4. Your browser opens `http://127.0.0.1:47321/` on the recipe list. The window shows:
   `Recipe Box is running at http://127.0.0.1:47321/ - opening your browser. Close this window to stop it.`
5. To stop the app, close that window (or press Ctrl+C in a terminal).

If the app is already running and you start it again, the browser simply opens the running copy.

Always use the address `http://127.0.0.1:47321/`. The browser treats `localhost:47321` as a different address with its own empty storage.

## Using Recipe Box

- **Add a recipe:** click **+ Add recipe** (or **Add your first recipe** when the list is empty). Enter a title, the number of servings (a whole number, 1 or more), ingredient rows, step rows and tags, then click **Save**. The new recipe opens in its view.
  - A title, at least one ingredient and at least one step are required.
  - Tags are saved in lower case, and a tag repeated in the same recipe is ignored.
  - If you leave the form with unsaved text, Recipe Box asks "Discard changes?".
- **List:** the front page shows your recipes sorted A–Z by title, each with its tags, a favourite star and a count (for example "3 recipes").
- **Search:** type in the search box to narrow the list by title as you type. Matching ignores upper and lower case and finds part of a title, so "pan" finds "Pancakes".
- **Tag filter:** choose a tag from the tag menu (**All tags** shows everything) to see only recipes with that tag.
- **Favourites only:** tick **Favourites only** to see only your favourite recipes.
- **Combined filters:** search, tag and Favourites only work together, and a recipe must match all of them. If nothing matches, the list says "No recipes match your search". Click **Clear filters** to show all recipes again.
- **Favourites:** click the star beside a recipe in the list, or beside its title on the recipe page, to mark it (★) or unmark it (☆). The change is saved straight away and is still there after a restart.
- **Filters and navigation:** the search text, tag and Favourites only setting stay the same when you open a recipe and go back with **← All recipes**. They are not saved, so reloading the page shows all recipes again.
- **Open:** click a recipe's title to read its servings, ingredients and numbered steps. Use **← All recipes** to go back.
- **Scale the servings:** open a recipe and use **−** and **+** (or type a whole number) in the servings box. Every amount is recalculated for the new number of servings and shown as a kitchen fraction rounded to the nearest ¼ (for example 1½ eggs). A value below 1, or text that is not a whole number, is not accepted and the previous number stays. **−** is disabled at 1. Click **Reset** to go back to the recipe's own servings.
  - Scaling is not saved. Reopening the recipe shows its own servings again.
- **Edit:** on a recipe's page, click **Edit**. The form opens filled in with the recipe. Change any field, then click **Save** to see the updated recipe, or **Cancel** to go back without saving. The same checks as for a new recipe apply.
  - If you have changed something, Recipe Box asks "Discard changes?" before it leaves the form. Closing the browser tab with unsaved changes also shows the browser's own leave-page prompt.
- **Not yet available:** deleting a recipe.

**Read-only banner.** If Recipe Box cannot read your saved recipes, a banner at the top says that they could not be read, so Recipe Box will not change them, and that nothing has been deleted. Recipe Box keeps showing the recipes it had last. While the banner is shown, a new recipe cannot be saved, a recipe cannot be edited or saved, and the favourite stars and **Edit** are disabled. Changing the servings still works, because it is not saved. A second banner, "This browser is blocking storage for Recipe Box", means the browser will not let the app use its storage at all, and the same controls are disabled.

## Where your recipes are stored

- Recipes are saved in the storage of your browser, for the address `http://127.0.0.1:47321/`. They are not saved in a file.
- Use the same browser every time. Another browser cannot see them.
- There is no backup and no export. Clearing the browser's site data for this address deletes all your recipes permanently.
- Recipes stay saved when you close the browser, stop the app or restart the computer.

## Port problems

The app always uses port 47321 on purpose. Your recipes are tied to the address `http://127.0.0.1:47321/`, so the app never switches to another port.

If you see this message:

> Port 47321 is used by another program, so Recipe Box cannot start. Close that program and run the command again (see README "Port problems").

another program on your computer is already using port 47321. Close that program and run `npm start` (or double-click `start.cmd`) again. If you are not sure which program it is, restart the computer and try again.

If you see this message:

> Windows does not allow Recipe Box to use port 47321 (reserved port range). See README "Port problems".

Windows reserves some port ranges for itself. To list them, run `netsh interface ipv4 show excludedportrange protocol=tcp` in Command Prompt. If 47321 falls inside a listed range, Recipe Box cannot run on this computer until that range changes.

## How to test

Run these from the project folder in Git Bash, after `npm ci`:

- `bash scripts/check.sh` runs lint, formatting, type checks, layer rules, and the unit tests with coverage. It must pass.
- `bash scripts/check.sh --e2e` also runs the browser tests in Microsoft Edge.
- `CHECK_NO_COVERAGE=1 bash scripts/check.sh` is the same as the first command but skips only the coverage thresholds.

## Project layout

- `server/`: the start-up program. It serves the app on 127.0.0.1 and opens the browser.
- `web/`: the app itself, which runs in the browser (HTML, CSS and JavaScript).
- `tests/`: the automated tests (unit tests and browser tests).
- `scripts/`: `check.sh` (runs all checks) and `screenshot.mjs` (takes screenshots of the running app).
- `docs/`: the spec, the design (LLD) and the coding conventions. Start with `docs/SPEC.md`.
- `.githooks/`: the git pre-commit hook, which runs the lint, format, type and layer checks before each commit.
- `.devteam/`: settings for the AI team tooling. You do not need it to run the app.
