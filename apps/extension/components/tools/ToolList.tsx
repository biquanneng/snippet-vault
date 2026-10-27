// SPDX-License-Identifier: MPL-2.0

import { Braces, ExternalLink } from 'lucide-react';

import {
  OPEN_TOOL_MESSAGE,
  type OpenToolRequest,
} from '../../lib/browser/in-page-panel';
import { useI18n } from '../../lib/use-i18n';

export type ExtensionTool = OpenToolRequest['tool'];

/** Asks the background to open (or focus) the tool's extension tab. */
export function openExtensionTool(tool: ExtensionTool): void {
  const request: OpenToolRequest = { type: OPEN_TOOL_MESSAGE, tool };
  browser.runtime.sendMessage(request).catch((error: unknown) => {
    console.error('[SnippetVault] Failed to open the tool', error);
  });
}

/**
 * The Tools directory shared by the in-page panel and the side panel. Every
 * tool opens in its own extension tab; nothing from the vault is passed along.
 */
export function ToolList({ onOpen }: { onOpen: (tool: ExtensionTool) => void }) {
  const { t } = useI18n();

  return (
    <ul className="flex flex-col gap-1 p-3">
      <li>
        <button
          type="button"
          onClick={() => onOpen('json')}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Braces className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-medium">
            {t('tools.json.title')}
          </span>
          <ExternalLink
            className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
  );
}
