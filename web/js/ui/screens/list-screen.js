import { filterRecipes } from '../../core/search/search.js';
import { h, clear } from '../dom.js';
import { createFilterPanel } from '../list-filters.js';
import { favouriteToggle, renderKeepingToggleFocus } from '../favourite-toggle.js';

/**
 * @param {import('../../core/recipe/types.js').Recipe} recipe
 * @param {import('../../store/recipe-store.js').RecipeStore} store
 * @param {import('../banner.js').Banner} banner
 * @returns {HTMLElement}
 */
function recipeRow(recipe, store, banner) {
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
    favouriteToggle(recipe, store, banner),
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
 * @param {import('../../store/recipe-store.js').RecipeStore} store
 * @param {import('../banner.js').Banner} banner
 * @returns {HTMLElement[]}
 */
function recipeList(recipes, store, banner) {
  const count = recipes.length === 1 ? '1 recipe' : `${recipes.length} recipes`;
  return [
    h('p', { class: 'count', 'data-testid': 'recipe-count', text: count }),
    h('ul', { class: 'recipe-list' }, ...recipes.map((r) => recipeRow(r, store, banner))),
  ];
}

/**
 * @param {import('../router.js').Router} router
 * @returns {HTMLButtonElement}
 */
function addButton(router) {
  return /** @type {HTMLButtonElement} */ (
    h('button', {
      type: 'button',
      class: 'btn primary',
      'data-testid': 'add-recipe',
      onclick: () => router.navigate({ name: 'new' }),
      text: '+ Add recipe',
    })
  );
}

/**
 * @param {HTMLElement} add
 * @param {HTMLElement} layout
 * @returns {HTMLElement}
 */
function listPage(add, layout) {
  const header = h('header', { class: 'list-header' }, h('h1', { text: 'Recipe Box' }), add);
  return h('main', { class: 'page' }, header, layout);
}

/** @type {import('../router.js').MountScreen} */
export function mountListScreen(container, { store, router, filterState, banner }) {
  const add = addButton(router);
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
      results.append(emptyState(router, store.status !== 'ready'));
      return;
    }
    const recipes = filterRecipes(store.list(), filterState.get());
    results.append(
      ...(recipes.length === 0 ? [noMatchState(clearFilters)] : recipeList(recipes, store, banner)),
    );
  }

  function onStoreChange() {
    add.disabled = store.status !== 'ready';
    panel.refreshTags(store.list());
    renderKeepingToggleFocus(results, renderResults);
  }

  add.disabled = store.status !== 'ready';
  panel.refreshTags(store.list());
  panel.syncFromState();
  renderResults();
  // The filter panel is a sibling of results, so re-rendering results never replaces the
  // controls or steals their focus.
  const layout = h('div', { class: 'list-layout' }, panel.element, results);
  container.append(listPage(add, layout));
  return { unmount: store.subscribe(onStoreChange) };
}
