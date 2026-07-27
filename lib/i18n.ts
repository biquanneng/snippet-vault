// SPDX-License-Identifier: MPL-2.0

import {
  normalizeLanguagePreference,
  resolveLocale,
  type LanguagePreference,
  type SupportedLocale,
} from './i18n-catalog';

export interface I18nSnapshot {
  preference: LanguagePreference;
  locale: SupportedLocale;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let initializationPromise: Promise<void> | null = null;
let stopWatchingPreference: (() => void) | null = null;
let snapshot = createSnapshot('system');
let preferenceWriteQueue = Promise.resolve();
let preferenceWriteRevision = 0;
let requestedPreference: LanguagePreference | null = null;
let suppressedPreference: LanguagePreference | null = null;

export function getI18nSnapshot(): I18nSnapshot {
  return snapshot;
}

export function subscribeI18n(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function initializeLanguage(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeLanguagePreference();
  }
  return initializationPromise;
}

export async function setUiLanguagePreference(
  preference: LanguagePreference,
): Promise<void> {
  const previousPreference = snapshot.preference;
  const writeRevision = ++preferenceWriteRevision;
  requestedPreference = preference;
  applyPreference(preference);

  const write = preferenceWriteQueue.then(async () => {
    const { languagePreferenceStorage } =
      await import('./language-preference');
    await languagePreferenceStorage.setValue(preference);
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

export function getUiLocale(): SupportedLocale {
  return snapshot.locale;
}

async function initializeLanguagePreference(): Promise<void> {
  try {
    const { languagePreferenceStorage } =
      await import('./language-preference');
    const preference = normalizeLanguagePreference(
      await languagePreferenceStorage.getValue(),
    );
    applyPreference(preference);

    if (!stopWatchingPreference) {
      stopWatchingPreference = languagePreferenceStorage.watch(
        (nextPreference) => {
          const normalizedPreference =
            normalizeLanguagePreference(nextPreference);
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
      '[SnippetVault] Failed to initialize the language preference',
      error,
    );
    applyPreference('system');
  }
}

async function reconcileStoredPreference(
  fallback: LanguagePreference,
): Promise<void> {
  const suppressed = suppressedPreference;
  suppressedPreference = null;
  try {
    const { languagePreferenceStorage } =
      await import('./language-preference');
    applyPreference(
      normalizeLanguagePreference(
        await languagePreferenceStorage.getValue(),
      ),
    );
  } catch (error: unknown) {
    console.error(
      '[SnippetVault] Failed to reconcile the language preference',
      error,
    );
    applyPreference(suppressed ?? fallback);
  }
}

function applyPreference(preference: LanguagePreference): void {
  const nextSnapshot = createSnapshot(preference);
  if (
    snapshot.preference === nextSnapshot.preference &&
    snapshot.locale === nextSnapshot.locale
  ) {
    return;
  }

  snapshot = nextSnapshot;
  for (const listener of listeners) {
    listener();
  }
}

function createSnapshot(
  preference: LanguagePreference,
): I18nSnapshot {
  return {
    preference,
    locale: resolveLocale(preference, getBrowserUiLanguage()),
  };
}

function getBrowserUiLanguage(): string {
  try {
    return browser.i18n.getUILanguage();
  } catch {
    return 'en';
  }
}
