import { h } from './dom.js';
import { renderKeepingFocus } from './focus-keeper.js';
import { PersistenceWriteError, StoreReadOnlyError } from '../store/errors.js';

const TOGGLE = 'favourite-toggle';

/**
 * @param {unknown} err
 * @returns {string | null} banner text, or null when the status banner already says it
 */
function failureMessage(err) {
  if (err instanceof StoreReadOnlyError) return null;
  if (err instanceof PersistenceWriteError) {
    return `Could not save: ${err.message}. Your last change was not stored.`;
  }
  return 'Could not save. Your last change was not stored.';
}

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
      const message = failureMessage(err);
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

/** Focus rule for the star: back to the star of the same recipe, no fallback. */
export const TOGGLE_FOCUS = Object.freeze({ [TOGGLE]: null });

/**
 * Runs a re-render and gives focus back to the star of the same recipe if it had focus,
 * so keyboard users can keep toggling.
 * @param {HTMLElement} region
 * @param {() => void} render
 */
export function renderKeepingToggleFocus(region, render) {
  renderKeepingFocus(region, render, TOGGLE_FOCUS);
}
