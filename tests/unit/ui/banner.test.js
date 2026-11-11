// @ts-nocheck -- hand-written DOM fakes are intentionally partial
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBanner } from '../../../web/js/ui/banner.js';

describe('createBanner', () => {
  it('show -> sets text, kind and unhides; clear -> hides', () => {
    const el = { dataset: {}, textContent: '', hidden: true };
    const banner = createBanner(el);
    banner.show('error', 'Oops');
    assert.deepEqual([el.textContent, el.dataset.kind, el.hidden], ['Oops', 'error', false]);
    banner.clear();
    assert.deepEqual([el.textContent, el.dataset.kind, el.hidden], ['', undefined, true]);
  });
});
