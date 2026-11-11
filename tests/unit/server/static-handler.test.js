import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createRequestHandler,
  contentTypeFor,
  HEALTH_PATH,
} from '../../../server/static-handler.js';
import { ConfigError } from '../../../server/config.js';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

/**
 * Raw request so paths like /../x and Host overrides are sent untouched.
 * @param {number} port
 * @param {{ method?: string, url?: string, host?: string }} [opts]
 */
function request(port, { method = 'GET', url = '/', host } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: url,
        headers: { Host: host ?? `127.0.0.1:${port}` },
      },
      (res) => {
        /** @type {Buffer[]} */
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ res, body: Buffer.concat(chunks).toString('utf8') }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('static handler', () => {
  /** @type {string} */
  let dir;
  /** @type {http.Server} */
  let server;
  /** @type {number} */
  let port;
  /** File symlinks need admin or developer mode on Windows; the junction test always runs. */
  let fileLinkMade = false;

  before(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'rb-web-'));
    const web = path.join(dir, 'web');
    mkdirSync(path.join(web, 'js'), { recursive: true });
    mkdirSync(path.join(web, 'sub'));
    writeFileSync(path.join(web, 'index.html'), '<h1>home</h1>');
    writeFileSync(path.join(web, 'js', 'main.js'), 'export {};');
    writeFileSync(path.join(web, 'app.css'), 'a{}');
    writeFileSync(path.join(web, 'favicon.svg'), '<svg/>');
    writeFileSync(path.join(web, 'data.json'), '{}');
    writeFileSync(path.join(web, 'notes.txt'), 'x');
    writeFileSync(path.join(dir, 'secret.html'), 'secret');
    mkdirSync(path.join(dir, 'outside'));
    writeFileSync(path.join(dir, 'outside', 'secret.html'), 'secret');
    symlinkSync(path.join(dir, 'outside'), path.join(web, 'out'), 'junction');
    try {
      symlinkSync(path.join(dir, 'secret.html'), path.join(web, 'link.html'), 'file');
      fileLinkMade = true;
    } catch {
      fileLinkMade = false;
    }
    /** @type {string[]} */
    const allowedHosts = [];
    const handler = createRequestHandler({
      webRoot: web,
      identity: { app: 'recipe-box', version: '9.9.9' },
      allowedHosts,
    });
    server = http.createServer(handler);
    await new Promise((r) => server.listen(0, '127.0.0.1', () => r(undefined)));
    port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
    allowedHosts.push(`127.0.0.1:${port}`, `localhost:${port}`);
  });

  after(async () => {
    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET / -> 200 index.html', async () => {
    const { res, body } = await request(port);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'text/html; charset=utf-8');
    assert.equal(body, '<h1>home</h1>');
  });

  it('health -> app and version JSON', async () => {
    const { res, body } = await request(port, { url: HEALTH_PATH });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(body), { app: 'recipe-box', version: '9.9.9' });
  });

  for (const [url, type] of [
    ['/index.html', 'text/html; charset=utf-8'],
    ['/js/main.js', 'text/javascript; charset=utf-8'],
    ['/app.css?v=1', 'text/css; charset=utf-8'],
    ['/favicon.svg', 'image/svg+xml'],
    ['/data.json', 'application/json'],
  ]) {
    it(`GET ${url} -> ${type}`, async () => {
      const { res } = await request(port, { url });
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['content-type'], type);
    });
  }

  it('HEAD / -> 200 with no body', async () => {
    const { res, body } = await request(port, { method: 'HEAD' });
    assert.equal(res.statusCode, 200);
    assert.equal(body, '');
  });

  for (const [label, url] of [
    ['missing file', '/nope.js'],
    ['directory', '/sub'],
    ['directory with slash', '/sub/'],
    ['unknown extension', '/notes.txt'],
    ['dot-dot', '/../secret.html'],
    ['nested dot-dot', '/js/../../secret.html'],
    ['encoded dot-dot', '/%2e%2e/secret.html'],
    ['NUL byte', '/index.html%00.js'],
    ['bad encoding', '/%E0%A4%A'],
    ['backslash', '/js%5Cmain.js'],
    ['mixed-encoded dot-dot', '/.%2e/secret.html'],
    ['mixed-encoded dot-dot reversed', '/%2e./secret.html'],
    ['double-encoded dot-dot', '/%252e%252e/secret.html'],
    ['overlong UTF-8 dot', '/%c0%ae%c0%ae/secret.html'],
    ['absolute drive path', '/C:/Windows/win.ini'],
    ['junction pointing outside web', '/out/secret.html'],
  ]) {
    it(`${label} -> 404 Not found`, async () => {
      const { res, body } = await request(port, { url });
      assert.equal(res.statusCode, 404);
      assert.match(res.headers['content-type'], /^text\/plain/);
      assert.equal(body, 'Not found');
    });
  }

  it('absolute path of a real file outside web -> 404', async () => {
    const abs = path.join(dir, 'secret.html').split(path.sep).join('/');
    const { res, body } = await request(port, { url: `/${abs.replace(/^\//, '')}` });
    assert.equal(res.statusCode, 404);
    assert.equal(body, 'Not found');
  });

  it('file symlink pointing outside web -> 404', async (t) => {
    if (!fileLinkMade) return t.skip('symlinkSync EPERM (no developer mode)');
    const { res, body } = await request(port, { url: '/link.html' });
    assert.equal(res.statusCode, 404);
    assert.equal(body, 'Not found');
  });

  /** @type {{ label: string, opts: { method: string, url?: string, host?: string }, status: number }[]} */
  const headCases = [
    { label: 'HEAD missing file', opts: { method: 'HEAD', url: '/nope.js' }, status: 404 },
    { label: 'HEAD foreign Host', opts: { method: 'HEAD', host: 'evil.example' }, status: 403 },
  ];
  for (const { label, opts, status } of headCases) {
    it(`${label} -> ${status} with headers and no body`, async () => {
      const { res, body } = await request(port, opts);
      assert.equal(res.statusCode, status);
      assert.equal(body, '');
      assert.equal(res.headers['content-security-policy'], CSP);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
    });
  }

  it('POST -> 405 with Allow', async () => {
    const { res } = await request(port, { method: 'POST' });
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'GET, HEAD');
  });

  it('foreign Host -> 403 Forbidden host', async () => {
    const { res, body } = await request(port, { host: 'evil.example' });
    assert.equal(res.statusCode, 403);
    assert.equal(body, 'Forbidden host');
  });

  for (const host of ['127.0.0.1:1', 'localhost', '127.0.0.1', '[::1]:PORT']) {
    it(`Host ${host} (wrong or missing port) -> 403 Forbidden host`, async () => {
      const { res, body } = await request(port, { host: host.replace('PORT', String(port)) });
      assert.equal(res.statusCode, 403);
      assert.equal(body, 'Forbidden host');
    });
  }

  it('localhost Host -> allowed', async () => {
    const { res } = await request(port, { host: `localhost:${port}` });
    assert.equal(res.statusCode, 200);
  });

  it('every response kind carries the security headers', async () => {
    const responses = await Promise.all([
      request(port),
      request(port, { url: HEALTH_PATH }),
      request(port, { url: '/missing.js' }),
      request(port, { method: 'POST' }),
      request(port, { host: 'evil.example' }),
    ]);
    for (const { res } of responses) {
      assert.equal(res.headers['cache-control'], 'no-cache');
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['referrer-policy'], 'no-referrer');
      assert.equal(res.headers['content-security-policy'], CSP);
    }
  });
});

