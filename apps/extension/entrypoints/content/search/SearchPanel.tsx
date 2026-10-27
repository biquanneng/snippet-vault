// SPDX-License-Identifier: MPL-2.0

import { useEffect, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';

import { OnboardingGuide } from '../../../components/onboarding/OnboardingGuide';
import { openExtensionTool } from '../../../components/tools/ToolList';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Kbd } from '../../../components/ui/kbd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import { OPEN_SETTINGS_MESSAGE } from '../../../lib/browser/in-page-panel';
import { getOnboardingSeen, markOnboardingSeen } from '../../../lib/onboarding';
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
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getOnboardingSeen().then((seen) => {
      if (!cancelled && !seen) {
        setShowGuide(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissGuide = () => {
    setShowGuide(false);
    void markOnboardingSeen();
    window.setTimeout(() => inputRef.current?.focus());
  };

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
        className="flex h-3/4 min-h-80 flex-col gap-0 overflow-hidden overscroll-contain p-0 sm:w-11/12 sm:max-w-3xl"
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

        {showGuide ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <h2 className="px-5 pt-5 text-base font-semibold">
              {t('onboarding.title')}
            </h2>
            <OnboardingGuide
              actions={(
                <Button type="button" autoFocus onClick={dismissGuide}>
                  {t('onboarding.done')}
                </Button>
              )}
            />
          </div>
        ) : (
        <SearchPanelContent
          onOpenTool={(tool) => {
            openExtensionTool(tool);
            onClose();
          }}
          capabilities={{
            enhancedCreate: true,
            workspaceLifecycleActions: true,
          }}
          inputRef={inputRef}
          portalContainer={portalContainer}
          requestSender={requestSender}
          toolbarEnd={(
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        void browser.runtime.sendMessage({
                          type: OPEN_SETTINGS_MESSAGE,
                        })
                      }
                      aria-label={t('settings.open')}
                    >
                      <Settings2 aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    portalContainer={portalContainer}
                    side="top"
                    sideOffset={4}
                  >
                    {t('settings.open')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <Kbd>ESC</Kbd>
                {t('search.dialog.close')}
              </span>
            </>
          )}
        />
        )}
      </DialogContent>
    </Dialog>
  );
}
