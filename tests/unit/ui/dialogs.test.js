// @ts-nocheck -- hand-written DOM fakes are intentionally partial
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { confirmDialog } from '../../../web/js/ui/dialogs.js';

function fakeEl() {
  const l = {};
  return {
    textContent: '',
    focused: false,
    addEventListener(t, fn) {
      (l[t] ??= []).push(fn);
    },
    removeEventListener(t, fn) {
      l[t] = (l[t] ?? []).filter((f) => f !== fn);
    },
    emit(t, ev = {}) {
      [...(l[t] ?? [])].forEach((fn) => fn(ev));
    },
    focus() {
      this.focused = true;
    },
  };
}

function setup() {
  const ok = fakeEl();
  const cancel = fakeEl();
  const message = fakeEl();
  const parts = { 'confirm-message': message, 'confirm-ok': ok, 'confirm-cancel': cancel };
  const dialog = Object.assign(fakeEl(), {
    returnValue: '',
    getBoundingClientRect: () => ({ left: 10, right: 110, top: 10, bottom: 110 }),
    opened: false,
    querySelector: (sel) => parts[sel.match(/"(.+)"/)[1]],
    showModal() {
      this.opened = true;
    },
    close(value) {
      if (value !== undefined) this.returnValue = value;
      this.emit('close');
    },
  });
  const doc = { getElementById: () => dialog };
  const opts = {
    message: "Delete 'Tomato Soup'? Are you sure?",
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  };
  return { ok, cancel, message, dialog, promise: confirmDialog(opts, doc) };
}

describe('confirmDialog', () => {
  it('opens modally with labels and focuses the cancel button', () => {
    const t = setup();
    assert.equal(t.dialog.opened, true);
    assert.equal(t.message.textContent, "Delete 'Tomato Soup'? Are you sure?");
    assert.equal(t.ok.textContent, 'Delete');
    assert.equal(t.cancel.textContent, 'Cancel');
    assert.equal(t.cancel.focused, true);
  });
  it('confirm click -> true', async () => {
    const t = setup();
    t.ok.emit('click');
    assert.equal(await t.promise, true);
  });
  it('cancel click -> false', async () => {
    const t = setup();
    t.cancel.emit('click');
    assert.equal(await t.promise, false);
  });
  it('Esc (close without value) -> false', async () => {
    const t = setup();
    t.dialog.close();
    assert.equal(await t.promise, false);
  });
  it('backdrop click -> false; clicks inside content or padding -> ignored', async () => {
    const t = setup();
    t.dialog.emit('click', { target: t.message });
    t.dialog.emit('click', { target: t.dialog, clientX: 12, clientY: 12 });
    assert.equal(t.dialog.returnValue, '');
    t.dialog.emit('click', { target: t.dialog, clientX: 500, clientY: 50 });
    assert.equal(await t.promise, false);
  });
});
