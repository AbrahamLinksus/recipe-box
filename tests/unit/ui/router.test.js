// @ts-nocheck -- hand-written DOM fakes are intentionally partial
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeToHash, createRouter } from '../../../web/js/ui/router.js';

function fakeWindow(hash = '') {
  const listeners = [];
  const calls = [];
  const win = {
    location: { hash },
    history: {
      replaceState(_s, _t, url) {
        calls.push(url);
        win.location.hash = url;
      },
    },
    addEventListener(_type, fn) {
      listeners.push(fn);
    },
    fire(next) {
      win.location.hash = next;
      listeners.forEach((fn) => fn());
    },
    calls,
  };
  return win;
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('parseRoute', () => {
  const cases = [
    ['', { name: 'list' }],
    ['#/', { name: 'list' }],
    ['#/recipe/abc', { name: 'view', id: 'abc' }],
    ['#/recipe/abc/edit', { name: 'edit', id: 'abc' }],
    ['#/new', { name: 'new' }],
    ['#/nope', { name: 'notFound' }],
    ['#/recipe/', { name: 'notFound' }],
    ['#/recipe/abc/x', { name: 'notFound' }],
    ['#/recipe/%E0%A4%A', { name: 'notFound' }],
  ];
  for (const [hash, route] of cases) {
    it(`'${hash}' -> ${route.name}`, () => assert.deepEqual(parseRoute(hash), route));
  }
});

describe('routeToHash', () => {
  it('round-trips every route', () => {
    for (const hash of ['#/', '#/new', '#/recipe/abc', '#/recipe/abc/edit']) {
      assert.equal(routeToHash(parseRoute(hash)), hash);
    }
  });
  it('encodes ids and maps notFound to an unknown hash', () => {
    assert.equal(routeToHash({ name: 'view', id: 'a/b' }), '#/recipe/a%2Fb');
    assert.equal(parseRoute(routeToHash({ name: 'view', id: 'a/b' })).id, 'a/b');
    assert.equal(parseRoute(routeToHash({ name: 'notFound' })).name, 'notFound');
  });
});

describe('createRouter', () => {
  it('start -> reports the current route', () => {
    const seen = [];
    createRouter({
      window: fakeWindow('#/new'),
      onRoute: (r) => seen.push(r),
      canLeave: async () => true,
    }).start();
    assert.deepEqual(seen, [{ name: 'new' }]);
  });

  it('hashchange with canLeave true -> routes', async () => {
    const win = fakeWindow('');
    const seen = [];
    createRouter({
      window: win,
      onRoute: (r) => seen.push(r.name),
      canLeave: async () => true,
    }).start();
    win.fire('#/recipe/x');
    await tick();
    assert.deepEqual(seen, ['list', 'view']);
  });

  it('hashchange with canLeave false -> restores previous hash via replaceState', async () => {
    const win = fakeWindow('#/recipe/x/edit');
    const seen = [];
    createRouter({
      window: win,
      onRoute: (r) => seen.push(r.name),
      canLeave: async () => false,
    }).start();
    win.fire('#/');
    await tick();
    assert.deepEqual(win.calls, ['#/recipe/x/edit']);
    assert.deepEqual(seen, ['edit']);
  });

  it('second hashchange while canLeave is pending -> one prompt, no wrong route', async () => {
    const win = fakeWindow('#/new');
    const seen = [];
    let prompts = 0;
    let answer;
    createRouter({
      window: win,
      onRoute: (r) => seen.push(r.name),
      canLeave: () => {
        prompts++;
        return new Promise((r) => (answer = r));
      },
    }).start();
    win.fire('#/');
    win.fire('#/recipe/x');
    await tick();
    assert.equal(prompts, 1);
    assert.equal(win.location.hash, '#/');
    answer(true);
    await tick();
    assert.deepEqual(seen, ['new', 'list']);
  });

  it('rejected canLeave -> stays and restores the hash', async () => {
    const win = fakeWindow('#/new');
    const seen = [];
    createRouter({
      window: win,
      onRoute: (r) => seen.push(r.name),
      canLeave: async () => {
        throw new Error('boom');
      },
    }).start();
    win.fire('#/');
    await tick();
    assert.equal(win.location.hash, '#/new');
    assert.deepEqual(seen, ['new']);
  });

  it("empty hash and '#/' are the same location", async () => {
    const win = fakeWindow('');
    const seen = [];
    createRouter({
      window: win,
      onRoute: (r) => seen.push(r.name),
      canLeave: async () => true,
    }).start();
    win.fire('#/');
    await tick();
    assert.deepEqual(seen, ['list']);
  });

  it('canLeave false from an empty start restores #/', async () => {
    const win = fakeWindow('');
    createRouter({ window: win, onRoute() {}, canLeave: async () => false }).start();
    win.fire('#/new');
    await tick();
    assert.deepEqual(win.calls, ['#/']);
  });

  it('navigate -> sets hash; replace -> replaceState and routes directly', () => {
    const win = fakeWindow('');
    const seen = [];
    const router = createRouter({
      window: win,
      onRoute: (r) => seen.push(r.name),
      canLeave: async () => true,
    });
    router.start();
    router.navigate({ name: 'new' });
    assert.equal(win.location.hash, '#/new');
    router.navigate({ name: 'view', id: 'a' }, { replace: true });
    assert.deepEqual(win.calls, ['#/recipe/a']);
    assert.deepEqual(seen, ['list', 'view']);
  });
});
