import { h } from './dom.js';
import { saveFailureMessage } from './save-failure.js';

const TOGGLE = 'favourite-toggle';

/**
 * The star button. Its look always comes from the stored recipe (no optimistic change), so a
 * rejected toggle leaves it as stored. Disabled while the store cannot save.
 * @param {import('../core/recipe/types.js').Recipe} recipe
 * @param {import('../store/recipe-store.js').RecipeStore} store
 * @param {import('./banner.js').Banner} banner
 * @returns {HTMLElement}
 */
export function favouriteToggle(recipe, store, banner) {
  const on = recipe.favourite;
  async function onClick() {
    try {
      await store.toggleFavourite(recipe.id);
    } catch (err) {
      const message = saveFailureMessage(err);
      if (message) banner.show('error', message);
    }
  }
  return h('button', {
    type: 'button',
    class: 'star',
    'data-testid': TOGGLE,
    'data-recipe-id': recipe.id,
    'aria-pressed': on ? 'true' : 'false',
    'aria-label': on ? 'Remove from favourites' : 'Mark as favourite',
    disabled: store.status !== 'ready',
    onclick: onClick,
    text: on ? '★' : '☆',
  });
}

/**
 * Runs a re-render and gives focus back to the star of the same recipe if it had focus,
 * so keyboard users can keep toggling.
 * @param {HTMLElement} region
 * @param {() => void} render
 */
export function renderKeepingToggleFocus(region, render) {
  const active = region.ownerDocument.activeElement;
  const focusedId =
    active instanceof HTMLElement && active.dataset.testid === TOGGLE && region.contains(active)
      ? active.dataset.recipeId
      : null;
  render();
  if (focusedId === null) return;
  for (const el of region.querySelectorAll(`[data-testid="${TOGGLE}"]`)) {
    if (
      el instanceof HTMLElement &&
      el.dataset.recipeId === focusedId &&
      !el.hasAttribute('disabled')
    ) {
      el.focus();
    }
  }
}
