import { h } from '../dom.js';

/** @type {import('../router.js').MountScreen} */
export function mountNotFoundScreen(container) {
  container.append(
    h(
      'main',
      { class: 'page', 'data-testid': 'not-found' },
      h('h1', { text: 'Page not found' }),
      h('a', { class: 'btn', href: '#/', 'data-testid': 'back-to-list', text: 'All recipes' }),
    ),
  );
  return { unmount() {} };
}
