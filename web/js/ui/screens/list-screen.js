import { filterRecipes } from '../../core/search/search.js';
import { h, clear } from '../dom.js';
import { createFilterPanel } from '../list-filters.js';

/**
 * @param {import('../../core/recipe/types.js').Recipe} recipe
 * @returns {HTMLElement}
 */
function recipeRow(recipe) {
  return h(
    'li',
    { class: 'recipe-row', 'data-testid': 'recipe-row', 'data-recipe-id': recipe.id },
    h(
      'div',
      { class: 'recipe-main' },
      h('a', {
        class: 'recipe-title',
        href: `#/recipe/${encodeURIComponent(recipe.id)}`,
        'data-testid': 'recipe-row-title',
        text: recipe.title,
      }),
      h('div', {}, ...recipe.tags.map((tag) => h('span', { class: 'tag', text: tag }))),
    ),
    h('span', {
      class: 'star',
      'data-testid': 'recipe-row-star',
      title: recipe.favourite ? 'Favourite' : 'Not favourite',
      text: recipe.favourite ? '★' : '☆',
    }),
  );
}

/**
 * @param {() => void} onClear
 * @returns {HTMLElement}
 */
function noMatchState(onClear) {
  return h(
    'div',
    { class: 'state', 'data-testid': 'no-match-state' },
    h('p', { text: 'No recipes match your search' }),
    h('button', {
      type: 'button',
      class: 'btn',
      'data-testid': 'clear-filters',
      onclick: onClear,
      text: 'Clear filters',
    }),
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
export function mountListScreen(container, { store, router, filterState }) {
  const disabled = store.status !== 'ready';
  const results = h('div', { class: 'results' });
  const panel = createFilterPanel(filterState, renderResults);

  function clearFilters() {
    filterState.reset();
    panel.syncFromState();
    renderResults();
    panel.focusSearch();
  }

  function renderResults() {
    clear(results);
    if (store.list().length === 0) {
      results.append(emptyState(router, disabled));
      return;
    }
    const recipes = filterRecipes(store.list(), filterState.get());
    results.append(...(recipes.length === 0 ? [noMatchState(clearFilters)] : recipeList(recipes)));
  }

  function onStoreChange() {
    panel.refreshTags(store.list());
    renderResults();
  }

  panel.refreshTags(store.list());
  panel.syncFromState();
  renderResults();
  // The filter panel is a sibling of results, so re-rendering results never replaces the
  // controls or steals their focus.
  const layout = h('div', { class: 'list-layout' }, panel.element, results);
  container.append(h('main', { class: 'page' }, listHeader(router, disabled), layout));
  return { unmount: store.subscribe(onStoreChange) };
}
