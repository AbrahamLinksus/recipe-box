import { formatQuarter, roundToQuarter } from './fractions.js';

/**
 * @param {import('../recipe/types.js').Amount} amount
 * @param {number} base
 * @param {number} target
 * @returns {string}
 */
export function scaleAmount(amount, base, target) {
  if (amount.value === null || target === base) return amount.text;
  return formatQuarter(roundToQuarter((amount.value * target) / base));
}

/**
 * @param {import('../recipe/types.js').Ingredient} ingredient
 * @param {number} base
 * @param {number} target
 * @returns {{ amount: string, name: string }}
 */
export function formatIngredientLine(ingredient, base, target) {
  const scaled = scaleAmount(ingredient.amount, base, target);
  const amount = ingredient.unit
    ? `${scaled}${scaled ? ' ' : ''}${ingredient.unit}`.trim()
    : scaled;
  return { amount, name: ingredient.name };
}
