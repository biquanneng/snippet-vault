// SPDX-License-Identifier: MPL-2.0

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SettingsBlockProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsBlock({
  icon: Icon,
  title,
  description,
  children,
}: SettingsBlockProps) {
  return (
    <section className="border-b py-5 last:border-b-0">
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
