import { listTags } from '../core/search/search.js';
import { h, clear } from './dom.js';

/**
 * @typedef {{ element: HTMLElement, refreshTags(recipes: readonly import('../core/recipe/types.js').Recipe[]): void,
 *   syncFromState(): void, focusSearch(): void }} FilterPanel
 */

/**
 * @param {string} id
 * @param {string} type
 * @param {() => void} oninput
 * @returns {HTMLInputElement}
 */
function textInput(id, type, oninput) {
  const attrs = { type, id, 'data-testid': id, oninput };
  return /** @type {HTMLInputElement} */ (
    h('input', { ...attrs, class: 'input', placeholder: 'Search by title…', autocomplete: 'off' })
  );
}

/**
 * @param {readonly import('../core/recipe/types.js').Recipe[]} recipes
 * @param {import('./filter-state.js').FilterState} filterState
 * @param {HTMLSelectElement} select
 */
function fillTags(recipes, filterState, select) {
  const tags = listTags(recipes);
  let selected = filterState.get().tag;
  if (selected !== null && !tags.includes(selected)) {
    filterState.set({ tag: null });
    selected = null;
  }
  clear(select);
  select.append(
    h('option', { value: '', text: 'All tags' }),
    ...tags.map((tag) => h('option', { value: tag, text: tag })),
  );
  select.value = selected ?? '';
}

/**
 * @param {import('./filter-state.js').FilterState} filterState
 * @param {() => void} onChange
 * @returns {HTMLSelectElement}
 */
function selectControl(filterState, onChange) {
  const select = /** @type {HTMLSelectElement} */ (
    h('select', {
      class: 'input',
      id: 'tag-filter',
      'data-testid': 'tag-filter',
      onchange: () => {
        filterState.set({ tag: select.value === '' ? null : select.value });
        onChange();
      },
    })
  );
  return select;
}

/**
 * @param {import('./filter-state.js').FilterState} filterState
 * @param {() => void} onChange
 * @returns {HTMLInputElement}
 */
function checkboxControl(filterState, onChange) {
  const box = /** @type {HTMLInputElement} */ (
    h('input', {
      type: 'checkbox',
      id: 'favourites-only',
      'data-testid': 'favourites-only',
      onchange: () => {
        filterState.set({ favouritesOnly: box.checked });
        onChange();
      },
    })
  );
  return box;
}

/**
 * Filter panel (search, tag select, favourites). Built once per mount; never re-created,
 * so the search box keeps focus and caret while the results re-render.
 * @param {import('./filter-state.js').FilterState} filterState
 * @param {() => void} onChange called after the filter state changed
 * @returns {FilterPanel}
 */
export function createFilterPanel(filterState, onChange) {
  const search = textInput('search-input', 'search', () => {
    filterState.set({ query: search.value });
    onChange();
  });
  const tagSelect = selectControl(filterState, onChange);
  const favourites = checkboxControl(filterState, onChange);
  const element = h(
    'section',
    { class: 'filters', 'aria-label': 'Search and filter' },
    h('label', { for: 'search-input', class: 'sr-only', text: 'Search by title' }),
    search,
    h('label', { for: 'tag-filter', class: 'sr-only', text: 'Tag' }),
    tagSelect,
    h('label', { class: 'check', for: 'favourites-only' }, favourites, 'Favourites only'),
  );
  return {
    element,
    refreshTags: (recipes) => fillTags(recipes, filterState, tagSelect),
    syncFromState() {
      const state = filterState.get();
      search.value = state.query;
      tagSelect.value = state.tag ?? '';
      favourites.checked = state.favouritesOnly;
    },
    focusSearch: () => search.focus(),
  };
}
