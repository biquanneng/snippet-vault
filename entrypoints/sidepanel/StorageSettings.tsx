// SPDX-License-Identifier: MPL-2.0

import { Cloud, Database, ShieldCheck } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { useI18n } from '../../lib/use-i18n';

export function StorageSettings() {
  const { t } = useI18n();

  return (
    <div className="space-y-5 px-4 py-5 pb-8">
      <section className="divide-y">
        <div className="flex items-start gap-3 py-3">
          <Database
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">
                {t('settings.storage.localTitle')}
              </h3>
              <Badge variant="secondary" className="rounded-md">
                {t('settings.storage.active')}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t('settings.storage.localDescription')}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 py-3">
          <Cloud
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">
                {t('settings.storage.r2Title')}
              </h3>
              <Badge variant="outline" className="rounded-md">
                {t('settings.menu.planned')}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t('settings.storage.r2Description')}
            </p>
          </div>
        </div>
      </section>

      <Alert>
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>{t('settings.storage.noticeTitle')}</AlertTitle>
        <AlertDescription>
          {t('settings.storage.noticeDescription')}
        </AlertDescription>
      </Alert>
    </div>
  );
}
