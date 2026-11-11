import { createBanner } from './banner.js';
import { createDialogs } from './dialogs.js';
import { createFilterState } from './filter-state.js';
import { createRouter } from './router.js';
import { clear } from './dom.js';
import { mountListScreen } from './screens/list-screen.js';
import { mountNotFoundScreen } from './screens/not-found-screen.js';

const STATUS_MESSAGES = {
  unreadable:
    'Your saved recipes could not be read, so Recipe Box will not change them. Nothing has been deleted.',
  unavailable:
    'This browser is blocking storage for Recipe Box, so recipes cannot be loaded or saved.',
};
const GENERIC_ERROR = 'Something went wrong. Reload the page to continue.';

/** Screens by route name; routes without a screen yet fall back to "Page not found". */
const SCREENS = { list: mountListScreen };

/**
 * Mirrors the store status (unreadable / unavailable) in the banner.
 * @param {import('../store/recipe-store.js').RecipeStore} store
 * @param {import('./banner.js').Banner} banner
 * @returns {() => void}
 */
function createStatusSync(store, banner) {
  let shown = false;
  return () => {
    const message = STATUS_MESSAGES[/** @type {'unreadable' | 'unavailable'} */ (store.status)];
    if (message) {
      banner.show('error', message);
      shown = true;
    } else if (shown) {
      banner.clear();
      shown = false;
    }
  };
}

/**
 * Routes window errors and unhandled rejections (incl. store listener errors reported
 * through globalThis.reportError) to the banner.
 * @param {Window} window
 * @param {import('./banner.js').Banner} banner
 */
function listenForFailures(window, banner) {
  /** @param {unknown} err */
  const report = (err) => {
    console.error(err);
    banner.show('error', GENERIC_ERROR);
  };
  window.addEventListener('error', (e) => report(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => report(e.reason));
}

/**
 * @param {{ root: HTMLElement, store: import('../store/recipe-store.js').RecipeStore, window: Window }} deps
 * @returns {{ start(): void }}
 */
export function createApp({ root, store, window }) {
  const banner = createBanner(
    /** @type {HTMLElement} */ (window.document.getElementById('banner')),
  );
  const dialogs = createDialogs();
  const filterState = createFilterState();
  /** @type {import('./router.js').ScreenHandle | null} */
  let current = null;

  /** @param {import('./router.js').Route} route */
  function mount(route) {
    current?.unmount();
    clear(root);
    const mountScreen = SCREENS[/** @type {'list'} */ (route.name)] ?? mountNotFoundScreen;
    current = mountScreen(root, { store, router, dialogs, banner, filterState }, route);
  }

  const router = createRouter({
    window,
    onRoute: mount,
    canLeave: async () => (current?.canLeave ? current.canLeave() : true),
  });

  return {
    start() {
      listenForFailures(window, banner);
      const syncStatus = createStatusSync(store, banner);
      store.subscribe(syncStatus);
      syncStatus();
      router.start();
    },
  };
}
