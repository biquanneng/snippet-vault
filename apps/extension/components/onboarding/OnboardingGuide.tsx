// SPDX-License-Identifier: MPL-2.0

import type { ReactNode } from 'react';
import { BriefcaseBusiness, PocketKnife, ShieldCheck } from 'lucide-react';

import { Kbd, KbdGroup } from '../ui/kbd';
import { useI18n } from '../../lib/use-i18n';

const IS_MAC = /mac/i.test(globalThis.navigator?.platform ?? '');
const KBD_CLASS_NAME = 'h-6 min-w-6 px-1.5 text-sm';

/**
 * Explains the three entries and the two shortcuts. Shown on the welcome page
 * opened after install and kept in the side panel for later reference.
 */
export function OnboardingGuide({ actions }: { actions?: ReactNode }) {
  const { t } = useI18n();
  const modifier = IS_MAC ? '⌘' : 'Ctrl';

  return (
    <div className="flex flex-col gap-8 p-5">
      <ul className="flex flex-col gap-5">
        <GuideRow icon={<ShieldCheck />} title={t('onboarding.secrets.title')}>
          {t('onboarding.secrets.description')}
        </GuideRow>
        <GuideRow
          icon={<BriefcaseBusiness />}
          title={t('onboarding.temporary.title')}
        >
          {t('onboarding.temporary.description')}
        </GuideRow>
        <GuideRow icon={<PocketKnife />} title={t('onboarding.tools.title')}>
          {t('onboarding.tools.description')}
        </GuideRow>
      </ul>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-4 text-sm">
        <dt>
          <KbdGroup>
            <Kbd className={KBD_CLASS_NAME}>{modifier}</Kbd>
            <Kbd className={KBD_CLASS_NAME}>C</Kbd>
            <Kbd className={KBD_CLASS_NAME}>C</Kbd>
          </KbdGroup>
        </dt>
        <dd className="text-muted-foreground">
          {t('onboarding.shortcuts.quickSave')}
        </dd>
        <dt>
          <KbdGroup>
            <Kbd className={KBD_CLASS_NAME}>⇧</Kbd>
            <Kbd className={KBD_CLASS_NAME}>⇧</Kbd>
          </KbdGroup>
        </dt>
        <dd className="text-muted-foreground">
          {t('onboarding.shortcuts.search')}
        </dd>
      </dl>
      {actions ? <div className="flex justify-end gap-2">{actions}</div> : null}
    </div>
  );
}

function GuideRow({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 text-muted-foreground [&_svg]:size-5"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 space-y-1">
        <span className="block text-base font-medium">{title}</span>
        <span className="block text-sm leading-6 text-muted-foreground">
          {children}
        </span>
      </span>
    </li>
  );
}
