import { createServer } from 'node:http';

/**
 * Builds the `listen` dependency of the launcher: creates an HTTP server for `handler` and
 * resolves once it is listening, or rejects with the listen error (EADDRINUSE, EACCES, ...).
 * @param {import('node:http').RequestListener} handler
 * @returns {(port: number, host: string) => Promise<import('node:http').Server>}
 */
export function createListen(handler) {
  return (port, host) =>
    new Promise((resolve, reject) => {
      const server = createServer(handler);
      server.once('error', reject);
      server.listen(port, host, () => {
        server.off('error', reject);
        resolve(server);
      });
    });
}
