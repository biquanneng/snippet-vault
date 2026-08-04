// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  addSelectionTooltipSuppressionRule,
  clearSelectionTooltipSuppressionRules,
  createEmptySelectionTooltipSuppressionPreferences,
  createSelectionTooltipSuppressionRule,
  isSelectionTooltipSuppressed,
  normalizeSelectionTooltipSuppressionPreferences,
  removeSelectionTooltipSuppressionRule,
} from './selection-tooltip-suppression';

describe('selection tooltip suppression rules', () => {
  it('matches pages by origin and pathname while ignoring query and hash', () => {
    const pageRule = createSelectionTooltipSuppressionRule(
      'page',
      'https://example.com:8443/docs/start?source=one#intro',
    );
    expect(pageRule).toEqual({
      scope: 'page',
      value: 'https://example.com:8443/docs/start',
    });

    const preferences = addSelectionTooltipSuppressionRule(
      createEmptySelectionTooltipSuppressionPreferences(),
      pageRule!,
    );
    expect(
      isSelectionTooltipSuppressed(
        preferences,
        'https://example.com:8443/docs/start?source=two#other',
      ),
    ).toBe(true);
    expect(
      isSelectionTooltipSuppressed(
        preferences,
        'https://example.com/docs/start',
      ),
    ).toBe(false);
    expect(
      isSelectionTooltipSuppressed(
        preferences,
        'https://example.com:8443/docs/other',
      ),
    ).toBe(false);
  });

  it('matches only the exact normalized hostname for site rules', () => {
    const siteRule = createSelectionTooltipSuppressionRule(
      'site',
      'https://Docs.Example.com:8443/start',
    );
    expect(siteRule).toEqual({
      scope: 'site',
      value: 'docs.example.com',
    });

    const preferences = addSelectionTooltipSuppressionRule(
      createEmptySelectionTooltipSuppressionPreferences(),
      siteRule!,
    );
    expect(
      isSelectionTooltipSuppressed(
        preferences,
        'http://docs.example.com/another-path',
      ),
    ).toBe(true);
    expect(
      isSelectionTooltipSuppressed(
        preferences,
        'https://api.docs.example.com/start',
      ),
    ).toBe(false);
    expect(
      isSelectionTooltipSuppressed(
        preferences,
        'https://example.com/start',
      ),
    ).toBe(false);

    expect(
      createSelectionTooltipSuppressionRule(
        'site',
        'http://localhost:4173/path',
      ),
    ).toEqual({ scope: 'site', value: 'localhost' });
    expect(
      createSelectionTooltipSuppressionRule(
        'site',
        'http://127.0.0.1:4173/path',
      ),
    ).toEqual({ scope: 'site', value: '127.0.0.1' });
  });

  it('deduplicates additions and removes only the requested rule', () => {
    const pageRule = createSelectionTooltipSuppressionRule(
      'page',
      'https://example.com/docs',
    )!;
    const siteRule = createSelectionTooltipSuppressionRule(
      'site',
      'https://example.com/docs',
    )!;
    const emptyPreferences =
      createEmptySelectionTooltipSuppressionPreferences();
    const withPage = addSelectionTooltipSuppressionRule(
      emptyPreferences,
      pageRule,
    );
    const withBoth = addSelectionTooltipSuppressionRule(
      addSelectionTooltipSuppressionRule(withPage, pageRule),
      siteRule,
    );

    expect(withBoth.rules).toEqual([pageRule, siteRule]);
    expect(
      removeSelectionTooltipSuppressionRule(withBoth, pageRule).rules,
    ).toEqual([siteRule]);
    expect(withBoth.rules).toEqual([pageRule, siteRule]);
    expect(clearSelectionTooltipSuppressionRules(withBoth).rules).toEqual([]);
    expect(withBoth.rules).toEqual([pageRule, siteRule]);
  });

  it('falls back safely for invalid URLs, empty hostnames, and damaged data', () => {
    expect(createSelectionTooltipSuppressionRule('page', 'not a url')).toBeNull();
    expect(
      createSelectionTooltipSuppressionRule('site', 'file:///tmp/example.txt'),
    ).toBeNull();
    expect(
      createSelectionTooltipSuppressionRule('page', 'file:///tmp/example.txt'),
    ).toEqual({ scope: 'page', value: 'null/tmp/example.txt' });

    expect(
      normalizeSelectionTooltipSuppressionPreferences({
        version: 0,
        rules: [{ scope: 'site', value: 'example.com' }],
      }),
    ).toEqual(createEmptySelectionTooltipSuppressionPreferences());
    expect(
      normalizeSelectionTooltipSuppressionPreferences({
        version: 1,
        rules: [
          null,
          { scope: 'site', value: '' },
          { scope: 'site', value: 'Example.com' },
          { scope: 'page', value: 'https://example.com/docs?query=yes' },
          { scope: 'page', value: 'https://example.com/docs' },
          { scope: 'page', value: 'https://example.com/docs' },
        ],
      }).rules,
    ).toEqual([
      { scope: 'page', value: 'https://example.com/docs' },
    ]);
  });
});
