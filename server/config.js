import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @typedef {{ host: '127.0.0.1', port: number, origin: string, webRoot: string,
 *   openBrowser: boolean, appId: 'recipe-box', version: string }} Config */

const DEFAULT_PORT = 47321;
const HOST = '127.0.0.1';

export class ConfigError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * @returns {string} the version from package.json
 * @throws {ConfigError} package.json has no string version
 */
function readVersion() {
  const url = new URL('../package.json', import.meta.url);
  const pkg = /** @type {unknown} */ (JSON.parse(readFileSync(url, 'utf8')));
  const version = pkg && typeof pkg === 'object' && 'version' in pkg ? pkg.version : undefined;
  if (typeof version !== 'string') throw new ConfigError('package.json has no version string.');
  return version;
}

/**
 * @param {string | undefined} raw
 * @returns {number}
 * @throws {ConfigError}
 */
function parsePort(raw) {
  // Empty counts as unset (§0.5: all variables optional, default 47321), e.g. `set RECIPE_BOX_PORT=`.
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const port = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new ConfigError('RECIPE_BOX_PORT must be a whole number between 1024 and 65535.');
  }
  return port;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {Config}
 * @throws {ConfigError} bad RECIPE_BOX_PORT
 */
export function loadConfig(env) {
  const port = parsePort(env.RECIPE_BOX_PORT);
  return {
    host: HOST,
    port,
    origin: `http://${HOST}:${port}`,
    webRoot: fileURLToPath(new URL('../web/', import.meta.url)),
    openBrowser: env.RECIPE_BOX_NO_OPEN !== '1',
    appId: 'recipe-box',
    version: readVersion(),
  };
}
