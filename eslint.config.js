import js from '@eslint/js';
import globals from 'globals';

const storageNames = ['localStorage', 'sessionStorage', 'indexedDB'];
const noStorage = {
  'no-restricted-globals': ['error', ...storageNames],
  'no-restricted-properties': [
    'error',
    ...storageNames.flatMap((name) => [
      { object: 'window', property: name },
      { object: 'globalThis', property: name },
    ]),
  ],
};
const restricted = [
  { selector: "AssignmentExpression[left.property.name='innerHTML']", message: 'No innerHTML.' },
  { selector: "AssignmentExpression[left.property.name='outerHTML']", message: 'No outerHTML.' },
  { selector: "CallExpression[callee.name='eval']", message: 'No eval.' },
];

export default [
  {
    ignores: ['node_modules', '.results', 'docs', 'test-results', 'playwright-report', 'coverage'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.node },
    rules: {
      complexity: ['error', 10],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 5],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'no-console': 'error',
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-restricted-syntax': ['error', ...restricted],
    },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
  { files: ['web/js/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['web/js/core/**/*.js'], languageOptions: { globals: {} } },
  { files: ['web/js/{ui,store,persistence}/**/*.js'], rules: noStorage },
  { files: ['tests/**/*.js'], rules: { 'max-lines-per-function': 'off' } },
  {
    files: ['server/log.js', 'web/js/ui/app.js', 'scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
];
