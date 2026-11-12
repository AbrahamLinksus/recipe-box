import { h, clear } from '../dom.js';
import { favouriteToggle, TOGGLE_FOCUS } from '../favourite-toggle.js';
import { servingsControl, SERVINGS_FOCUS } from '../servings-control.js';
import { renderKeepingFocus } from '../focus-keeper.js';
import { formatIngredientLine } from '../../core/scaling/scaling.js';

/**
 * @param {import('../../core/recipe/types.js').Ingredient} ingredient
 * @param {number} base
 * @param {number} target
 * @returns {HTMLElement}
 */
function ingredientLine(ingredient, base, target) {
  const { amount, name } = formatIngredientLine(ingredient, base, target);
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
 * @param {number} servings
 * @returns {HTMLElement}
 */
function recipeBody(recipe, servings) {
  return h(
    'div',
    { class: 'cols' },
    h(
      'section',
      { class: 'panel ing', 'data-testid': 'ingredients-panel' },
      h('h2', { text: 'Ingredients' }),
      h('ul', {}, ...recipe.ingredients.map((i) => ingredientLine(i, recipe.servings, servings))),
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

const VIEW_FOCUS = Object.freeze({ ...TOGGLE_FOCUS, ...SERVINGS_FOCUS });

/** @type {import('../router.js').MountScreen} */
export function mountViewScreen(container, { store, banner }, route) {
  const id = route.name === 'view' ? route.id : '';
  const content = h('div', { class: 'view-content' });
  let servings = 0;
  let shownRecipe = '';

  /** @param {number} next */
  function setServings(next) {
    servings = next;
    rerender();
  }

  function render() {
    clear(content);
    const recipe = store.get(id);
    if (recipe && shownRecipe !== id) {
      shownRecipe = id;
      servings = recipe.servings;
    }
    content.append(
      ...(recipe
        ? [
            topBar(id, store.status === 'ready'),
            recipeHeader(recipe, favouriteToggle(recipe, store, banner)),
            servingsControl({
              base: recipe.servings,
              getServings: () => servings,
              onChange: setServings,
            }),
            recipeBody(recipe, servings),
          ]
        : [notFound()]),
    );
  }

  function rerender() {
    renderKeepingFocus(content, render, VIEW_FOCUS);
  }

  render();
  container.append(h('main', { class: 'page' }, content));
  return { unmount: store.subscribe(rerender) };
}
