/** @typedef {{ info(msg: string): void, error(msg: string, fields?: Record<string, unknown>): void }} Logger */

/**
 * Formats one field value for a `key=value` pair (CONVENTIONS §5): strings quoted, numbers and
 * booleans bare, and anything outside printable ASCII escaped so the console line stays ASCII.
 * @param {unknown} value
 * @returns {string}
 */
function formatValue(value) {
  const bare =
    ['number', 'boolean', 'bigint', 'undefined'].includes(typeof value) || value === null;
  const text = bare ? String(value) : JSON.stringify(String(value));
  return text.replace(/[^ -~]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * The only server module that writes to the console streams.
 * @param {{ stdout: { write(s: string): unknown }, stderr: { write(s: string): unknown } }} [stream]
 * @returns {Logger}
 */
export function createLogger(stream = process) {
  return {
    info(msg) {
      stream.stdout.write(`${msg}\n`);
    },
    error(msg, fields) {
      const pairs = Object.entries(fields ?? {}).map(([k, v]) => ` ${k}=${formatValue(v)}`);
      stream.stderr.write(`${msg}${pairs.join('')}\n`);
    },
  };
}
