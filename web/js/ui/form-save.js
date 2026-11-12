import { validateDraft } from '../core/recipe/validation.js';
import { ValidationError } from '../core/recipe/errors.js';
import { saveFailureMessage } from './save-failure.js';

/**
 * @typedef {{ draft: import('../core/recipe/types.js').RecipeDraft, saving: boolean, saved: boolean }} FormState
 * @typedef {{ saveButton: HTMLButtonElement, currentDraft(): FormState['draft'],
 *   render(errors: import('../core/recipe/types.js').FieldErrors): void }} FormView
 */

/**
 * Save is enabled only while the store can write and no save is pending (LLD 5.5, D-11).
 * @param {import('../store/recipe-store.js').RecipeStore} store
 * @param {FormState} state
 * @param {HTMLButtonElement} saveButton
 * @returns {() => void}
 */
export function createSaveSync(store, state, saveButton) {
  const sync = () => {
    saveButton.disabled = state.saving || store.status !== 'ready';
  };
  sync();
  return sync;
}

/**
 * @param {import('./router.js').ScreenContext} ctx
 * @param {string | null} id recipe id when editing, null when adding
 * @param {FormState} state
 * @param {FormView} view
 * @param {() => void} syncSave
 * @returns {() => Promise<void>}
 */
export function createSave({ store, router, banner }, id, state, view, syncSave) {
  let bannerShown = false;
  /** @param {unknown} err */
  function showFailure(err) {
    if (err instanceof ValidationError && Object.keys(err.fieldErrors).length > 0) {
      view.render(err.fieldErrors);
      return;
    }
    const message = saveFailureMessage(err);
    if (message) banner.show('error', message);
    bannerShown = Boolean(message);
  }
  return async () => {
    if (state.saving || store.status !== 'ready') return;
    state.draft = view.currentDraft();
    const result = validateDraft(state.draft);
    if (!result.ok) return view.render(result.errors);
    state.saving = true;
    syncSave();
    try {
      const recipe = await (id === null
        ? store.create(result.value)
        : store.update(id, result.value));
      state.saved = true;
      if (bannerShown) banner.clear();
      router.navigate({ name: 'view', id: recipe.id }, { replace: true });
    } catch (err) {
      showFailure(err);
    } finally {
      state.saving = false;
      syncSave();
    }
  };
}
