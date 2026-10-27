// SPDX-License-Identifier: MPL-2.0

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
    .toLowerCase()
    .replace(/[\s./\\:_?#=&%+@[\](){},;'"`|~-]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');
}

const CJK_CHARACTER =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const SEARCH_WORD_CHARACTER = /[\p{L}\p{N}]/u;
export const SEARCH_FIELD_BOUNDARY = '\u0000';

export function splitSearchQuery(value: string): string[] {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(' ') : [];
}

export function encodeSearchText(value: string): string[] {
  const terms = new Set<string>();
  const characters = [...normalizeSearchText(value)];
  let word = '';
  let cjkRun: string[] = [];

  const flushWord = () => {
    if (word) {
      terms.add(word);
      word = '';
    }
  };
  const flushCjkRun = () => {
    for (let index = 0; index < cjkRun.length; index += 1) {
      terms.add(cjkRun[index]);
      if (index + 1 < cjkRun.length) {
        terms.add(`${cjkRun[index]}${cjkRun[index + 1]}`);
      }
    }
    cjkRun = [];
  };

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    if (character === SEARCH_FIELD_BOUNDARY) {
      flushWord();
      flushCjkRun();
      continue;
    }
    if (CJK_CHARACTER.test(character)) {
      flushWord();
      cjkRun.push(character);
      continue;
    }
    if (SEARCH_WORD_CHARACTER.test(character)) {
      flushCjkRun();
      word += character;
      continue;
    }
    flushWord();
    if (!continuesCjkRun(characters, index + 1, cjkRun.length > 0)) {
      flushCjkRun();
    }
  }

  flushWord();
  flushCjkRun();
  return [...terms];
}

function continuesCjkRun(
  characters: string[],
  start: number,
  hasCjkPrefix: boolean,
): boolean {
  if (!hasCjkPrefix) {
    return false;
  }

  for (let index = start; index < characters.length; index += 1) {
    const character = characters[index];
    if (character === SEARCH_FIELD_BOUNDARY) {
      return false;
    }
    if (CJK_CHARACTER.test(character)) {
      return true;
    }
    if (SEARCH_WORD_CHARACTER.test(character)) {
      return false;
    }
  }
  return false;
}
