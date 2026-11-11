/**
 * @typedef {{ message: string, confirmLabel: string, cancelLabel: string }} ConfirmOptions
 * @typedef {{ confirm(opts: ConfirmOptions): Promise<boolean> }} Dialogs
 */

/**
 * Shows the native confirm dialog. Esc and backdrop click cancel; focus starts on Cancel.
 * @param {ConfirmOptions} opts
 * @param {Document} [doc]
 * @returns {Promise<boolean>}
 */
export function confirmDialog(opts, doc = document) {
  const dialog = /** @type {HTMLDialogElement} */ (doc.getElementById('confirm-dialog'));
  /** @param {string} id @returns {HTMLElement} */
  const part = (id) => /** @type {HTMLElement} */ (dialog.querySelector(`[data-testid="${id}"]`));
  const message = part('confirm-message');
  const ok = part('confirm-ok');
  const cancel = part('confirm-cancel');
  message.textContent = opts.message;
  ok.textContent = opts.confirmLabel;
  cancel.textContent = opts.cancelLabel;
  dialog.returnValue = '';

  return new Promise((resolve) => {
    const onOk = () => dialog.close('ok');
    const onCancel = () => dialog.close('cancel');
    /** @param {Event} e */
    const onBackdrop = (e) => {
      if (e.target !== dialog) return;
      // clicks on the dialog's own padding land inside its box; only the backdrop is outside
      const r = dialog.getBoundingClientRect();
      const { clientX: x, clientY: y } = /** @type {MouseEvent} */ (e);
      const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      if (!inside) dialog.close('cancel');
    };
    dialog.addEventListener(
      'close',
      () => {
        ok.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        dialog.removeEventListener('click', onBackdrop);
        resolve(dialog.returnValue === 'ok');
      },
      { once: true },
    );
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    dialog.addEventListener('click', onBackdrop);
    dialog.showModal();
    cancel.focus();
  });
}

/** @returns {Dialogs} */
export function createDialogs() {
  return { confirm: (opts) => confirmDialog(opts) };
}
