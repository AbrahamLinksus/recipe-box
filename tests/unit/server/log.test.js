import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../../../server/log.js';

function fakeStream() {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const err = [];
  return {
    out,
    err,
    stdout: { write: (/** @type {string} */ s) => out.push(s) },
    stderr: { write: (/** @type {string} */ s) => err.push(s) },
  };
}

describe('createLogger', () => {
  it('info -> stdout line', () => {
    const s = fakeStream();
    createLogger(s).info('hello');
    assert.deepEqual(s.out, ['hello\n']);
  });

  it('error with and without fields -> stderr', () => {
    const s = fakeStream();
    const log = createLogger(s);
    log.error('bad');
    log.error('worse', { code: 'X' });
    assert.deepEqual(s.err, ['bad\n', 'worse code="X"\n']);
  });

  it('error fields -> key=value pairs, strings quoted, numbers bare', () => {
    const s = fakeStream();
    createLogger(s).error('Port busy', { error: 'EADDRINUSE', port: 47321, open: false });
    assert.deepEqual(s.err, ['Port busy error="EADDRINUSE" port=47321 open=false\n']);
  });

  it('non-ASCII, quotes, newlines and objects -> escaped ASCII on one line', () => {
    const s = fakeStream();
    createLogger(s).error('x', { path: 'José "a"\nb', err: new Error('boom'), n: null });
    assert.deepEqual(s.err, ['x path="Jos\\u00e9 \\"a\\"\\nb" err="Error: boom" n=null\n']);
  });

  it('default stream -> process', () => {
    assert.equal(typeof createLogger().info, 'function');
  });
});
