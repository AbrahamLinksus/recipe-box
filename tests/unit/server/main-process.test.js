import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const MAIN = new URL('../../../server/main.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
// A fixed port collides when several worktrees run check.sh at once; ask the OS for a free one.
let PORT = '';
/** @type {NodeJS.ProcessEnv} */
let env = {};

/** @returns {Promise<string>} */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const addr = probe.address();
      const port = addr && typeof addr === 'object' ? String(addr.port) : '';
      probe.close(() => resolve(port));
    });
  });
}

before(async () => {
  do PORT = await freePort();
  while (PORT === '47321'); // CONVENTIONS §5: tests never use the owner's port
  env = { ...process.env, RECIPE_BOX_PORT: PORT, RECIPE_BOX_NO_OPEN: '1' };
});

/** @param {import('node:child_process').ChildProcess} child */
function firstLine(child) {
  return new Promise((resolve) => {
    let buf = '';
    child.stdout?.on('data', (d) => {
      buf += d;
      if (buf.includes('\n')) resolve(buf.trim());
    });
    child.once('exit', () => resolve(buf.trim()));
  });
}

describe('server/main.js as a real process', () => {
  it('bad RECIPE_BOX_PORT prints the config message and exits 1', () => {
    const r = spawnSync(process.execPath, [MAIN], {
      env: { ...env, RECIPE_BOX_PORT: 'abc' },
      encoding: 'utf8',
    });
    assert.equal(r.status, 1);
    assert.equal(r.stderr.trim(), 'RECIPE_BOX_PORT must be a whole number between 1024 and 65535.');
  });

  it('starts, second run says already running (exit 0), foreign program gives conflict (exit 1)', async () => {
    const first = spawn(process.execPath, [MAIN], { env });
    try {
      assert.equal(
        await firstLine(first),
        `Recipe Box is running at http://127.0.0.1:${PORT}/ - opening your browser. Close this window to stop it.`,
      );
      const second = spawnSync(process.execPath, [MAIN], { env, encoding: 'utf8' });
      assert.equal(second.status, 0);
      assert.equal(
        second.stdout.trim(),
        `Recipe Box is already running at http://127.0.0.1:${PORT}/ - opened it in your browser.`,
      );
    } finally {
      first.kill();
    }
    await new Promise((r) => first.once('exit', r));

    const foreign = createServer((_q, res) => res.end('hi'));
    await new Promise((r) => foreign.listen(Number(PORT), '127.0.0.1', () => r(undefined)));
    try {
      const third = spawnSync(process.execPath, [MAIN], { env, encoding: 'utf8' });
      assert.equal(third.status, 1);
      assert.equal(
        third.stderr.trim(),
        `Port ${PORT} is used by another program, so Recipe Box cannot start. Close that program and run the command again (see README "Port problems").`,
      );
    } finally {
      foreign.close();
    }
  });
});

describe('start.cmd (§1.5)', () => {
  it('changes to its folder, runs the server and pauses on error', () => {
    const lines = readFileSync(new URL('../../../start.cmd', import.meta.url), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    assert.deepEqual(lines, [
      '@echo off',
      'cd /d "%~dp0"',
      ['node server', 'main.js'].join(String.fromCharCode(92)),
      'if errorlevel 1 pause',
    ]);
  });
});
