/**
 * @typedef {{ name: 'list' } | { name: 'view', id: string } | { name: 'new' }
 *   | { name: 'edit', id: string } | { name: 'notFound' }} Route
 * @typedef {{ start(): void, navigate(route: Route, opts?: { replace?: boolean }): void }} Router
 *
 * @typedef {{ store: import('../store/recipe-store.js').RecipeStore, router: Router,
 *   dialogs: import('./dialogs.js').Dialogs, banner: import('./banner.js').Banner,
 *   filterState: import('./filter-state.js').FilterState }} ScreenContext
 * @typedef {{ unmount(): void, canLeave?(): Promise<boolean> }} ScreenHandle
 * @typedef {(container: HTMLElement, ctx: ScreenContext, route: Route) => ScreenHandle} MountScreen
 */

/**
 * @param {string} segment
 * @returns {string | null}
 */
function decodeId(segment) {
  try {
    return segment ? decodeURIComponent(segment) : null;
  } catch {
    return null;
  }
}

/**
 * @param {string[]} parts path segments after the leading empty one, starting with 'recipe'
 * @returns {Route}
 */
function parseRecipePath(parts) {
  const id = decodeId(parts[1] ?? '');
  if (id === null) return { name: 'notFound' };
  if (parts.length === 2) return { name: 'view', id };
  if (parts.length === 3 && parts[2] === 'edit') return { name: 'edit', id };
  return { name: 'notFound' };
}

/**
 * @param {string} hash e.g. '#/recipe/abc/edit'
 * @returns {Route}
 */
export function parseRoute(hash) {
  const path = hash.replace(/^#/, '');
  if (path === '' || path === '/') return { name: 'list' };
  if (path === '/new') return { name: 'new' };
  const parts = path.split('/');
  if (parts[0] !== '' || parts[1] !== 'recipe') return { name: 'notFound' };
  return parseRecipePath(parts.slice(1));
}

/**
 * @param {Route} route
 * @returns {string}
 */
export function routeToHash(route) {
  switch (route.name) {
    case 'list':
      return '#/';
    case 'new':
      return '#/new';
    case 'view':
      return `#/recipe/${encodeURIComponent(route.id)}`;
    case 'edit':
      return `#/recipe/${encodeURIComponent(route.id)}/edit`;
    default:
      return '#/not-found';
  }
}

/** @param {string} hash @returns {string} '' and '#/' are the same location */
function norm(hash) {
  return hash === '' ? '#/' : hash;
}

/**
 * A rejected canLeave means "stay".
 * @param {() => Promise<boolean>} canLeave
 * @returns {Promise<boolean>}
 */
async function safeCanLeave(canLeave) {
  try {
    return await canLeave();
  } catch {
    return false;
  }
}

/**
 * @param {{ window: Window, onRoute: (r: Route) => void, canLeave: () => Promise<boolean> }} deps
 * @returns {Router}
 */
export function createRouter({ window, onRoute, canLeave }) {
  let current = '#/';
  /** @type {string | null} hash whose canLeave() is awaiting an answer */
  let pendingHash = null;

  async function onHashChange() {
    const next = norm(window.location.hash);
    if (pendingHash !== null) {
      // a prompt is already open: keep the URL on the hash being decided
      if (next !== pendingHash) window.history.replaceState(null, '', pendingHash);
      return;
    }
    if (next === current) return;
    pendingHash = next;
    const ok = await safeCanLeave(canLeave);
    pendingHash = null;
    if (ok) {
      current = next;
      onRoute(parseRoute(next));
    } else {
      window.history.replaceState(null, '', current);
    }
  }

  return {
    start() {
      current = norm(window.location.hash);
      window.addEventListener('hashchange', () => void onHashChange());
      onRoute(parseRoute(current));
    },
    navigate(route, opts = {}) {
      const hash = routeToHash(route);
      if (opts.replace) {
        current = hash;
        window.history.replaceState(null, '', hash);
        onRoute(route);
      } else {
        window.location.hash = hash;
      }
    },
  };
}
