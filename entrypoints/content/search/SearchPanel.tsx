// SPDX-License-Identifier: MPL-2.0

import { useRef } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Kbd } from '../../../components/ui/kbd';
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
        className="flex min-h-80 max-h-3/4 flex-col gap-0 overflow-hidden overscroll-contain p-0 sm:max-w-3xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">检索 SnippetVault</DialogTitle>
        <DialogDescription className="sr-only">
          搜索机密记录或临时工作区内容
        </DialogDescription>

        <SearchPanelContent
          inputRef={inputRef}
          requestSender={requestSender}
          toolbarEnd={(
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Kbd>ESC</Kbd>
              关闭
            </span>
          )}
        />
      </DialogContent>
    </Dialog>
  );
}
