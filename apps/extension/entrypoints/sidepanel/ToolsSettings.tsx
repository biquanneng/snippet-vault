// SPDX-License-Identifier: MPL-2.0

import {
  openExtensionTool,
  ToolList,
} from '../../components/tools/ToolList';

/** Tools never run inside the narrow side panel; each opens its own tab. */
export function ToolsSettings() {
  return <ToolList onOpen={openExtensionTool} />;
}
