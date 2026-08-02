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
import { trackAnalyticsEvent } from '../lib/analytics';
import { openSidePanel } from '../lib/analytics-events';
import { createSnippetVaultService } from '../lib/core';
import { getUiLocale, initializeLanguage } from '../lib/i18n';
import { translate } from '../lib/i18n-catalog';
import { getWorkspaceExpiryDays } from '../lib/workspace-expiry';

let controller: VaultMessageController | null = null;

export default defineBackground(() => {
  void initializeLanguage();

  const sidePanelWithOpenedEvent = browser.sidePanel as typeof browser.sidePanel & {
    onOpened?: { addListener: (callback: () => void) => void };
  };
  sidePanelWithOpenedEvent.onOpened?.addListener(() => {
    trackAnalyticsEvent(openSidePanel());
  });

  void browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => {
      console.error(
        '[SnippetVault] Failed to configure the side panel action',
        error,
      );
    });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
