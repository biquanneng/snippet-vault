// SPDX-License-Identifier: MPL-2.0

import { useEffect, useRef, useState } from 'react';
import { Copy, Eraser } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { toLanguageTag } from '../../lib/i18n-catalog';
import {
  formatJson,
  minifyJson,
  unescapeJsonString,
  type JsonToolError,
  type JsonToolResult,
} from '../../lib/json-tool';
import { applyThemeToElement } from '../../lib/theme';
import { useI18n } from '../../lib/use-i18n';
import { useThemePreference } from '../../lib/use-theme';
import { JsonEditor, type JsonEditorHandle } from './JsonEditor';

// Above this size the busy state is painted before the synchronous transform.
const YIELD_BEFORE_TRANSFORM_LENGTH = 256 * 1024;

type Status =
  | { type: 'idle' }
  | { type: 'busy' }
  | { type: 'copied' }
  | { type: 'error'; error: JsonToolError | { code: 'copyFailed' } };

/**
 * Standalone JSON tool. Input and output exist only in this tab's memory:
 * nothing is saved, indexed, logged, or read from the clipboard.
 */
export function App() {
  const { locale, t } = useI18n();
  const { preference, resolvedTheme } = useThemePreference();
  const inputRef = useRef<JsonEditorHandle>(null);
  const outputRef = useRef<JsonEditorHandle>(null);
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const busy = status.type === 'busy';

  useEffect(() => {
    document.documentElement.lang = toLanguageTag(locale);
    document.title = `${t('tools.json.title')} · SnippetVault`;
  }, [locale, t]);

  useEffect(() => {
    applyThemeToElement(document.documentElement, {
      preference,
      resolvedTheme,
    });
  }, [preference, resolvedTheme]);

  const run = async (transform: (input: string) => JsonToolResult) => {
    const input = inputRef.current?.getText() ?? '';
    if (input.length > YIELD_BEFORE_TRANSFORM_LENGTH) {
      setStatus({ type: 'busy' });
      await new Promise((resolve) => window.setTimeout(resolve, 16));
    }
    const result = transform(input);
    if (result.ok) {
      outputRef.current?.setText(result.text);
      setStatus({ type: 'idle' });
      return;
    }
    setStatus({ type: 'error', error: result.error });
  };

  const copyOutput = async () => {
    const output = outputRef.current?.getText() ?? '';
    if (!output) {
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      setStatus({ type: 'copied' });
    } catch {
      setStatus({ type: 'error', error: { code: 'copyFailed' } });
    }
  };

  const clear = () => {
    inputRef.current?.setText('');
    outputRef.current?.setText('');
    setStatus({ type: 'idle' });
    inputRef.current?.focus();
  };

  const clearTransientStatus = () => {
    setStatus((current) =>
      current.type === 'copied' || current.type === 'error'
        ? { type: 'idle' }
        : current,
    );
  };

  return (
    <main className="flex h-dvh min-w-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <h1 className="mr-auto text-sm font-semibold">
          {t('tools.json.title')}
        </h1>
        <Button size="sm" disabled={busy} onClick={() => void run(formatJson)}>
          {t('tools.json.format')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(minifyJson)}
        >
          {t('tools.json.minify')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(unescapeJsonString)}
        >
          {t('tools.json.unescape')}
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void copyOutput()}>
          <Copy aria-hidden="true" />
          {t('tools.json.copy')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={clear}>
          <Eraser aria-hidden="true" />
          {t('tools.json.clear')}
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
        <section className="min-h-0 border-b md:border-r md:border-b-0">
          <JsonEditor
            ref={inputRef}
            ariaLabel={t('tools.json.input')}
            placeholder={t('tools.json.inputPlaceholder')}
            onChange={clearTransientStatus}
          />
        </section>
        <section className="min-h-0">
          <JsonEditor
            ref={outputRef}
            readOnly
            ariaLabel={t('tools.json.output')}
            placeholder={t('tools.json.outputPlaceholder')}
          />
        </section>
      </div>
      <footer
        className="flex h-8 shrink-0 items-center gap-2 border-t px-4 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <StatusText
          status={status}
          onReveal={(line, column) => inputRef.current?.focusAt(line, column)}
        />
      </footer>
    </main>
  );
}

function StatusText({
  status,
  onReveal,
}: {
  status: Status;
  onReveal: (line: number, column: number) => void;
}) {
  const { t } = useI18n();

  switch (status.type) {
    case 'idle':
      return null;
    case 'busy':
      return <span>{t('tools.json.processing')}</span>;
    case 'copied':
      return <span>{t('tools.json.copied')}</span>;
    case 'error': {
      const { error } = status;
      if (error.code === 'invalidJson' && 'line' in error && error.line !== undefined) {
        const { line, column = 1 } = error;
        return (
          <button
            type="button"
            className="text-destructive underline-offset-2 hover:underline"
            onClick={() => onReveal(line, column)}
          >
            {t('tools.json.errors.invalidJsonAt', [line, column])}
          </button>
        );
      }
      return (
        <span className="text-destructive">
          {t(`tools.json.errors.${error.code}`)}
        </span>
      );
    }
  }
}
