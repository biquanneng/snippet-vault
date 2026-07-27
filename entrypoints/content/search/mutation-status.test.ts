// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import type { Translator } from '../../../lib/i18n-catalog';
import { getMutationStatusMessages } from './mutation-status';

const translateKey: Translator = (key) => key;

describe('getMutationStatusMessages', () => {
  it('does not add noise when the mutation fully synchronized', () => {
    expect(
      getMutationStatusMessages(
        {
          searchStatus: 'synchronized',
          labelStatus: 'updated',
        },
        translateKey,
      ),
    ).toEqual([]);
  });

  it('surfaces pending search recovery and stale label order', () => {
    expect(
      getMutationStatusMessages(
        {
          searchStatus: 'rebuild-required',
          labelStatus: 'stale',
        },
        translateKey,
      ),
    ).toEqual([
      'search.status.indexRebuild',
      'search.status.labelOrderStale',
    ]);
  });
});
