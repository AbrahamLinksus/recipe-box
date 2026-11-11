/** @typedef {import('./config.js').Config} Config */
/** @typedef {import('./log.js').Logger} Logger */
/** @typedef {import('./probe.js').ProbeResult} ProbeResult */
/** @typedef {import('./browser.js').BrowserOpener} BrowserOpener */
/** @typedef {'started' | 'already-running' | 'port-conflict' | 'port-forbidden'} LaunchOutcome */
/** @typedef {{ config: Config,
 *   listen: (port: number, host: string) => Promise<import('node:http').Server>,
 *   probe: (origin: string) => Promise<ProbeResult>,
 *   openBrowser: BrowserOpener, log: Logger }} LauncherDeps */
/** @typedef {{ outcome: LaunchOutcome, server?: import('node:http').Server }} LaunchResult */

/**
 * @param {unknown} err
 * @returns {string | undefined}
 */
function codeOf(err) {
  return err && typeof err === 'object' && 'code' in err ? String(err.code) : undefined;
}

/**
 * @param {LauncherDeps} deps
 * @param {'port-conflict' | 'port-forbidden'} outcome
 * @returns {LaunchResult}
 */
function fail({ config, log }, outcome) {
  if (outcome === 'port-forbidden') {
    log.error(
      `Windows does not allow Recipe Box to use port ${config.port} (reserved port range). See README "Port problems".`,
    );
  } else {
    log.error(
      `Port ${config.port} is used by another program, so Recipe Box cannot start. ` +
        'Close that program and run the command again (see README "Port problems").',
    );
  }
  return { outcome };
}

/**
 * @param {LauncherDeps} deps
 * @param {boolean} canRetry a probe result of `none` may retry listen once
 * @returns {Promise<LaunchResult>}
 */
async function attempt(deps, canRetry) {
  const { config, listen, probe, openBrowser, log } = deps;
  const url = `${config.origin}/`;
  try {
    const server = await listen(config.port, config.host);
    log.info(
      `Recipe Box is running at ${url} - opening your browser. Close this window to stop it.`,
    );
    if (config.openBrowser) openBrowser(url);
    return { outcome: 'started', server };
  } catch (err) {
    const code = codeOf(err);
    if (code === 'EACCES') return fail(deps, 'port-forbidden');
    if (code !== 'EADDRINUSE') throw err;
  }
  const found = await probe(config.origin);
  if (found === 'ours') {
    log.info(`Recipe Box is already running at ${url} - opened it in your browser.`);
    if (config.openBrowser) openBrowser(url);
    return { outcome: 'already-running' };
  }
  if (found === 'none' && canRetry) return attempt(deps, false);
  return fail(deps, 'port-conflict');
}

/**
 * Starts the server, or reuses an instance that already runs on the port.
 * @param {LauncherDeps} deps
 * @returns {Promise<LaunchResult>}
 */
export function startOrReuse(deps) {
  return attempt(deps, true);
}

/**
 * @param {LaunchOutcome} outcome
 * @returns {0 | 1 | null} null = keep running
 */
export function exitCodeFor(outcome) {
  if (outcome === 'started') return null;
  return outcome === 'already-running' ? 0 : 1;
}
