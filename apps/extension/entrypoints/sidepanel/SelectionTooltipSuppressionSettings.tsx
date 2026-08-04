// SPDX-License-Identifier: MPL-2.0

import { useEffect, useState } from 'react';
import { FileText, Globe, LoaderCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  getSelectionTooltipSuppressionRuleKey,
  type SelectionTooltipSuppressionPreferences,
  type SelectionTooltipSuppressionRule,
} from '../../lib/selection-tooltip-suppression';
import {
  deleteAllSelectionTooltipSuppressionRules,
  deleteSelectionTooltipSuppressionRule,
  getSelectionTooltipSuppressionPreferences,
  watchSelectionTooltipSuppressionPreferences,
} from '../../lib/selection-tooltip-suppression-storage';
import { cn } from '../../lib/utils';
import { useI18n } from '../../lib/use-i18n';

const CLEAR_ALL_PENDING_KEY = 'all';

export function SelectionTooltipSuppressionSettings() {
  const { t } = useI18n();
  const [loadRevision, setLoadRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [writeError, setWriteError] = useState(false);
  const [pendingRuleKey, setPendingRuleKey] = useState<string>();
  const [preferences, setPreferences] =
    useState<SelectionTooltipSuppressionPreferences | null>(null);

  useEffect(() => {
    let cancelled = false;
    let preferenceRevision = 0;
    setLoading(true);
    setLoadError(false);
    setWriteError(false);

    const unwatchPreferences =
      watchSelectionTooltipSuppressionPreferences((nextPreferences) => {
        preferenceRevision += 1;
        if (!cancelled) {
          setPreferences(nextPreferences);
          setLoading(false);
          setLoadError(false);
          setWriteError(false);
        }
      });
    const readRevision = preferenceRevision;

    void getSelectionTooltipSuppressionPreferences()
      .then((nextPreferences) => {
        if (!cancelled && preferenceRevision === readRevision) {
          setPreferences(nextPreferences);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && preferenceRevision === readRevision) {
          console.error(
            '[SnippetVault] Failed to load selection tooltip exceptions',
            error,
          );
          setPreferences(null);
          setLoading(false);
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
      unwatchPreferences();
    };
  }, [loadRevision]);

  async function removeRule(rule: SelectionTooltipSuppressionRule) {
    const ruleKey = getSelectionTooltipSuppressionRuleKey(rule);
    if (pendingRuleKey) {
      return;
    }

    setPendingRuleKey(ruleKey);
    setWriteError(false);
    try {
      setPreferences(await deleteSelectionTooltipSuppressionRule(rule));
      toast.success(t('settings.selectionTooltipSuppression.removed'));
    } catch (error: unknown) {
      console.error(
        '[SnippetVault] Failed to remove a selection tooltip exception',
        error,
      );
      setWriteError(true);
      toast.error(t('settings.selectionTooltipSuppression.writeFailed'));
    } finally {
      setPendingRuleKey(undefined);
    }
  }

  async function clearAllRules() {
    if (pendingRuleKey) {
      return;
    }

    setPendingRuleKey(CLEAR_ALL_PENDING_KEY);
    setWriteError(false);
    try {
      setPreferences(await deleteAllSelectionTooltipSuppressionRules());
      toast.success(t('settings.selectionTooltipSuppression.cleared'));
    } catch (error: unknown) {
      console.error(
        '[SnippetVault] Failed to clear selection tooltip exceptions',
        error,
      );
      setWriteError(true);
      toast.error(t('settings.selectionTooltipSuppression.writeFailed'));
    } finally {
      setPendingRuleKey(undefined);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        {t('settings.selectionTooltipSuppression.loading')}
      </div>
    );
  }

  if (loadError || !preferences) {
    return (
      <div className="space-y-2.5">
        <p className="text-xs leading-5 text-destructive" role="alert">
          {t('settings.selectionTooltipSuppression.loadFailed')}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLoadRevision((current) => current + 1)}
        >
          {t('settings.selectionTooltipSuppression.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {preferences.rules.length === 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs leading-5 text-muted-foreground">
            {t('settings.selectionTooltipSuppression.empty')}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            {t('settings.selectionTooltipSuppression.emptyHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {t('settings.selectionTooltipSuppression.ruleCount', [
                preferences.rules.length,
              ])}
            </span>
            {preferences.rules.length > 5 ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    disabled={pendingRuleKey !== undefined}
                  >
                    {pendingRuleKey === CLEAR_ALL_PENDING_KEY ? (
                      <LoaderCircle
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    {t('settings.selectionTooltipSuppression.clearAll')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('settings.selectionTooltipSuppression.clearTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        'settings.selectionTooltipSuppression.clearDescription',
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t('settings.selectionTooltipSuppression.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => void clearAllRules()}
                    >
                      {t(
                        'settings.selectionTooltipSuppression.confirmClear',
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {preferences.rules.map((rule) => {
              const ruleKey =
                getSelectionTooltipSuppressionRuleKey(rule);
              const removing = pendingRuleKey === ruleKey;
              const displayValue = getSuppressionRuleDisplayValue(rule);
              return (
                <Badge
                  key={ruleKey}
                  variant="outline"
                  className={cn(
                    'h-auto max-w-full justify-start gap-1 rounded-md py-1 pr-1 pl-2 whitespace-normal',
                    removing && 'motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95',
                  )}
                >
                  {rule.scope === 'page' ? (
                    <FileText
                      className="size-3 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Globe
                      className="size-3 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span className="shrink-0 text-muted-foreground">
                    {t(
                      rule.scope === 'page'
                        ? 'settings.selectionTooltipSuppression.pageScope'
                        : 'settings.selectionTooltipSuppression.siteScope',
                    )}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate font-normal text-foreground"
                    title={displayValue}
                  >
                    {displayValue}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="ml-0.5 shrink-0"
                    disabled={pendingRuleKey !== undefined}
                    aria-label={t(
                      'settings.selectionTooltipSuppression.remove',
                    )}
                    title={t('settings.selectionTooltipSuppression.remove')}
                    onClick={() => void removeRule(rule)}
                  >
                    {removing ? (
                      <LoaderCircle
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 aria-hidden="true" />
                    )}
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {writeError ? (
        <p className="text-xs leading-5 text-destructive" role="alert">
          {t('settings.selectionTooltipSuppression.writeFailed')}
        </p>
      ) : null}

      {preferences.rules.length > 0 && preferences.rules.length <= 5 ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pendingRuleKey !== undefined}
            >
              {pendingRuleKey === CLEAR_ALL_PENDING_KEY ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : null}
              {t('settings.selectionTooltipSuppression.clearAll')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('settings.selectionTooltipSuppression.clearTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.selectionTooltipSuppression.clearDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('settings.selectionTooltipSuppression.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void clearAllRules()}
              >
                {t('settings.selectionTooltipSuppression.confirmClear')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

function getSuppressionRuleDisplayValue(
  rule: SelectionTooltipSuppressionRule,
): string {
  return rule.scope === 'page'
    ? rule.value.replace(/^https?:\/\//, '')
    : rule.value;
}
