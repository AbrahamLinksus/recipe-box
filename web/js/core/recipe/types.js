/**
 * Recipe model typedefs (JSDoc only, no runtime code).
 * @typedef {{ text: string, value: number | null }} Amount
 *   text = exactly as typed (trimmed); value = parsed number, null = never scaled
 * @typedef {{ amount: Amount, unit: string, name: string }} Ingredient
 * @typedef {{ id: string, title: string, servings: number, ingredients: Ingredient[], steps: string[],
 *   tags: string[], favourite: boolean, createdAt: string, updatedAt: string }} Recipe
 * @typedef {Pick<Recipe, 'title' | 'servings' | 'ingredients' | 'steps' | 'tags'>} RecipeInput
 * @typedef {{ amount: string, unit: string, name: string }} IngredientDraft
 * @typedef {{ title: string, servings: string, ingredients: IngredientDraft[], steps: string[], tags: string[] }} RecipeDraft
 * @typedef {{ title?: string, servings?: string, ingredients?: string, steps?: string,
 *   ingredientRows?: Record<number, string> }} FieldErrors
 * @typedef {{ ok: true, value: RecipeInput } | { ok: false, errors: FieldErrors }} ValidationResult
 */
export {};
