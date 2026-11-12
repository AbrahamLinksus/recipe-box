/**
 * Focus rules for a re-render, keyed by the `data-testid` of the focused control: after the
 * re-render focus returns to the same control (same `data-recipe-id`, if any), or, when it is
 * gone or disabled, to the control with the fallback test id (`null` = no fallback).
 * @typedef {Record<string, string | null>} FocusTargets
 */

/**
 * @param {HTMLElement} region
 * @param {string} testid
 * @param {string | undefined} recipeId
 * @returns {HTMLElement | null} the first enabled match
 */
function findEnabled(region, testid, recipeId) {
  for (const el of region.querySelectorAll(`[data-testid="${testid}"]`)) {
    if (
      el instanceof HTMLElement &&
      el.dataset.recipeId === recipeId &&
      !el.hasAttribute('disabled')
    ) {
      return el;
    }
  }
  return null;
}

/**
 * @typedef {{ testid: string, recipeId: string | undefined, text: string | null,
 *   caret: number | null }} FocusSnapshot
 */

/**
 * @param {HTMLElement} region
 * @param {FocusTargets} targets
 * @returns {FocusSnapshot | null} the focused control, when `targets` has a rule for it
 */
function snapshotFocus(region, targets) {
  const active = region.ownerDocument.activeElement;
  if (!(active instanceof HTMLElement) || !region.contains(active)) return null;
  const testid = active.dataset.testid;
  if (!testid || !Object.hasOwn(targets, testid)) return null;
  const input = active instanceof HTMLInputElement ? active : null;
  return {
    testid,
    recipeId: active.dataset.recipeId,
    text: input ? input.value : null,
    caret: input ? input.selectionStart : null,
  };
}

/**
 * Runs a re-render that rebuilds `region` and gives focus back as `targets` says, so keyboard
 * users keep their place. A focused text input also keeps its typed text and caret.
 * @param {HTMLElement} region
 * @param {() => void} render
 * @param {FocusTargets} targets
 */
export function renderKeepingFocus(region, render, targets) {
  const before = snapshotFocus(region, targets);
  render();
  if (!before) return;
  const fallback = targets[before.testid];
  const next =
    findEnabled(region, before.testid, before.recipeId) ??
    (fallback ? findEnabled(region, fallback, undefined) : null);
  if (!next) return;
  next.focus();
  if (!(next instanceof HTMLInputElement) || before.text === null) return;
  next.value = before.text;
  if (before.caret !== null) next.setSelectionRange(before.caret, before.caret);
}
