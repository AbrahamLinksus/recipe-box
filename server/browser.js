/** @typedef {(url: string) => void} BrowserOpener */

/**
 * @param {NodeJS.Platform} platform
 * @param {string} url
 * @returns {{ command: string, args: string[], options: import('node:child_process').SpawnOptions }}
 */
function commandFor(platform, url) {
  const options = { detached: true, stdio: /** @type {const} */ ('ignore') };
  if (platform === 'win32') {
    // The URL comes from config only (no user input, no `&`).
    return {
      command: 'cmd',
      args: ['/c', 'start', '""', url],
      options: { ...options, windowsVerbatimArguments: true },
    };
  }
  return { command: platform === 'darwin' ? 'open' : 'xdg-open', args: [url], options };
}

/**
 * Spawn failures are reported through `onError`, never thrown (the URL is always printed).
 * @param {{ platform: NodeJS.Platform, spawn: typeof import('node:child_process').spawn,
 *   onError?: (err: Error) => void }} deps
 * @returns {BrowserOpener}
 */
export function createBrowserOpener(deps) {
  return (url) => {
    const { command, args, options } = commandFor(deps.platform, url);
    try {
      const child = deps.spawn(command, args, options);
      child.on('error', (err) => deps.onError?.(err));
      child.unref();
    } catch (err) {
      deps.onError?.(/** @type {Error} */ (err));
    }
  };
}
