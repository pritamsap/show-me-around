# Starting the tour or What's new from the Electron app menu

The menu lives in the **main** process, the tour lives in the **renderer**. They talk over IPC:
menu click → main sends `tour:start` with `'basic'` or `'whatsNew'` → preload forwards it → renderer calls `startTour(kind)`.

Only do this if the app already builds a menu with `Menu.setApplicationMenu` / `Menu.buildFromTemplate`.
Follow the app's existing IPC style: if the preload already exposes an API object (e.g. `window.api`), add to it instead of creating a new global.

## Main process: add a menu item
Add to the existing Help submenu (create one only if the app has none):

```ts
{
  label: 'Show me around',
  click: (_item, window) => window?.webContents.send('tour:start', 'basic'),
},
{
  label: "What's new",
  click: (_item, window) => window?.webContents.send('tour:start', 'whatsNew'),
},
```

## Preload: expose a safe listener

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tour', {
  // Returns an unsubscribe function so React can clean up.
  onStart: (callback: (kind: 'basic' | 'whatsNew') => void) => {
    const listener = (_event: unknown, kind: 'basic' | 'whatsNew') => callback(kind === 'whatsNew' ? 'whatsNew' : 'basic');
    ipcRenderer.on('tour:start', listener);
    return () => ipcRenderer.removeListener('tour:start', listener);
  },
});
```

Add the type for TypeScript renderers (e.g. in the renderer's `env.d.ts`):

```ts
interface Window {
  tour?: { onStart: (callback: (kind: 'basic' | 'whatsNew') => void) => () => void };
}
```

## Renderer: listen inside the provider tree

```tsx
import { useEffect } from 'react';
import { useTour } from './tour';

export function TourMenuListener() {
  const { startTour } = useTour();
  useEffect(() => window.tour?.onStart((kind) => startTour(kind)), [startTour]);
  return null;
}
```

Render `<TourMenuListener />` anywhere inside `<TourProvider>`.
