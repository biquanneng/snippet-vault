// SPDX-License-Identifier: MPL-2.0

import { browser } from 'wxt/browser';

import { MAX_SOURCE_TITLE_LENGTH, MAX_SOURCE_URL_LENGTH } from './message-contract';

/**
 * The side panel asks the active tab's content script for its own URL and
 * title. This avoids requesting the `tabs` permission just to read `tab.url`.
 */
export const GET_PAGE_SOURCE_MESSAGE = 'snippet-vault/get-page-source';

const PAGE_SOURCE_TIMEOUT_MS = 1_000;

export interface PageSource {
  title?: string;
  url: string;
}

/** Reads the current document as a snippet source, or null when unsupported. */
export function readDocumentSource(
  location: Pick<Location, 'href'> = window.location,
  title: string = document.title,
): PageSource | null {
  return toPageSource(location.href, title);
}

export function toPageSource(
  url: unknown,
  title: unknown,
): PageSource | null {
  if (typeof url !== 'string' || url.length > MAX_SOURCE_URL_LENGTH) {
    return null;
  }
  try {
    const { protocol } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') {
      return null;
    }
  } catch {
    return null;
  }

  const normalizedTitle =
    typeof title === 'string'
      ? title.trim().slice(0, MAX_SOURCE_TITLE_LENGTH)
      : '';
  return normalizedTitle ? { title: normalizedTitle, url } : { url };
}

/** Content-script side: answers only extension pages, never other tabs. */
export function registerPageSourceResponder(): () => void {
  const listener = (
    message: unknown,
    sender: { id?: string; tab?: unknown },
  ): Promise<PageSource | null> | undefined => {
    if (
      typeof message !== 'object' ||
      message === null ||
      (message as { type?: unknown }).type !== GET_PAGE_SOURCE_MESSAGE ||
      sender.id !== browser.runtime.id ||
      sender.tab !== undefined
    ) {
      return undefined;
    }
    return Promise.resolve(readDocumentSource());
  };

  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}

/**
 * Side-panel side. Resolves null for restricted pages (no content script),
 * pages still loading, or any messaging failure.
 */
export async function requestActiveTabSource(): Promise<PageSource | null> {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id === undefined) {
      return null;
    }
    const response: unknown = await withTimeout(
      browser.tabs.sendMessage(tab.id, { type: GET_PAGE_SOURCE_MESSAGE }),
      PAGE_SOURCE_TIMEOUT_MS,
    );
    if (typeof response !== 'object' || response === null) {
      return null;
    }
    const { url, title } = response as { url?: unknown; title?: unknown };
    return toPageSource(url, title);
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}