describe('createRequestHandler start-up', () => {
  it('missing web root -> throws ConfigError naming the folder', () => {
    const missing = path.join(tmpdir(), 'rb-no-such-web-root');
    assert.throws(
      () =>
        createRequestHandler({
          webRoot: missing,
          identity: { app: 'recipe-box', version: '9.9.9' },
          allowedHosts: [],
        }),
      (e) => e instanceof ConfigError && e.message === `Web folder not found: ${missing}`,
    );
  });

  it('web root is a file -> throws ConfigError', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rb-file-root-'));
    const file = path.join(dir, 'index.html');
    writeFileSync(file, 'x');
    try {
      assert.throws(
        () =>
          createRequestHandler({
            webRoot: file,
            identity: { app: 'a', version: '1' },
            allowedHosts: [],
          }),
        ConfigError,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('createRequestHandler 500 path', () => {
  /**
   * Fake response whose first writeHead throws `failure`; resolves with what was sent.
   * @param {unknown} failure
   */
  function failingResponse(failure) {
    /** @type {{ status: number, body: unknown }[]} */
    const sent = [];
    let calls = 0;
    /** @type {(v: typeof sent) => void} */
    let done = () => {};
    /** @type {Promise<typeof sent>} */
    const finished = new Promise((r) => (done = r));
    const fake = {
      headersSent: false,
      writeHead(/** @type {number} */ status) {
        calls += 1;
        if (calls === 1) throw failure;
        sent.push({ status, body: undefined });
      },
      end(/** @type {unknown} */ body) {
        const last = sent.at(-1);
        if (last) last.body = body;
        done(sent);
      },
    };
    const res = /** @type {import('node:http').ServerResponse} */ (/** @type {unknown} */ (fake));
    return { res, finished };
  }

  /** @param {(msg: string, fields?: Record<string, unknown>) => void} [onError] */
  function makeHandler(onError) {
    const dir = mkdtempSync(path.join(tmpdir(), 'rb-500-'));
    const base = {
      webRoot: dir,
      identity: { app: 'recipe-box', version: '9.9.9' },
      allowedHosts: ['127.0.0.1:1'],
    };
    const handler = createRequestHandler(
      onError ? { ...base, log: { info: () => {}, error: onError } } : base,
    );
    return { handler, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  }

  const req = /** @type {import('node:http').IncomingMessage} */ (
    /** @type {unknown} */ ({ headers: { host: '127.0.0.1:1' }, method: 'GET', url: HEALTH_PATH })
  );

  /** @type {{ label: string, failure: unknown, id: string }[]} */
  const failures = [
    {
      label: 'error with code',
      failure: Object.assign(new Error('boom'), { code: 'EFAKE' }),
      id: 'EFAKE',
    },
    { label: 'error without code', failure: new Error('boom'), id: 'boom' },
    { label: 'non-Error throw', failure: 'weird', id: 'weird' },
  ];
  for (const { label, failure, id } of failures) {
    it(`${label} with log -> logged and 500 Server error`, async () => {
      /** @type {{ msg: string, fields: unknown }[]} */
      const logged = [];
      const { handler, cleanup } = makeHandler((msg, fields) => logged.push({ msg, fields }));
      const { res, finished } = failingResponse(failure);
      handler(req, res);
      const sent = await finished;
      cleanup();
      assert.deepEqual(logged, [
        { msg: 'Request failed', fields: { error: id, url: HEALTH_PATH } },
      ]);
      assert.deepEqual(sent, [{ status: 500, body: 'Server error' }]);
    });
  }

  it('failure without log -> still 500 Server error', async () => {
    const { handler, cleanup } = makeHandler();
    const { res, finished } = failingResponse(new Error('boom'));
    handler(req, res);
    const sent = await finished;
    cleanup();
    assert.deepEqual(sent, [{ status: 500, body: 'Server error' }]);
  });
});

describe('contentTypeFor', () => {
  it('known and unknown extensions', () => {
    assert.equal(contentTypeFor('.JS'), 'text/javascript; charset=utf-8');
    assert.equal(contentTypeFor('.exe'), undefined);
  });
});
