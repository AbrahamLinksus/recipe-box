import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { APP_NAME } from '../../web/js/main.js';

describe('skeleton', () => {
  it('app module loads -> exports the app name', () => {
    assert.equal(APP_NAME, 'Recipe Box');
  });
});
