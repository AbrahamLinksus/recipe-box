// @ts-nocheck -- regex match groups are asserted, not narrowed
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../../web/index.html', import.meta.url), 'utf8');

describe('web/index.html', () => {
  it('has app root, alert banner and native confirm dialog with buttons', () => {
    assert.match(html, /id="app"/);
    assert.match(
      html,
      /<div[^>]*data-testid="banner"[^>]*role="alert"|<div[^>]*role="alert"[^>]*data-testid="banner"/,
    );
    assert.match(html, /<dialog[^>]*id="confirm-dialog"/);
    assert.match(html, /data-testid="confirm-ok"/);
    assert.match(html, /data-testid="confirm-cancel"/);
  });
  it('loads only /js/main.js and /css/app.css, no inline script/style', () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);
    assert.match(scripts[0][1], /src="\/js\/main\.js"/);
    assert.equal(scripts[0][2].trim(), '');
    const sheets = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)];
    assert.equal(sheets.length, 1);
    assert.match(sheets[0][0], /href="\/css\/app\.css"/);
    assert.doesNotMatch(html, /<style\b/i);
    assert.doesNotMatch(html, /\sstyle=/i);
    assert.doesNotMatch(html, /\son[a-z]+=/i);
  });
});
