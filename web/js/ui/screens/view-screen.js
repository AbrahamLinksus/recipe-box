import { h, clear } from '../dom.js';
import { favouriteToggle, renderKeepingToggleFocus } from '../favourite-toggle.js';
import { formatIngredientLine } from '../../core/scaling/scaling.js';

/**
 * @param {import('../../core/recipe/types.js').Ingredient} ingredient
 * @param {number} base
 * @returns {HTMLElement}
 */
function ingredientLine(ingredient, base) {
  const { amount, name } = formatIngredientLine(ingredient, base, base);
  return h(
    'li',
    { 'data-testid': 'ingredient-line' },
    amount ? h('strong', { 'data-testid': 'ingredient-amount', text: amount }) : null,
    amount ? ' ' : null,
    name,
  );
}

/**
 * @param {import('../../core/recipe/types.js').Recipe} recipe
 * @returns {HTMLElement}
 */
function recipeBody(recipe) {
  return h(
    'div',
    { class: 'cols' },
    h(
      'section',
      { class: 'panel ing', 'data-testid': 'ingredients-panel' },
      h('h2', { text: 'Ingredients' }),
      h('ul', {}, ...recipe.ingredients.map((i) => ingredientLine(i, recipe.servings))),
    ),
    h(
      'section',
      { class: 'panel steps', 'data-testid': 'steps-panel' },
      h('h2', { text: 'Steps' }),
      h('ol', {}, ...recipe.steps.map((text) => h('li', { 'data-testid': 'step-line', text }))),
    ),
  );
}

/**
 * @param {import('../../core/recipe/types.js').Recipe} recipe
 * @param {HTMLElement} star
 * @returns {HTMLElement}
 */
function recipeHeader(recipe, star) {
  return h(
    'div',
    { class: 'view-head' },
    h(
      'div',
      { class: 'title-row' },
      h('h1', { 'data-testid': 'recipe-title', text: recipe.title }),
      star,
    ),
    h('p', { class: 'serves', 'data-testid': 'recipe-serves', text: `Serves ${recipe.servings}` }),
    h(
      'div',
      { 'data-testid': 'recipe-tags' },
      ...recipe.tags.map((tag) =>
        h('span', { class: 'tag', 'data-testid': 'recipe-tag', text: tag }),
      ),
    ),
  );
}

/**
 * Edit is a link while the store can save, a disabled button otherwise (LLD 4.5).
 * @param {string} id
 * @param {boolean} canEdit
 * @returns {HTMLElement}
 */
function editControl(id, canEdit) {
  const testid = { 'data-testid': 'edit-recipe' };
  if (!canEdit)
    return h('button', { class: 'btn', type: 'button', disabled: true, ...testid, text: 'Edit' });
  return h('a', {
    class: 'btn',
    href: `#/recipe/${encodeURIComponent(id)}/edit`,
    ...testid,
    text: 'Edit',
  });
}

/**
 * @param {string} id
 * @param {boolean} canEdit
 * @returns {HTMLElement}
 */
function topBar(id, canEdit) {
  return h(
    'header',
    { class: 'view-bar' },
    h('a', { href: '#/', 'data-testid': 'back-to-list', text: '\u2190 All recipes' }),
    editControl(id, canEdit),
  );
}

/** @returns {HTMLElement} */
function notFound() {
  return h(
    'div',
    { class: 'state', 'data-testid': 'not-found' },
    h('p', { text: 'Recipe not found' }),
    h('a', { class: 'btn', href: '#/', 'data-testid': 'not-found-back', text: 'All recipes' }),
  );
}

/** @type {import('../router.js').MountScreen} */
export function mountViewScreen(container, { store, banner }, route) {
  const id = route.name === 'view' ? route.id : '';
  const content = h('div', { class: 'view-content' });

  function render() {
    clear(content);
    const recipe = store.get(id);
    content.append(
      ...(recipe
        ? [
            topBar(id, store.status === 'ready'),
            recipeHeader(recipe, favouriteToggle(recipe, store, banner)),
            recipeBody(recipe),
          ]
        : [notFound()]),
    );
  }

  render();
  const onChange = () => renderKeepingToggleFocus(content, render);
  container.append(h('main', { class: 'page' }, content));
  return { unmount: store.subscribe(onChange) };
}
