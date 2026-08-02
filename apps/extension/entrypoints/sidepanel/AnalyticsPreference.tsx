// SPDX-License-Identifier: MPL-2.0

import { useEffect, useState } from 'react';

import { Checkbox } from '../../components/ui/checkbox';
import {
  ANALYTICS_HOST_PERMISSION,
  analyticsEnabledStorage,
} from '../../lib/analytics-preference';
import { useI18n } from '../../lib/use-i18n';

export function AnalyticsPreference() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      analyticsEnabledStorage.getValue(),
      browser.permissions.contains({
        origins: [ANALYTICS_HOST_PERMISSION],
      }),
    ])
      .then(([storedEnabled, hasHostPermission]) => {
        if (cancelled) {
          return;
        }

        const effectiveEnabled = storedEnabled && hasHostPermission;
        setEnabled(effectiveEnabled);
        setLoading(false);
        if (storedEnabled !== effectiveEnabled) {
          void analyticsEnabledStorage.setValue(effectiveEnabled);
        }
      })
      .catch((initializationError: unknown) => {
        if (!cancelled) {
          setEnabled(false);
          setLoading(false);
          setError(t('settings.analytics.saveFailed'));
          console.error(
            '[SnippetVault] Failed to read the anonymous analytics preference',
            initializationError,
          );
        }
      });

    const unwatch = analyticsEnabledStorage.watch((value) => {
      if (!cancelled) {
        setEnabled(value);
      }
    });

    return () => {
      cancelled = true;
      unwatch();
    };
  }, [t]);

  async function updatePreference(nextEnabled: boolean) {
    if (loading || saving || nextEnabled === enabled) {
      return;
    }

    const previousEnabled = enabled;
    setSaving(true);
    setError(undefined);
    try {
      if (nextEnabled) {
        const hasHostPermission = await browser.permissions.request({
          origins: [ANALYTICS_HOST_PERMISSION],
        });
        if (!hasHostPermission) {
          setError(t('settings.analytics.permissionDenied'));
          return;
        }
      }

      setEnabled(nextEnabled);
      await analyticsEnabledStorage.setValue(nextEnabled);
      if (!nextEnabled) {
        void browser.permissions
          .remove({ origins: [ANALYTICS_HOST_PERMISSION] })
          .catch((permissionError: unknown) => {
            console.error(
              '[SnippetVault] Failed to remove the analytics host permission',
              permissionError,
            );
          });
      }
    } catch (error: unknown) {
      setEnabled(previousEnabled);
      setError(t('settings.analytics.saveFailed'));
      if (nextEnabled) {
        void browser.permissions.remove({
          origins: [ANALYTICS_HOST_PERMISSION],
        });
      }
      console.error(
        '[SnippetVault] Failed to save the anonymous analytics preference',
        error,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox
          checked={enabled}
          disabled={loading || saving}
          onCheckedChange={(checked) => {
            void updatePreference(checked === true);
          }}
        />
        <span>{t('settings.analytics.toggle')}</span>
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        {t('settings.analytics.details')}
      </p>
      {error ? (
        <p className="text-xs leading-5 text-destructive" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
