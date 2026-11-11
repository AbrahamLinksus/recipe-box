import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.RECIPE_BOX_PORT || 47321);
const root = new URL('../web/', import.meta.url);

// Skeleton only: serves the placeholder page and a health route. Replaced by the launcher (LLD section 1).
createServer(async (req, res) => {
  if (req.url === '/__recipe-box/health') {
    res.end('ok');
    return;
  }
  const file = req.url === '/js/main.js' ? 'js/main.js' : 'index.html';
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html');
  res.end(await readFile(new URL(file, root)));
}).listen(port, '127.0.0.1');
