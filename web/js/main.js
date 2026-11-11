import { RecipeStore } from './store/recipe-store.js';
import { LocalStoragePersistence } from './persistence/local-storage-persistence.js';
import { createApp } from './ui/app.js';

const persistence = new LocalStoragePersistence({
  storage: window.localStorage,
  storageManager: navigator.storage,
  eventTarget: window,
});
const store = new RecipeStore(persistence);
await store.init();
void persistence.requestDurability();

const root = /** @type {HTMLElement} */ (document.getElementById('app'));
createApp({ root, store, window }).start();
