import { h } from '../dom.js';
import { emptyDraft, draftFromRecipe, isDirty, addTag } from '../form-model.js';
import { topFields } from '../form-top.js';
import { ingredientsSection } from '../form-ingredients.js';
import { stepsSection } from '../form-steps.js';
import { tagsSection } from '../form-tags.js';
import { createSave, createSaveSync } from '../form-save.js';
import { mountNotFoundScreen } from './not-found-screen.js';

/**
 * @typedef {import('../../core/recipe/types.js').RecipeDraft} RecipeDraft
 * @typedef {import('../../core/recipe/types.js').FieldErrors} FieldErrors
 * @typedef {import('../form-save.js').FormState} FormState
 */

/**
 * @param {import('../router.js').Router} router
 * @param {import('../router.js').Route} cancelTo
 * @param {HTMLElement} saveButton
 * @returns {HTMLElement}
 */
function footer(router, cancelTo, saveButton) {
  return h(
    'div',
    { class: 'footer' },
    h('button', {
      type: 'button',
      class: 'btn',
      'data-testid': 'cancel-edit',
      onclick: () => router.navigate(cancelTo),
      text: 'Cancel',
    }),
    saveButton,
  );
}

/**
 * @param {import('../router.js').Router} router
 * @param {import('../router.js').Route} cancelTo
 * @param {FormState} state
 */
function createFormView(router, cancelTo, state) {
  const access = {
    get: () => state.draft,
    set: (/** @type {RecipeDraft} */ d) => (state.draft = d),
  };
  const form = h('form', { class: 'recipe-form', novalidate: true });
  const saveButton = /** @type {HTMLButtonElement} */ (
    h('button', {
      type: 'submit',
      class: 'btn primary',
      'data-testid': 'save-recipe',
      text: 'Save',
    })
  );
  /** The draft plus any tag text typed but not yet committed. */
  const currentDraft = () => {
    const box = /** @type {HTMLInputElement | null} */ (
      form.querySelector('[data-testid="tag-input"]')
    );
    return box ? addTag(state.draft, box.value) : state.draft;
  };
  /** @param {FieldErrors} errors */
  const render = (errors) => {
    form.replaceChildren(
      topFields(access, errors),
      h('div', { class: 'cols' }, ingredientsSection(access, errors), stepsSection(access, errors)),
      tagsSection(access),
      footer(router, cancelTo, saveButton),
    );
    /** @type {HTMLElement | null} */ (form.querySelector('[aria-invalid="true"]'))?.focus();
  };
  return { form, saveButton, currentDraft, render };
}

/**
 * @param {import('../dialogs.js').Dialogs} dialogs
 * @param {() => boolean} dirty
 * @returns {() => Promise<boolean>}
 */
const confirmDiscard = (dialogs, dirty) => async () =>
  !dirty() ||
  dialogs.confirm({
    message: 'Discard changes?',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
  });

/** @type {import('../router.js').MountScreen} */
export function mountFormScreen(container, ctx, route) {
  const id = route.name === 'edit' ? route.id : null;
  const recipe = id === null ? undefined : ctx.store.get(id);
  if (id !== null && !recipe) return mountNotFoundScreen(container, ctx, route);
  const initial = recipe ? draftFromRecipe(recipe) : emptyDraft();
  /** @type {FormState} */
  const state = { draft: initial, saving: false, saved: false };
  const cancelTo = id === null ? { name: 'list' } : { name: 'view', id };
  const view = createFormView(
    ctx.router,
    /** @type {import('../router.js').Route} */ (cancelTo),
    state,
  );
  const syncSave = createSaveSync(ctx.store, state, view.saveButton);
  const save = createSave(ctx, id, state, view, syncSave);
  const dirty = () => !state.saved && isDirty(initial, view.currentDraft());
  view.form.addEventListener('submit', (e) => {
    e.preventDefault();
    void save();
  });
  const stops = [
    ctx.store.subscribe(syncSave),
    ctx.onBeforeUnload((e) => {
      if (dirty()) e.preventDefault();
    }),
  ];
  view.render({});
  container.append(
    h(
      'main',
      { class: 'page', 'data-testid': 'recipe-form' },
      h('h1', { text: id === null ? 'Add recipe' : 'Edit recipe' }),
      view.form,
    ),
  );
  return {
    unmount: () => stops.forEach((stop) => stop()),
    canLeave: confirmDiscard(ctx.dialogs, dirty),
  };
}
