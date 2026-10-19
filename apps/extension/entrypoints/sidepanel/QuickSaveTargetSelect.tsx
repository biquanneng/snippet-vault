// SPDX-License-Identifier: MPL-2.0

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  getQuickSaveTarget,
  normalizeQuickSaveTarget,
  QUICK_SAVE_TARGETS,
  quickSaveTargetStorage,
  type QuickSaveTarget,
} from '../../lib/quick-save-target';
import { useI18n } from '../../lib/use-i18n';

export function QuickSaveTargetSelect() {
  const { t } = useI18n();
  const [target, setTarget] = useState<QuickSaveTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getQuickSaveTarget().then((value) => {
      if (!cancelled) {
        setTarget(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Select
      value={target ?? undefined}
      disabled={target === null}
      onValueChange={(value) => {
        const next = normalizeQuickSaveTarget(value);
        const previous = target;
        setTarget(next);
        void quickSaveTargetStorage.setValue(next).catch((error: unknown) => {
          console.error(
            '[SnippetVault] Failed to save the quick save target preference',
            error,
          );
          setTarget(previous);
          toast.error(t('settings.quickSave.saveFailed'));
        });
      }}
    >
      <SelectTrigger
        size="sm"
        className="w-full max-w-48"
        aria-label={t('settings.quickSave.title')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {QUICK_SAVE_TARGETS.map((value) => (
          <SelectItem key={value} value={value}>
            {value === 'workspace'
              ? t('settings.quickSave.workspace')
              : t('settings.quickSave.vault')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
