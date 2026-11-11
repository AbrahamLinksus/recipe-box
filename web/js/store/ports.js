/**
 * Persistence port (LLD 9.1): the D1 variation point implemented by M10.
 * @typedef {import('../core/recipe/types.js').Recipe} Recipe
 * @typedef {{ kind: 'ok', recipes: Recipe[] } | { kind: 'empty' }
 *   | { kind: 'unreadable', reason: string } | { kind: 'unavailable', reason: string }} LoadResult
 * @typedef {{
 *   load(): Promise<LoadResult>,
 *   save(recipes: readonly Recipe[]): Promise<void>,
 *   watch(onExternalChange: () => void): () => void,
 *   requestDurability(): Promise<boolean>
 * }} CollectionPersistence
 */
export {};
