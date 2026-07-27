// SPDX-License-Identifier: MPL-2.0

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Check, LoaderCircle, TimerReset } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useI18n } from '../../lib/use-i18n';
import {
  DEFAULT_WORKSPACE_EXPIRY_DAYS,
  getWorkspaceExpiryDays,
  MIN_WORKSPACE_EXPIRY_DAYS,
  normalizeWorkspaceExpiryDays,
  setWorkspaceExpiryDays,
} from '../../lib/workspace-expiry';
import { ContextSettings } from './ContextSettings';
import { SettingsBlock } from './SettingsBlock';

export function WorkspaceSettings() {
  const { t } = useI18n();
  const inputId = useId();
  const savedValueRef = useRef(String(DEFAULT_WORKSPACE_EXPIRY_DAYS));
  const [inputValue, setInputValue] = useState(
    savedValueRef.current,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const isDirty = inputValue !== savedValueRef.current;

  useEffect(() => {
    let cancelled = false;
    void getWorkspaceExpiryDays().then((days) => {
      if (!cancelled) {
        const value = String(days);
        savedValueRef.current = value;
        setInputValue(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    const days = Number(inputValue);
    if (
      !Number.isSafeInteger(days) ||
      days < MIN_WORKSPACE_EXPIRY_DAYS ||
      normalizeWorkspaceExpiryDays(days) !== days
    ) {
      setInvalid(true);
      toast.error(t('settings.workspace.invalid'));
      return;
    }

    setInvalid(false);
    setSaving(true);
    try {
      await setWorkspaceExpiryDays(days);
      const value = String(days);
      savedValueRef.current = value;
      setInputValue(value);
      toast.success(t('settings.workspace.saved'));
    } catch (error: unknown) {
      console.error(
        '[SnippetVault] Failed to save the workspace expiry preference',
        error,
      );
      toast.error(t('settings.workspace.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pb-8">
      <ContextSettings />
      <SettingsBlock
        icon={TimerReset}
        title={t('settings.workspace.defaultTitle')}
        description={t('settings.workspace.defaultDescription')}
      >
        <form className="space-y-3" onSubmit={(event) => void save(event)}>
          <div className="relative max-w-48">
            <Input
              id={inputId}
              type="number"
              min={MIN_WORKSPACE_EXPIRY_DAYS}
              step={1}
              inputMode="numeric"
              value={inputValue}
              disabled={loading || saving}
              aria-label={t('settings.workspace.defaultTitle')}
              aria-invalid={invalid}
              aria-describedby={`${inputId}-hint`}
              onChange={(event) => {
                setInputValue(event.target.value);
                setInvalid(false);
              }}
              className="pr-12"
            />
            <span
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground"
              aria-hidden="true"
            >
              {t('settings.workspace.days')}
            </span>
          </div>
          <p
            id={`${inputId}-hint`}
            className="text-xs leading-5 text-muted-foreground"
          >
            {t('settings.workspace.newItemsOnly')}
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={loading || saving || !isDirty}
          >
            {saving ? (
              <LoaderCircle
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Check aria-hidden="true" />
            )}
            {saving
              ? t('settings.workspace.saving')
              : t('settings.workspace.save')}
          </Button>
        </form>
      </SettingsBlock>
    </div>
  );
}
