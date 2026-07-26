// SPDX-License-Identifier: MPL-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FlexSearchIndex } from './flexsearch-index';
import type { SearchDocument } from './search-index';

let indexSequence = 0;
let namespace: string;
let searchIndex: FlexSearchIndex;

const document: SearchDocument = {
  id: 'vault:item-1',
  kind: 'vault',
  labelText: 'Token',
  context: 'meowdex production',
  sourceTitle: '阿里云-控制台',
  sourceUrl: 'https://console.example.com/access-token',
  sourceDomain: 'console.example.com',
  content: 'sk-live-original',
};

beforeEach(() => {
  indexSequence += 1;
  namespace = `snippet-vault-search-test-${indexSequence}`;
  searchIndex = new FlexSearchIndex({ namespace });
});

afterEach(async () => {
  await searchIndex.destroy();
});

describe('FlexSearchIndex', () => {
  it('searches labels, developer text, URLs and Chinese text', async () => {
    await searchIndex.open();
    searchIndex.upsert(document);
    await searchIndex.commit();

    await expect(searchIndex.search('token', 10)).resolves.toEqual([
      expect.objectContaining({ id: document.id }),
    ]);
    await expect(searchIndex.search('access', 10)).resolves.toEqual([
      expect.objectContaining({ id: document.id }),
    ]);
    await expect(searchIndex.search('阿里云', 10)).resolves.toEqual([
      expect.objectContaining({ id: document.id }),
    ]);
    await expect(searchIndex.search('云控制', 10)).resolves.toEqual([
      expect.objectContaining({ id: document.id }),
    ]);
    await expect(searchIndex.search('liv', 10)).resolves.toEqual([
      expect.objectContaining({ id: document.id }),
    ]);
  });

  it('does not treat Latin or Chinese text as an unordered character set', async () => {
    await searchIndex.open();
    searchIndex.upsert({
      ...document,
      labelText: '',
      context: '',
      sourceTitle: '',
      sourceUrl: '',
      sourceDomain: '',
      content: 'not 阿里云',
    });
    await searchIndex.commit();

    await expect(searchIndex.search('ton', 10)).resolves.toEqual([]);
    await expect(searchIndex.search('云里阿', 10)).resolves.toEqual([]);
    await expect(searchIndex.search('definitely absent', 10)).resolves.toEqual(
      [],
    );
  });

  it('keeps CJK phrases inside a field while allowing spaced cross-field terms', async () => {
    await searchIndex.open();
    searchIndex.upsert({
      ...document,
      labelText: '阿里云',
      context: '控制台',
      sourceTitle: '',
      sourceUrl: '',
      sourceDomain: '',
      content: '',
    });
    await searchIndex.commit();

    await expect(searchIndex.search('云控制', 10)).resolves.toEqual([]);
    await expect(searchIndex.search('云 控制', 10)).resolves.toEqual([
      expect.objectContaining({ id: document.id }),
    ]);
  });

  it('requires every query term while allowing terms to match different fields', async () => {
    await searchIndex.open();
    searchIndex.upsert(document);
    searchIndex.upsert({
      ...document,
      id: 'vault:item-2',
      labelText: 'Token',
      context: 'staging',
    });
    await searchIndex.commit();

    await expect(searchIndex.search('token production', 10)).resolves.toEqual([
      expect.objectContaining({
        id: document.id,
      }),
    ]);
  });

  it('applies the requested limit after intersecting query terms', async () => {
    await searchIndex.open();
    for (let index = 0; index < 20; index += 1) {
      searchIndex.upsert({
        ...document,
        id: `vault:limited-${index}`,
        labelText: '',
        context: '',
        sourceTitle: '',
        sourceUrl: '',
        sourceDomain: '',
        content: index === 19 ? 'token production' : `token staging ${index}`,
      });
    }
    await searchIndex.commit();

    await expect(searchIndex.search('token production', 10)).resolves.toEqual([
      expect.objectContaining({ id: 'vault:limited-19' }),
    ]);
  });

  it('reopens a committed persistent index', async () => {
    await searchIndex.open();
    searchIndex.upsert(document);
    await searchIndex.commit();
    await searchIndex.close();

    searchIndex = new FlexSearchIndex({ namespace });
    await searchIndex.open();

    await expect(searchIndex.search('production', 10)).resolves.toEqual([
      expect.objectContaining({ id: document.id }),
    ]);
  });

  it('removes stale terms when a document is updated or deleted', async () => {
    await searchIndex.open();
    searchIndex.upsert(document);
    await searchIndex.commit();

    searchIndex.upsert({
      ...document,
      content: 'replacement-secret',
    });
    await searchIndex.commit();

    await expect(searchIndex.search('original', 10)).resolves.toEqual([]);
    await expect(searchIndex.search('replacement', 10)).resolves.toHaveLength(1);

    searchIndex.remove(document.id);
    await searchIndex.commit();

    await expect(searchIndex.search('replacement', 10)).resolves.toEqual([]);
  });

  it(
    'indexes and retrieves from 10,000 synthetic documents',
    async () => {
      await searchIndex.open();
      for (let index = 0; index < 10_000; index += 1) {
        searchIndex.upsert({
          ...document,
          id: `vault:scale-${index}`,
          content:
            index === 9_999
              ? 'synthetic-record needlealphaomega'
              : `synthetic-record-${index}`,
        });
      }
      await searchIndex.commit();

      await expect(searchIndex.search('needlealphaomega', 10)).resolves.toEqual([
        expect.objectContaining({ id: 'vault:scale-9999' }),
      ]);
    },
    15_000,
  );
});
