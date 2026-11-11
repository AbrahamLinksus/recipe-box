import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { startOrReuse, exitCodeFor } from '../../../server/launcher.js';
import { probeExistingInstance } from '../../../server/probe.js';
import { createListen } from '../../../server/listen.js';
import { createBrowserOpener } from '../../../server/browser.js';

const URL_ = 'http://127.0.0.1:47321/';
const CONFIG = /** @type {any} */ ({
  host: '127.0.0.1',
  port: 47321,
  origin: 'http://127.0.0.1:47321',
  openBrowser: true,
});

/** @param {string} code */
const errno = (code) => Object.assign(new Error(code), { code });

/**
 * @param {{ listen?: any[], probe?: string[], config?: any }} script
 */
function harness({ listen = [], probe = [], config = CONFIG }) {
  const calls = { listen: 0, probe: 0, opened: /** @type {string[]} */ ([]) };
  const logs = { info: /** @type {string[]} */ ([]), error: /** @type {string[]} */ ([]) };
  const fakeServer = { fake: true };
  const deps = /** @type {any} */ ({
    config,
    listen: async () => {
      const step = listen[calls.listen++];
      if (step instanceof Error) throw step;
      return fakeServer;
    },
    probe: async () => probe[calls.probe++],
    openBrowser: (/** @type {string} */ u) => calls.opened.push(u),
    log: {
      info: (/** @type {string} */ m) => logs.info.push(m),
      error: (/** @type {string} */ m) => logs.error.push(m),
    },
  });
  return { deps, calls, logs, fakeServer };
}

const CONFLICT =
  'Port 47321 is used by another program, so Recipe Box cannot start. Close that program and run the command again (see README "Port problems").';

describe('startOrReuse', () => {
  it('started: prints the message, opens the browser, keeps running', async () => {
    const h = harness({ listen: [{}] });
    const r = await startOrReuse(h.deps);
    assert.equal(r.outcome, 'started');
    assert.equal(r.server, h.fakeServer);
    assert.deepEqual(h.logs.info, [
      `Recipe Box is running at ${URL_} - opening your browser. Close this window to stop it.`,
    ]);
    assert.deepEqual(h.calls.opened, [URL_]);
    assert.equal(exitCodeFor('started'), null);
  });

  it('started with RECIPE_BOX_NO_OPEN: no browser', async () => {
    const h = harness({ listen: [{}], config: { ...CONFIG, openBrowser: false } });
    await startOrReuse(h.deps);
    assert.deepEqual(h.calls.opened, []);
  });

  it('already-running: opens the browser, exit 0', async () => {
    const h = harness({ listen: [errno('EADDRINUSE')], probe: ['ours'] });
    const r = await startOrReuse(h.deps);
    assert.equal(r.outcome, 'already-running');
    assert.deepEqual(h.logs.info, [
      `Recipe Box is already running at ${URL_} - opened it in your browser.`,
    ]);
    assert.deepEqual(h.calls.opened, [URL_]);
    assert.equal(exitCodeFor('already-running'), 0);
  });

  it('already-running with NO_OPEN: no browser', async () => {
    const h = harness({
      listen: [errno('EADDRINUSE')],
      probe: ['ours'],
      config: { ...CONFIG, openBrowser: false },
    });
    await startOrReuse(h.deps);
    assert.deepEqual(h.calls.opened, []);
  });

  it('port-conflict when the probe says other', async () => {
    const h = harness({ listen: [errno('EADDRINUSE')], probe: ['other'] });
    const r = await startOrReuse(h.deps);
    assert.equal(r.outcome, 'port-conflict');
    assert.deepEqual(h.logs.error, [CONFLICT]);
    assert.deepEqual(h.calls.opened, []);
    assert.equal(exitCodeFor('port-conflict'), 1);
  });

  it('probe none retries listen once and then starts', async () => {
    const h = harness({ listen: [errno('EADDRINUSE'), {}], probe: ['none'] });
    const r = await startOrReuse(h.deps);
    assert.equal(r.outcome, 'started');
    assert.equal(h.calls.listen, 2);
  });

  it('probe none twice: retries once only, then port-conflict', async () => {
    const h = harness({
      listen: [errno('EADDRINUSE'), errno('EADDRINUSE')],
      probe: ['none', 'none'],
    });
    const r = await startOrReuse(h.deps);
    assert.equal(r.outcome, 'port-conflict');
    assert.equal(h.calls.listen, 2);
    assert.deepEqual(h.logs.error, [CONFLICT]);
  });

  it('port-forbidden on EACCES', async () => {
    const h = harness({ listen: [errno('EACCES')] });
    const r = await startOrReuse(h.deps);
    assert.equal(r.outcome, 'port-forbidden');
    assert.deepEqual(h.logs.error, [
      'Windows does not allow Recipe Box to use port 47321 (reserved port range). See README "Port problems".',
    ]);
    assert.equal(exitCodeFor('port-forbidden'), 1);
  });

  it('rethrows unexpected listen errors', async () => {
    const h = harness({ listen: [errno('EMFILE')] });
    await assert.rejects(startOrReuse(h.deps), { code: 'EMFILE' });
  });
});

