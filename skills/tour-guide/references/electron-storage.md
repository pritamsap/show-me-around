# Saving tour state to a settings file (Electron)

By default the tour remembers `showMeAround.lastSeenVersion` and `showMeAround.voiceMuted` in localStorage.
In Electron, save them to a JSON file in the user's AppData folder instead, the same way desktop apps keep their settings:

- localStorage belongs to the page's **origin**. Dev (`http://localhost:5173`) and production (`file://`) are different origins, and if the app ever changes how it loads its pages, every user sees the tour again.
- Clearing site data or cache wipes localStorage. A settings file stays.

Only the **main** process may touch the file system, so the renderer asks it over IPC:
renderer → preload (`window.tourStore`) → main (`ipcMain.handle`) → `userData/show-me-around.json`.

Follow the app's existing style (CommonJS `require` vs ESM `import`, where IPC handlers are registered, how the preload exposes APIs). If the preload already exposes an API object (e.g. `window.api`), add `tourStore` to it instead of creating a new global.

## If the app already has a settings store

Many apps already save settings (e.g. `electron-store`, or their own `settings.json` in `app.getPath('userData')`). Then use **that** store inside the two handlers below, under a `showMeAround` key, instead of creating a second file. Read the existing code first; never replace or reformat the app's own settings.

## Main process

Register once, after `app` is ready and before the window loads:

```js
const { app, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const tourFile = () => path.join(app.getPath('userData'), 'show-me-around.json');

function readTourState() {
  try {
    return JSON.parse(fs.readFileSync(tourFile(), 'utf8'));
  } catch {
    return {}; // no file yet, or unreadable: behave like a fresh install
  }
}

// Only accept the tour's own keys and string values, so the renderer can't write anything else.
const isTourKey = (key) => typeof key === 'string' && key.startsWith('showMeAround.');

ipcMain.handle('tour-store:get', (_event, key) => (isTourKey(key) ? (readTourState()[key] ?? null) : null));

ipcMain.handle('tour-store:set', (_event, key, value) => {
  if (!isTourKey(key) || typeof value !== 'string') return;
  const state = { ...readTourState(), [key]: value };
  // Write a temp file, then rename it over the real one: a crash mid-write can't leave half a file.
  const tmp = `${tourFile()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, tourFile());
});
```

## Preload

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tourStore', {
  get: (key) => ipcRenderer.invoke('tour-store:get', key),
  set: (key, value) => ipcRenderer.invoke('tour-store:set', key, value),
});
```

TypeScript renderers: declare it (e.g. in `env.d.ts`):

```ts
interface Window {
  tourStore?: { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void> };
}
```

## Renderer

Define the storage once, at module level, and pass it to the provider:

```tsx
import { migrateFromBrowserStorage, TourProvider } from './tour';

// Settings file in Electron; localStorage when the bridge is missing (e.g. the renderer opened in a browser).
const tourStorage = window.tourStore ? migrateFromBrowserStorage(window.tourStore) : undefined;

<TourProvider ... storage={tourStorage}>
```

`migrateFromBrowserStorage` copies values that an older version of the tour saved in localStorage into the file the first time they're read. **Always use it when switching an existing app**: without it, every current user would see the tour again after the update.

## Verify

Run the app, finish or skip the tour, then check the file exists and has the version:

- macOS: `~/Library/Application Support/<App Name>/show-me-around.json`
- Windows: `%APPDATA%\<App Name>\show-me-around.json`
- Linux: `~/.config/<App Name>/show-me-around.json`

Delete that file (and the old localStorage key, if any) to see the first-run tour again.
