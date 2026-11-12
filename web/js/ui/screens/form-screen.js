import { h } from '../dom.js';
import { emptyDraft, isDirty, addTag } from '../form-model.js';
import { errorLine, valueOf } from '../form-widgets.js';
import { ingredientsSection } from '../form-ingredients.js';
import { stepsSection } from '../form-steps.js';
import { tagsSection } from '../form-tags.js';
import { validateDraft } from '../../core/recipe/validation.js';
import { ValidationError } from '../../core/recipe/errors.js';
import { PersistenceWriteError, StoreReadOnlyError } from '../../store/errors.js';

/**
 * @typedef {import('../../core/recipe/types.js').RecipeDraft} RecipeDraft
 * @typedef {import('../../core/recipe/types.js').FieldErrors} FieldErrors
 * @typedef {import('../form-widgets.js').DraftAccess} DraftAccess
 * @typedef {{ draft: RecipeDraft, saving: boolean, saved: boolean }} FormState
 */

/**
 * @param {string} label
 * @param {Record<string, unknown>} attrs
 * @param {string | undefined} error
 * @param {string} errorId
 * @returns {HTMLElement}
 */
function textField(label, attrs, error, errorId) {
  const id = `${errorId}-field`;
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id, text: label }),
    h('input', {
      class: 'input',
      type: 'text',
      id,
      'aria-invalid': error ? 'true' : null,
      'aria-describedby': error ? errorId : null,
      ...attrs,
    }),
    errorLine(errorId, error, errorId),
  );
}

/**
 * @param {DraftAccess} access
 * @param {FieldErrors} errors
 * @returns {HTMLElement}
 */
function topFields(access, errors) {
  const draft = access.get();
  /** @param {'title'|'servings'} key */
  const onInput = (key) => (/** @type {Event} */ e) =>
    access.set({ ...access.get(), [key]: valueOf(e) });
  return h(
    'div',
    { class: 'top' },
    textField(
      'Title',
      { 'data-testid': 'title-input', value: draft.title, oninput: onInput('title') },
      errors.title,
      'error-title',
    ),
    textField(
      'Servings',
      {
        'data-testid': 'servings-input',
        inputmode: 'numeric',
        value: draft.servings,
        oninput: onInput('servings'),
      },
      errors.servings,
      'error-servings',
    ),
  );
}

/**
 * @param {unknown} err
 * @returns {string | null} banner text, or null when the status banner already says it
 */
function saveFailureMessage(err) {
  if (err instanceof StoreReadOnlyError) return null;
  if (err instanceof PersistenceWriteError) {
    return `Could not save: ${err.message}. Your last change was not stored.`;
  }
  return 'Could not save. Your last change was not stored.';
}

/**
 * @param {import('../router.js').Router} router
 * @param {HTMLElement} saveButton
 * @returns {HTMLElement}
 */
function footer(router, saveButton) {
  return h(
    'div',
    { class: 'footer' },
    h('button', {
      type: 'button',
      class: 'btn',
      'data-testid': 'cancel-edit',
      onclick: () => router.navigate({ name: 'list' }),
      text: 'Cancel',
    }),
    saveButton,
  );
}

/**
 * @param {import('../router.js').Router} router
 * @param {FormState} state
 */
function createFormView(router, state) {
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
      footer(router, saveButton),
    );
    /** @type {HTMLElement | null} */ (form.querySelector('[aria-invalid="true"]'))?.focus();
  };
  return { form, saveButton, currentDraft, render };
}

/**
 * @param {import('../router.js').ScreenContext} ctx
 * @param {FormState} state
 * @param {ReturnType<typeof createFormView>} view
 * @returns {() => Promise<void>}
 */
function createSave({ store, router, banner }, state, view) {
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
    if (state.saving) return;
    state.draft = view.currentDraft();
    const result = validateDraft(state.draft);
    if (!result.ok) return view.render(result.errors);
    state.saving = true;
    view.saveButton.disabled = true;
    try {
      const recipe = await store.create(result.value);
      state.saved = true;
      if (bannerShown) banner.clear();
      router.navigate({ name: 'view', id: recipe.id }, { replace: true });
    } catch (err) {
      showFailure(err);
    } finally {
      state.saving = false;
      view.saveButton.disabled = false;
    }
  };
}

/** @type {import('../router.js').MountScreen} */
export function mountFormScreen(container, ctx) {
  const initial = emptyDraft();
  /** @type {FormState} */
  const state = { draft: initial, saving: false, saved: false };
  const view = createFormView(ctx.router, state);
  const save = createSave(ctx, state, view);
  const dirty = () => !state.saved && isDirty(initial, view.currentDraft());
  view.form.addEventListener('submit', (e) => {
    e.preventDefault();
    void save();
  });
  /** @param {BeforeUnloadEvent} e */
  const onBeforeUnload = (e) => {
    if (dirty()) e.preventDefault();
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  view.render({});
  container.append(
    h(
      'main',
      { class: 'page', 'data-testid': 'recipe-form' },
      h('h1', { text: 'Add recipe' }),
      view.form,
    ),
  );
  return {
    unmount: () => window.removeEventListener('beforeunload', onBeforeUnload),
    canLeave: async () =>
      !dirty() ||
      ctx.dialogs.confirm({
        message: 'Discard changes?',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
      }),
  };
}
