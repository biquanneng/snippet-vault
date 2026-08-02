// SPDX-License-Identifier: MPL-2.0

import { useRef } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Kbd } from '../../../components/ui/kbd';
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
      <DialogContent
        portalContainer={portalContainer}
        showCloseButton={false}
        data-snippet-vault-ui="true"
        className="flex h-3/4 min-h-80 flex-col gap-0 overflow-hidden overscroll-contain p-0 sm:w-11/12 sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl"
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
          capabilities={{ workspaceLifecycleActions: true }}
          inputRef={inputRef}
          portalContainer={portalContainer}
          requestSender={requestSender}
          toolbarEnd={(
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Kbd>ESC</Kbd>
              {t('search.dialog.close')}
            </span>
          )}
        />
      </DialogContent>
    </Dialog>
  );
}
