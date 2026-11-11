import http from 'node:http';

/** @typedef {'ours' | 'other' | 'none'} ProbeResult */

const DEFAULT_TIMEOUT_MS = 1500;
const HEALTH_PATH = '/__recipe-box/health';

/**
 * @param {string} body
 * @param {string} appId
 * @returns {boolean}
 */
function isOurs(body, appId) {
  try {
    const data = /** @type {{ app?: unknown } | null} */ (JSON.parse(body));
    return data !== null && typeof data === 'object' && data.app === appId;
  } catch {
    return false;
  }
}

/**
 * Asks whatever listens on `origin` whether it is Recipe Box.
 * `none` = nothing is listening any more (connection refused); `other` = anything else.
 * @param {string} origin
 * @param {{ appId: string, timeoutMs?: number }} opts
 * @returns {Promise<ProbeResult>}
 */
export function probeExistingInstance(origin, opts) {
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise((resolve) => {
    const req = http.get(`${origin}${HEALTH_PATH}`, { timeout }, (res) => {
      /** @type {Buffer[]} */
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('error', () => resolve('other'));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(res.statusCode === 200 && isOurs(body, opts.appId) ? 'ours' : 'other');
      });
    });
    req.on('timeout', () => {
      resolve('other');
      req.destroy();
    });
    req.on('error', (err) => {
      resolve(
        /** @type {NodeJS.ErrnoException} */ (err).code === 'ECONNREFUSED' ? 'none' : 'other',
      );
    });
  });
}
