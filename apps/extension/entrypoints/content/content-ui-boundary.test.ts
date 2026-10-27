// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { CONTENT_UI_SHADOW_CSS } from './content-ui-boundary';

describe('content UI pointer-event boundary', () => {
  it('keeps every non-visual shadow boundary out of host-page hit testing', () => {
    expect(CONTENT_UI_SHADOW_CSS).toContain(':host,');
    expect(CONTENT_UI_SHADOW_CSS).toContain('html,');
    expect(CONTENT_UI_SHADOW_CSS).toContain('body {');
    expect(CONTENT_UI_SHADOW_CSS).toContain(
      'pointer-events: none !important;',
    );
  });
});
