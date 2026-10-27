// SPDX-License-Identifier: MPL-2.0

import { useRef } from 'react';

import { openExtensionTool } from '../../../components/tools/ToolList';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../components/ui/dialog';
import { OPEN_SETTINGS_MESSAGE } from '../../../lib/browser/in-page-panel';
import { useI18n } from '../../../lib/use-i18n';
import {
  SearchPanelContent,
  type SearchPanelRequestSender,
} from './SearchPanelContent';

interface SearchPanelProps {
  portalContainer: HTMLElement;
  onClose: () => void;
  requestSender?: SearchPanelRequestSender;
}

export function SearchPanel({
  portalContainer,
  onClose,
  requestSender,
}: SearchPanelProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      {/* Anchored near the top like a command palette, so the field stays in
          place while results change height below it. */}
      <DialogContent
        portalContainer={portalContainer}
        showCloseButton={false}
        data-snippet-vault-ui="true"
        className="top-[12vh] flex h-[min(560px,76vh)] translate-y-0 flex-col gap-0 overflow-hidden overscroll-contain p-0 shadow-2xl sm:w-11/12 sm:max-w-[52rem]"
        onBackdropPointerDown={(event) => {
          event.preventDefault();
          onClose();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">
          {t('search.dialog.title')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('search.dialog.description')}
        </DialogDescription>

        <SearchPanelContent
          capabilities={{
            enhancedCreate: true,
            workspaceLifecycleActions: true,
          }}
          inputRef={inputRef}
          portalContainer={portalContainer}
          requestSender={requestSender}
          onClose={onClose}
          onOpenTool={(tool) => {
            openExtensionTool(tool);
            onClose();
          }}
          onOpenSettings={() => {
            void browser.runtime.sendMessage({ type: OPEN_SETTINGS_MESSAGE });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
