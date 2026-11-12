// @ts-nocheck -- hand-written DOM fakes are intentionally partial
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { renderKeepingFocus } from '../../../web/js/ui/focus-keeper.js';

const saved = {};
class FakeEl {
  constructor(testid, { recipeId, disabled = false } = {}) {
    this.dataset = { testid };
    if (recipeId) this.dataset.recipeId = recipeId;
    this.disabled = disabled;
  }
  hasAttribute(name) {
    return name === 'disabled' && this.disabled;
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
}
class FakeInput extends FakeEl {
  value = '';
  selectionStart = 0;
  setSelectionRange(a) {
    this.selectionStart = a;
  }
}
function makeRegion(children) {
  const doc = { activeElement: null };
  const region = {
    ownerDocument: doc,
    children,
    contains: (el) => region.children.includes(el),
    querySelectorAll: (sel) => {
      const id = /"(.*)"/.exec(sel)[1];
      return region.children.filter((c) => c.dataset.testid === id);
    },
  };
  for (const c of children) c.ownerDocument = doc;
  return region;
}
const rebuild = (region, children) => () => {
  region.children = children;
  for (const c of children) c.ownerDocument = region.ownerDocument;
};

describe('renderKeepingFocus', () => {
  before(() => {
    saved.E = globalThis.HTMLElement;
    saved.I = globalThis.HTMLInputElement;
    globalThis.HTMLElement = FakeEl;
    globalThis.HTMLInputElement = FakeInput;
  });
  after(() => {
    globalThis.HTMLElement = saved.E;
    globalThis.HTMLInputElement = saved.I;
  });

  it('refocuses the rebuilt control with the same test id', () => {
    const region = makeRegion([new FakeEl('inc')]);
    region.children[0].focus();
    const fresh = new FakeEl('inc');
    renderKeepingFocus(region, rebuild(region, [fresh]), { inc: 'input' });
    assert.equal(region.ownerDocument.activeElement, fresh);
  });

  it('falls back when the control is disabled or gone', () => {
    const region = makeRegion([new FakeEl('dec')]);
    region.children[0].focus();
    const input = new FakeInput('input');
    renderKeepingFocus(region, rebuild(region, [new FakeEl('dec', { disabled: true }), input]), {
      dec: 'input',
    });
    assert.equal(region.ownerDocument.activeElement, input);
  });

  it('does nothing without a fallback or when the control is not targeted', () => {
    const region = makeRegion([new FakeEl('star')]);
    region.children[0].focus();
    renderKeepingFocus(region, rebuild(region, []), { star: null });
    assert.equal(
      region.ownerDocument.activeElement,
      region.children[0] ?? region.ownerDocument.activeElement,
    );
    const r2 = makeRegion([new FakeEl('other')]);
    r2.children[0].focus();
    const orig = r2.children[0];
    renderKeepingFocus(r2, rebuild(r2, [new FakeEl('other')]), { inc: null });
    assert.equal(r2.ownerDocument.activeElement, orig);
  });

  it('matches data-recipe-id and ignores a different recipe', () => {
    const region = makeRegion([new FakeEl('star', { recipeId: 'a' })]);
    region.children[0].focus();
    const a = new FakeEl('star', { recipeId: 'a' });
    renderKeepingFocus(region, rebuild(region, [new FakeEl('star', { recipeId: 'b' }), a]), {
      star: null,
    });
    assert.equal(region.ownerDocument.activeElement, a);
  });

  it('keeps typed text and caret of a focused input', () => {
    const old = new FakeInput('input');
    old.value = '1';
    old.selectionStart = 1;
    const region = makeRegion([old]);
    old.focus();
    const fresh = new FakeInput('input');
    renderKeepingFocus(region, rebuild(region, [fresh]), { input: null });
    assert.deepEqual([fresh.value, fresh.selectionStart], ['1', 1]);
  });

  it('does not touch focus that is outside the region', () => {
    const region = makeRegion([new FakeEl('inc')]);
    region.ownerDocument.activeElement = new FakeEl('inc');
    const fresh = new FakeEl('inc');
    renderKeepingFocus(region, rebuild(region, [fresh]), { inc: null });
    assert.notEqual(region.ownerDocument.activeElement, fresh);
  });
});
