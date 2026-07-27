// SPDX-License-Identifier: MPL-2.0

export const THEME_PREFERENCES = [
  'system',
  'light',
  'dark',
] as const;

export type ThemePreference =
  (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export interface ThemeSnapshot {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

type Listener = () => void;

const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<Listener>();
let initializationPromise: Promise<void> | null = null;
let stopWatchingPreference: (() => void) | null = null;
let stopWatchingSystemTheme: (() => void) | null = null;
let systemTheme = readSystemTheme();
let snapshot = createSnapshot('system');
let preferenceWriteQueue = Promise.resolve();
let preferenceWriteRevision = 0;
let requestedPreference: ThemePreference | null = null;
let suppressedPreference: ThemePreference | null = null;

export function getThemeSnapshot(): ThemeSnapshot {
  return snapshot;
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function initializeTheme(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeThemePreference();
  }
  return initializationPromise;
}

export async function setThemePreference(
  preference: ThemePreference,
): Promise<void> {
  const previousPreference = snapshot.preference;
  const writeRevision = ++preferenceWriteRevision;
  requestedPreference = preference;
  applyPreference(preference);

  const write = preferenceWriteQueue.then(async () => {
    const { themePreferenceStorage } =
      await import('./theme-preference');
    await themePreferenceStorage.setValue(preference);
  });
  preferenceWriteQueue = write.catch(() => undefined);

  try {
    await write;
    if (writeRevision === preferenceWriteRevision) {
      requestedPreference = null;
      if (suppressedPreference !== null) {
        await reconcileStoredPreference(preference);
      }
    }
  } catch (error: unknown) {
    if (writeRevision === preferenceWriteRevision) {
      requestedPreference = null;
      await reconcileStoredPreference(previousPreference);
    }
    throw error;
  }
}

export function normalizeThemePreference(
  preference: unknown,
): ThemePreference {
  return THEME_PREFERENCES.includes(
    preference as ThemePreference,
  )
    ? (preference as ThemePreference)
    : 'system';
}

export function resolveTheme(
  preference: ThemePreference,
  fallbackSystemTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === 'system'
    ? fallbackSystemTheme
    : preference;
}

export function applyThemeToElement(
  element: HTMLElement,
  nextSnapshot: ThemeSnapshot = snapshot,
): void {
  const isDark = nextSnapshot.resolvedTheme === 'dark';
  element.classList.toggle('dark', isDark);
  element.dataset.theme = nextSnapshot.preference;
  element.dataset.resolvedTheme = nextSnapshot.resolvedTheme;
  element.style.colorScheme = nextSnapshot.resolvedTheme;
}

async function initializeThemePreference(): Promise<void> {
  initializeSystemThemeObserver();

  try {
    const { themePreferenceStorage } =
      await import('./theme-preference');
    applyPreference(
      normalizeThemePreference(
        await themePreferenceStorage.getValue(),
      ),
    );

    if (!stopWatchingPreference) {
      stopWatchingPreference = themePreferenceStorage.watch(
        (nextPreference) => {
          const normalizedPreference =
            normalizeThemePreference(nextPreference);
          if (
            requestedPreference &&
            normalizedPreference !== requestedPreference
          ) {
            suppressedPreference = normalizedPreference;
            return;
          }
          applyPreference(normalizedPreference);
        },
      );
    }
  } catch (error: unknown) {
    console.error(
      '[SnippetVault] Failed to initialize the theme preference',
      error,
    );
    applyPreference('system');
  }
}

function initializeSystemThemeObserver(): void {
  const mediaQuery = getColorSchemeMediaQuery();
  systemTheme = mediaQuery?.matches ? 'dark' : 'light';
  applyPreference(snapshot.preference);

  if (!mediaQuery || stopWatchingSystemTheme) {
    return;
  }

  const handleSystemThemeChange = (
    event: MediaQueryListEvent,
  ) => {
    systemTheme = event.matches ? 'dark' : 'light';
    applyPreference(snapshot.preference);
  };
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  stopWatchingSystemTheme = () => {
    mediaQuery.removeEventListener(
      'change',
      handleSystemThemeChange,
    );
  };
}

async function reconcileStoredPreference(
  fallback: ThemePreference,
): Promise<void> {
  const suppressed = suppressedPreference;
  suppressedPreference = null;
  try {
    const { themePreferenceStorage } =
      await import('./theme-preference');
    applyPreference(
      normalizeThemePreference(
        await themePreferenceStorage.getValue(),
      ),
    );
  } catch (error: unknown) {
    console.error(
      '[SnippetVault] Failed to reconcile the theme preference',
      error,
    );
    applyPreference(suppressed ?? fallback);
  }
}

function applyPreference(preference: ThemePreference): void {
  const nextSnapshot = createSnapshot(preference);
  if (
    snapshot.preference === nextSnapshot.preference &&
    snapshot.resolvedTheme === nextSnapshot.resolvedTheme
  ) {
    return;
  }

  snapshot = nextSnapshot;
  for (const listener of listeners) {
    listener();
  }
}

function createSnapshot(
  preference: ThemePreference,
): ThemeSnapshot {
  return {
    preference,
    resolvedTheme: resolveTheme(preference, systemTheme),
  };
}

function readSystemTheme(): ResolvedTheme {
  return getColorSchemeMediaQuery()?.matches ? 'dark' : 'light';
}

function getColorSchemeMediaQuery(): MediaQueryList | null {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }
  return window.matchMedia(COLOR_SCHEME_QUERY);
}
