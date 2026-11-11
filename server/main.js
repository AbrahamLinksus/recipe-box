import { spawn } from 'node:child_process';
import { ConfigError, loadConfig } from './config.js';
import { createLogger } from './log.js';
import { createRequestHandler } from './static-handler.js';
import { probeExistingInstance } from './probe.js';
import { createBrowserOpener } from './browser.js';
import { createListen } from './listen.js';
import { exitCodeFor, startOrReuse } from './launcher.js';

/** @param {import('node:http').Server} server */
function stopOnSignal(server) {
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

async function main() {
  const log = createLogger();
  try {
    const config = loadConfig(process.env);
    const handler = createRequestHandler({
      webRoot: config.webRoot,
      identity: { app: config.appId, version: config.version },
      allowedHosts: [`127.0.0.1:${config.port}`, `localhost:${config.port}`],
      log,
    });
    const openBrowser = createBrowserOpener({
      platform: process.platform,
      spawn,
      onError: (err) =>
        log.error('Could not open the browser; open the address by hand.', { error: err.message }),
    });
    const { outcome, server } = await startOrReuse({
      config,
      listen: createListen(handler),
      probe: (origin) => probeExistingInstance(origin, { appId: config.appId }),
      openBrowser,
      log,
    });
    const code = exitCodeFor(outcome);
    if (code === null && server) stopOnSignal(server);
    else process.exitCode = code ?? 0;
  } catch (err) {
    if (err instanceof ConfigError) log.error(err.message);
    else log.error('Recipe Box could not start.', { error: String(err) });
    process.exitCode = 1;
  }
}

await main();
