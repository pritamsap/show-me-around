/**
 * Where the tour remembers things (last seen version, narration muted).
 * Default: the browser's localStorage. Electron apps should save to a settings file in the user's
 * AppData folder instead (see /tour-guide's references/electron-storage.md): localStorage is tied to the
 * page's origin, so it resets if the app changes how it loads its pages, and it is wiped with site data.
 */
export interface TourStorage {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
}

export const LAST_SEEN_KEY = 'showMeAround.lastSeenVersion';
export const MUTED_KEY = 'showMeAround.voiceMuted';

// localStorage can throw (private mode, disabled storage), so the tour must keep working without it.
export const browserStorage: TourStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not saved: the tour just shows again next launch.
    }
  },
};

/**
 * Uses `primary`, but copies over values that older versions of the tour saved in localStorage.
 * Without this, switching an existing app to a settings file would show every user the tour again.
 */
export function migrateFromBrowserStorage(primary: TourStorage): TourStorage {
  return {
    async get(key) {
      const value = await primary.get(key);
      if (value !== null) return value;
      const old = browserStorage.get(key) as string | null;
      if (old !== null) await primary.set(key, old);
      return old;
    },
    set: (key, value) => primary.set(key, value),
  };
}

/** Reads a value without ever throwing: a broken store behaves like an empty one. */
export async function safeGet(storage: TourStorage, key: string): Promise<string | null> {
  try {
    return await storage.get(key);
  } catch {
    return null;
  }
}

export async function safeSet(storage: TourStorage, key: string, value: string): Promise<void> {
  try {
    await storage.set(key, value);
  } catch {
    // Not saved: same as localStorage being unavailable.
  }
}
