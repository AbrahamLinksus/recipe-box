// @ts-nocheck -- hand-written DOM fakes are intentionally partial
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { h, clear } from '../../../web/js/ui/dom.js';

function fakeNode(tag) {
  return {
    tag,
    attrs: {},
    children: [],
    listeners: {},
    textContent: '',
    className: '',
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    addEventListener(t, fn) {
      this.listeners[t] = fn;
    },
    append(c) {
      this.children.push(c);
    },
    replaceChildren() {
      this.children = [];
    },
  };
}
globalThis.document = { createElement: fakeNode };

describe('h', () => {
  it('refuses string on* attributes and javascript:/data: URLs', () => {
    const el = h('a', {
      onclick: 'alert(1)',
      href: ' JaVa\nScript:alert(1)',
      src: 'data:text/html,x',
      action: 'javascript:x',
    });
    assert.deepEqual(el.attrs, {});
    assert.deepEqual(el.listeners, {});
    assert.equal(h('a', { href: '#/recipe/a' }).attrs.href, '#/recipe/a');
  });
  it('sets text via textContent (no HTML interpretation)', () => {
    const el = h('p', { text: '<b>x</b>' });
    assert.equal(el.textContent, '<b>x</b>');
    assert.equal(el.innerHTML, undefined);
  });
  it('handles class, attrs, handlers, skips null/false', () => {
    let hit = 0;
    const el = h(
      'button',
      { class: 'a', 'data-testid': 't', onClick: () => hit++, hidden: false, x: null },
      'hi',
      null,
      false,
    );
    assert.equal(el.className, 'a');
    assert.equal(el.attrs['data-testid'], 't');
    assert.equal('hidden' in el.attrs, false);
    el.listeners.click();
    assert.equal(hit, 1);
    assert.deepEqual(el.children, ['hi']);
  });
  it('clear removes children', () => {
    const el = h('div', {}, 'a');
    clear(el);
    assert.equal(el.children.length, 0);
  });
});
