import { realpathSync, statSync } from 'node:fs';
import { realpath, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ConfigError } from './config.js';

export const HEALTH_PATH = '/__recipe-box/health';

const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json'],
]);

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

const COMMON_HEADERS = {
  'Cache-Control': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': CSP,
};

/**
 * @param {string} ext
 * @returns {string | undefined}
 */
export function contentTypeFor(ext) {
  return CONTENT_TYPES.get(ext.toLowerCase());
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {{ status: number, type: string, body: string | Buffer, headOnly?: boolean,
 *   extra?: Record<string, string> }} reply
 */
function send(res, { status, type, body, headOnly = false, extra = {} }) {
  res.writeHead(status, {
    ...COMMON_HEADERS,
    ...extra,
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(headOnly ? undefined : body);
}

const TEXT = 'text/plain; charset=utf-8';

/**
 * Maps a request URL to a candidate file path inside webRoot, or null when unsafe.
 * @param {string} rawUrl
 * @param {string} webRoot
 * @returns {string | null}
 */
function resolveFile(rawUrl, webRoot) {
  const rawPath = rawUrl.split(/[?#]/, 1)[0] ?? '';
  if (rawPath.includes('..') || /%00|%2e%2e|%5c|\\|\0/i.test(rawPath)) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (/\0|\\|\.\./.test(decoded)) return null;
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const full = path.resolve(webRoot, relative);
  return full.startsWith(webRoot + path.sep) ? full : null;
}

/**
 * Returns the file contents and type, or null for anything that is not a servable file.
 * @param {string} rawUrl
 * @param {string} webRoot
 * @returns {Promise<{ body: Buffer, type: string } | null>}
 */
async function loadFile(rawUrl, webRoot) {
  const candidate = resolveFile(rawUrl, webRoot);
  if (!candidate) return null;
  const type = contentTypeFor(path.extname(candidate));
  if (!type) return null;
  try {
    const real = await realpath(candidate);
    if (!real.startsWith(webRoot + path.sep)) return null;
    if (!(await stat(real)).isFile()) return null;
    return { body: await readFile(real), type };
  } catch {
    return null;
  }
}

/**
 * Read per request so a list filled after listen(0) is honoured.
 * @param {string | undefined} host
 * @param {string[]} allowedHosts
 */
function isAllowedHost(host, allowedHosts) {
  const wanted = (host ?? '').toLowerCase();
  return allowedHosts.some((h) => h.toLowerCase() === wanted);
}

/**
 * Resolves the static root once at start (LLD §1.5); a missing root fails loudly instead of 404-ing everything.
 * @param {string} webRoot
 * @returns {string}
 * @throws {ConfigError} webRoot missing or not a folder
 */
function resolveRoot(webRoot) {
  try {
    const real = realpathSync(webRoot);
    if (statSync(real).isDirectory()) return real;
  } catch {
    // fall through to the error below
  }
  throw new ConfigError(`Web folder not found: ${webRoot}`);
}

/**
 * Short error id for the log line: the Node error code when there is one, else the message.
 * @param {unknown} e
 * @returns {string}
 */
function errorId(e) {
  if (e instanceof Error) return 'code' in e && typeof e.code === 'string' ? e.code : e.message;
  return String(e);
}

/**
 * `log` is optional (owner decision 2026-11-11, option A); main.js passes createLogger().
 * @param {{ webRoot: string, identity: { app: string, version: string }, allowedHosts: string[],
 *   log?: import('./log.js').Logger }} opts
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void}
 */
export function createRequestHandler(opts) {
  const healthBody = JSON.stringify({ app: opts.identity.app, version: opts.identity.version });
  // Resolved once at start; symlinks pointing outside are rejected per request.
  const rootReal = resolveRoot(path.resolve(opts.webRoot));

  /** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
  async function handle(req, res) {
    if (!isAllowedHost(req.headers.host, opts.allowedHosts)) {
      return send(res, { status: 403, type: TEXT, body: 'Forbidden host' });
    }
    const method = req.method ?? '';
    if (method !== 'GET' && method !== 'HEAD') {
      return send(res, {
        status: 405,
        type: TEXT,
        body: 'Method not allowed',
        extra: { Allow: 'GET, HEAD' },
      });
    }
    const headOnly = method === 'HEAD';
    const url = req.url ?? '/';
    if (url.split(/[?#]/, 1)[0] === HEALTH_PATH) {
      return send(res, { status: 200, type: 'application/json', body: healthBody, headOnly });
    }
    const file = await loadFile(url, rootReal);
    if (!file) return send(res, { status: 404, type: TEXT, body: 'Not found', headOnly });
    return send(res, { status: 200, type: file.type, body: file.body, headOnly });
  }

  return (req, res) => {
    handle(req, res).catch((/** @type {unknown} */ e) => {
      opts.log?.error('Request failed', { error: errorId(e), url: req.url ?? '' });
      if (!res.headersSent) send(res, { status: 500, type: TEXT, body: 'Server error' });
      else res.end();
    });
  };
}
