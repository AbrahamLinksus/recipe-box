/** Thrown when a recipe input fails validation; carries the per-field messages. */
export class ValidationError extends Error {
  /** @param {import('./types.js').FieldErrors} fieldErrors */
  constructor(fieldErrors) {
    super('Recipe failed validation');
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}