describe('probeExistingInstance', () => {
  /** @param {(req: any, res: any) => void} handler */
  async function withServer(handler) {
    const server = createServer(handler);
    await new Promise((r) => server.listen(0, '127.0.0.1', () => r(undefined)));
    const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
    return { origin: `http://127.0.0.1:${port}`, close: () => server.close() };
  }

  it('ours / other / timeout / none', async () => {
    const ours = await withServer((_q, s) => s.end('{"app":"recipe-box"}'));
    assert.equal(await probeExistingInstance(ours.origin, { appId: 'recipe-box' }), 'ours');
    ours.close();
    const wrongApp = await withServer((_q, s) => s.end('{"app":"x"}'));
    assert.equal(await probeExistingInstance(wrongApp.origin, { appId: 'recipe-box' }), 'other');
    wrongApp.close();
    const notJson = await withServer((_q, s) => s.end('hi'));
    assert.equal(await probeExistingInstance(notJson.origin, { appId: 'recipe-box' }), 'other');
    notJson.close();
    const status = await withServer((_q, s) => {
      s.statusCode = 404;
      s.end('{"app":"recipe-box"}');
    });
    assert.equal(await probeExistingInstance(status.origin, { appId: 'recipe-box' }), 'other');
    status.close();
    const slow = await withServer(() => {});
    assert.equal(
      await probeExistingInstance(slow.origin, { appId: 'recipe-box', timeoutMs: 50 }),
      'other',
    );
    slow.close();
    const gone = await withServer((_q, s) => s.end());
    gone.close();
    assert.equal(await probeExistingInstance(gone.origin, { appId: 'recipe-box' }), 'none');
  });
});

describe('createBrowserOpener', () => {
  /** @param {NodeJS.Platform} platform */
  function run(platform, throws = false) {
    /** @type {any[]} */
    const spawned = [];
    const errors = /** @type {Error[]} */ ([]);
    let unref = 0;
    const spawn = /** @type {any} */ (
      (/** @type {any[]} */ ...a) => {
        spawned.push(a);
        if (throws) throw new Error('boom');
        return { on: () => {}, unref: () => unref++ };
      }
    );
    createBrowserOpener({ platform, spawn, onError: (e) => errors.push(e) })(URL_);
    return { spawned, errors, unref };
  }

  it('win32 uses cmd /c start', () => {
    const r = run('win32');
    assert.deepEqual(r.spawned[0].slice(0, 2), ['cmd', ['/c', 'start', '""', URL_]]);
    assert.equal(r.spawned[0][2].windowsVerbatimArguments, true);
    assert.equal(r.unref, 1);
  });

  it('darwin and linux use open / xdg-open', () => {
    assert.equal(run('darwin').spawned[0][0], 'open');
    assert.equal(run('linux').spawned[0][0], 'xdg-open');
  });

  it('spawn errors are reported, not thrown', () => {
    assert.equal(run('win32', true).errors.length, 1);
  });
});

describe('createListen', () => {
  it('binds 127.0.0.1 only and rejects with the listen error', async () => {
    const listen = createListen((_q, s) => s.end());
    const server = await listen(0, '127.0.0.1');
    const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
    assert.equal(addr.address, '127.0.0.1');
    await assert.rejects(listen(addr.port, '127.0.0.1'), { code: 'EADDRINUSE' });
    server.close();
  });
});
