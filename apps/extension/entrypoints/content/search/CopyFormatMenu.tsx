// SPDX-License-Identifier: MPL-2.0

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';
import type { TranslationKey } from '../../../lib/i18n-catalog';
import {
  formatAs,
  type CopyFormat,
  type CopyFormatFailureReason,
} from '../../../lib/copy-formats';
import { useI18n } from '../../../lib/use-i18n';

const FORMATS: readonly { format: CopyFormat; labelKey: TranslationKey }[] = [
  { format: 'shell-export', labelKey: 'search.copyFormats.shellExport' },
  { format: 'dotenv', labelKey: 'search.copyFormats.dotenv' },
  { format: 'json-field', labelKey: 'search.copyFormats.jsonField' },
  { format: 'http-header', labelKey: 'search.copyFormats.httpHeader' },
];

const FAILURE_KEYS: Record<CopyFormatFailureReason, TranslationKey> = {
  'invalid-variable-name': 'search.copyFormats.errors.invalidVariableName',
  'invalid-shell-value': 'search.copyFormats.errors.invalidShellValue',
  'invalid-dotenv-value': 'search.copyFormats.errors.invalidDotenvValue',
  'invalid-header-name': 'search.copyFormats.errors.invalidHeaderName',
  'invalid-header-value': 'search.copyFormats.errors.invalidHeaderValue',
};

/** Copies the value wrapped in a common format. Nothing is saved. */
export function CopyFormatMenu({
  value,
  defaultName,
  portalContainer,
}: {
  value: string;
  defaultName?: string;
  portalContainer?: HTMLElement;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName ?? '');

  async function copy(format: CopyFormat) {
    const result = formatAs(format, {
      name: name.trim() || undefined,
      value,
    });
    if (!result.ok) {
      toast.error(t(FAILURE_KEYS[result.reason]));
      return;
    }
    try {
      await navigator.clipboard.writeText(result.text);
      setOpen(false);
      toast.success(t('search.results.copied'));
    } catch {
      toast.error(t('search.results.copyFailed'));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t('search.copyFormats.open')}
          title={t('search.copyFormats.open')}
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        portalContainer={portalContainer}
        align="end"
        className="w-56 gap-2 p-2"
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('search.copyFormats.namePlaceholder')}
          aria-label={t('search.copyFormats.name')}
          spellCheck={false}
          autoComplete="off"
          className="h-7 font-mono text-xs"
        />
        <div className="flex flex-col">
          {FORMATS.map(({ format, labelKey }) => (
            <Button
              key={format}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => void copy(format)}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** `api-key` → `API_KEY`; used as the suggested variable or header name. */
export function toVariableName(labelName: string | undefined): string | undefined {
  const normalized = labelName
    ?.trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return normalized && /^[A-Z_]/.test(normalized) ? normalized : undefined;
}
