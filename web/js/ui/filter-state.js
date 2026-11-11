/**
 * @typedef {{ query: string, tag: string | null, favouritesOnly: boolean }} RecipeFilter
 * @typedef {{ get(): RecipeFilter, set(patch: Partial<RecipeFilter>): void, reset(): void }} FilterState
 */

/** @returns {RecipeFilter} */
function defaults() {
  return { query: '', tag: null, favouritesOnly: false };
}

/**
 * In-memory list filter that survives list -> view -> list (not persisted).
 * @returns {FilterState}
 */
export function createFilterState() {
  let state = defaults();
  return {
    get: () => ({ ...state }),
    set(patch) {
      state = { ...state, ...patch };
    },
    reset() {
      state = defaults();
    },
  };
}
