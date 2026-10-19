// SPDX-License-Identifier: MPL-2.0

import {
  hasExtensionMessageType,
  isExtensionRequest,
  MESSAGE_TYPE,
  type ExtensionRequest,
  type ExtensionResponse,
} from '../lib/browser/message-contract';
import {
  VaultMessageController,
  type MessageSenderContext,
} from '../lib/browser/vault-message-controller';
import {
  canHostInPagePanel,
  isMessageOfType,
  OPEN_IN_PAGE_PANEL_MESSAGE,
  OPEN_SETTINGS_MESSAGE,
  UNSUPPORTED_PAGE_NOTICE_KEY,
} from '../lib/browser/in-page-panel';
import { trackAnalyticsEvent } from '../lib/analytics';
import { openSidePanel } from '../lib/analytics-events';
import { createSnippetVaultService } from '../lib/core';
import { getUiLocale, initializeLanguage } from '../lib/i18n';
import { translate } from '../lib/i18n-catalog';
import { getWorkspaceExpiryDays } from '../lib/workspace-expiry';
import {
  applySelectionTooltipSuppressionMutation,
  createSelectionTooltipSuppressionMutationResponse,
  isSelectionTooltipSuppressionMutationRequest,
} from '../lib/selection-tooltip-suppression-storage';

let controller: VaultMessageController | null = null;

export default defineBackground(() => {
  void initializeLanguage();

  const sidePanelWithOpenedEvent = browser.sidePanel as typeof browser.sidePanel & {
    onOpened?: { addListener: (callback: () => void) => void };
  };
  sidePanelWithOpenedEvent.onOpened?.addListener(() => {
    trackAnalyticsEvent(openSidePanel());
  });

  // The toolbar icon opens the in-page panel; the side panel only hosts
  // settings and the fallback for pages that cannot run content scripts.
  void browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error: unknown) => {
      console.error(
        '[SnippetVault] Failed to configure the side panel action',
        error,
      );
    });

  browser.action.onClicked.addListener((tab) => {
    if (tab.id === undefined) {
      return;
    }
    if (canHostInPagePanel(tab.url)) {
      void openInPagePanel(tab.id);
      return;
    }
    // Must run before any await to keep the click's user gesture.
    openSettingsPanel(tab.id, true);
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isMessageOfType(message, OPEN_SETTINGS_MESSAGE)) {
      if (sender.id === browser.runtime.id && sender.tab?.id !== undefined) {
        openSettingsPanel(sender.tab.id, false);
      }
      return false;
    }

    if (isSelectionTooltipSuppressionMutationRequest(message)) {
      if (sender.id !== browser.runtime.id) {
        sendResponse(createSelectionTooltipSuppressionMutationResponse());
        return false;
      }

      applySelectionTooltipSuppressionMutation(message)
        .then((preferences) => {
          sendResponse(
            createSelectionTooltipSuppressionMutationResponse(preferences),
          );
        })
        .catch((error: unknown) => {
          console.error(
            '[SnippetVault] Selection tooltip preference update failed',
            error,
          );
          sendResponse(createSelectionTooltipSuppressionMutationResponse());
        });
      return true;
    }

    if (!isExtensionRequest(message)) {
      if (hasExtensionMessageType(message)) {
        sendResponse(
          failure(
            'INVALID_MESSAGE',
            translate(getUiLocale(), 'errors.invalidRequest'),
          ),
        );
      }
      return false;
    }

    handleMessage(message, sender)
      .then(sendResponse)
      .catch((error: unknown) => {
        if (message.type === MESSAGE_TYPE.searchPanel) {
          console.error(
            '[SnippetVault] Search message handler failed',
            {
              kind: message.payload.kind,
              operation: message.payload.query.trim() ? 'search' : 'browse',
              page: message.payload.page,
              pageSize: message.payload.pageSize,
            },
            error,
          );
        } else {
          console.error(
            '[SnippetVault] Extension message handler failed',
            { requestType: message.type },
            error,
          );
        }
        sendResponse(
          failure(
            'INTERNAL_ERROR',
            translate(
              message.locale ?? getUiLocale(),
              'errors.internal',
            ),
          ),
        );
      });
    return true;
  });
});

async function openInPagePanel(tabId: number): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, { type: OPEN_IN_PAGE_PANEL_MESSAGE });
    return;
  } catch {
    // No live content script: the tab predates install/update. Inject it.
  }
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.__snippetVaultOpenPanelOnMount__ = true;
      },
    });
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/content.js'],
    });
  } catch (error: unknown) {
    console.error('[SnippetVault] Failed to inject the in-page panel', error);
  }
}

function openSettingsPanel(tabId: number, unsupportedPage: boolean): void {
  browser.sidePanel.open({ tabId }).catch((error: unknown) => {
    console.error('[SnippetVault] Failed to open the side panel', error);
    void browser.runtime.openOptionsPage();
  });
  // Written after `open` so the gesture is spent first; the side panel also
  // watches this key, so the order of arrival does not matter.
  void browser.storage.session.set({
    [UNSUPPORTED_PAGE_NOTICE_KEY]: unsupportedPage,
  });
}

async function handleMessage(
  request: ExtensionRequest,
  sender: Browser.runtime.MessageSender,
): Promise<ExtensionResponse<unknown>> {
  await initializeLanguage();
  return getController().handle(
    request,
    createSenderContext(sender),
  );
}

function getController(): VaultMessageController {
  if (!controller) {
    const service = createSnippetVaultService();
    void service.pruneExpired().catch((error: unknown) => {
      console.error(
        '[SnippetVault] Failed to prune expired workspace items',
        error,
      );
    });
    controller = new VaultMessageController({
      service,
      workspaceExpiryDaysProvider: getWorkspaceExpiryDays,
    });
  }
  return controller;
}

function createSenderContext(
  sender: Browser.runtime.MessageSender,
): MessageSenderContext {
  return {
    extensionId: browser.runtime.id,
    senderId: sender.id,
    senderUrl: sender.url,
    tabId: sender.tab?.id,
    tabUrl: sender.tab?.url,
  };
}

function failure(
  code: 'INTERNAL_ERROR' | 'INVALID_MESSAGE',
  message: string,
): ExtensionResponse<never> {
  return {
    ok: false,
    error: { code, message },
  };
}
