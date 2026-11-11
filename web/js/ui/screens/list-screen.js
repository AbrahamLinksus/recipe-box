import { h, clear } from '../dom.js';

/**
 * @param {import('../../core/recipe/types.js').Recipe} recipe
 * @returns {HTMLElement}
 */
function recipeRow(recipe) {
  return h(
    'li',
    { class: 'recipe-row', 'data-testid': 'recipe-row', 'data-recipe-id': recipe.id },
    h('a', {
      class: 'recipe-title',
      href: `#/recipe/${encodeURIComponent(recipe.id)}`,
      'data-testid': 'recipe-row-title',
      text: recipe.title,
    }),
    h('div', {}, ...recipe.tags.map((tag) => h('span', { class: 'tag', text: tag }))),
  );
}

/**
 * @param {import('../router.js').Router} router
 * @param {boolean} disabled
 * @returns {HTMLElement}
 */
function emptyState(router, disabled) {
  return h(
    'div',
    { class: 'state', 'data-testid': 'empty-state' },
    h('p', { text: 'No recipes yet' }),
    h('button', {
      type: 'button',
      class: 'btn primary',
      'data-testid': 'add-first-recipe',
      disabled,
      onclick: () => router.navigate({ name: 'new' }),
      text: 'Add your first recipe',
    }),
  );
}

/**
 * @param {readonly import('../../core/recipe/types.js').Recipe[]} recipes
 * @returns {HTMLElement[]}
 */
function recipeList(recipes) {
  const count = recipes.length === 1 ? '1 recipe' : `${recipes.length} recipes`;
  return [
    h('p', { class: 'count', 'data-testid': 'recipe-count', text: count }),
    h('ul', { class: 'recipe-list' }, ...recipes.map(recipeRow)),
  ];
}

/**
 * @param {import('../router.js').Router} router
 * @param {boolean} disabled
 * @returns {HTMLElement}
 */
function listHeader(router, disabled) {
  return h(
    'header',
    { class: 'list-header' },
    h('h1', { text: 'Recipe Box' }),
    h('button', {
      type: 'button',
      class: 'btn primary',
      'data-testid': 'add-recipe',
      disabled,
      onclick: () => router.navigate({ name: 'new' }),
      text: '+ Add recipe',
    }),
  );
}

/** @type {import('../router.js').MountScreen} */
export function mountListScreen(container, { store, router }) {
  const disabled = store.status !== 'ready';
  const results = h('div', { class: 'results' });

  function renderResults() {
    clear(results);
    const recipes = store.list();
    results.append(
      ...(recipes.length === 0 ? [emptyState(router, disabled)] : recipeList(recipes)),
    );
  }

  renderResults();
  container.append(h('main', { class: 'page' }, listHeader(router, disabled), results));
  return { unmount: store.subscribe(renderResults) };
}
