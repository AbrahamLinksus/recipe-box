import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, ConfigError } from '../../../server/config.js';

const MESSAGE = 'RECIPE_BOX_PORT must be a whole number between 1024 and 65535.';

describe('loadConfig', () => {
  it('empty env -> defaults', () => {
    const c = loadConfig({});
    assert.equal(c.port, 47321);
    assert.equal(c.host, '127.0.0.1');
    assert.equal(c.origin, 'http://127.0.0.1:47321');
    assert.equal(c.appId, 'recipe-box');
    assert.equal(c.openBrowser, true);
    assert.match(c.version, /^\d+\.\d+\.\d+/);
    assert.match(c.webRoot, /web[\\/]$/);
  });

  it('valid port and NO_OPEN -> applied', () => {
    const c = loadConfig({ RECIPE_BOX_PORT: '47399', RECIPE_BOX_NO_OPEN: '1' });
    assert.equal(c.origin, 'http://127.0.0.1:47399');
    assert.equal(c.openBrowser, false);
  });

  it('empty RECIPE_BOX_PORT -> default 47321', () => {
    const c = loadConfig({ RECIPE_BOX_PORT: '' });
    assert.equal(c.port, 47321);
    assert.equal(c.origin, 'http://127.0.0.1:47321');
  });

  for (const bad of ['80', 'abc', ' ', '1023', '65536', '4.5', '-1', '1e4']) {
    it(`RECIPE_BOX_PORT=${bad} -> ConfigError with the exact message`, () => {
      assert.throws(
        () => loadConfig({ RECIPE_BOX_PORT: bad }),
        (e) => e instanceof ConfigError && e.message === MESSAGE,
      );
    });
  }
});
