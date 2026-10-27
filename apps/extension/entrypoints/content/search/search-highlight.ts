// SPDX-License-Identifier: MPL-2.0

import { splitSearchQuery } from '../../../lib/core/search-normalization';

const CJK_CHARACTER =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;
const LOWERCASE_OR_DIGIT = /[\p{Ll}\d]/u;
const LOWERCASE = /\p{Ll}/u;
const UPPERCASE = /\p{Lu}/u;

export interface SearchHighlightRange {
  start: number;
  end: number;
}

interface MappedCharacter {
  value: string;
  start: number;
  end: number;
}

interface SearchSequence {
  kind: 'cjk' | 'word';
  characters: MappedCharacter[];
}

interface SearchPattern {
  kind: SearchSequence['kind'];
  value: string;
}

export function findSearchHighlightRanges(
  value: string,
  query: string,
): SearchHighlightRange[] {
  if (!value || !query.trim()) {
    return [];
  }

  const sequences = scanSearchSequences(value);
  const patterns = buildHighlightPatterns(query);
  const wordPatterns = patterns
    .filter((pattern) => pattern.kind === 'word')
    .map((pattern) => pattern.value);
  const cjkPatterns = new Set(
    patterns
      .filter((pattern) => pattern.kind === 'cjk')
      .map((pattern) => pattern.value),
  );
  const ranges: SearchHighlightRange[] = [];

  for (const sequence of sequences) {
    if (sequence.kind === 'word') {
      const value = sequence.characters
        .map((character) => character.value)
        .join('');
      let matchingPattern = '';
      for (const pattern of wordPatterns) {
        if (
          pattern.length > matchingPattern.length &&
          value.startsWith(pattern)
        ) {
          matchingPattern = pattern;
        }
      }
      if (matchingPattern) {
        ranges.push(findWordPrefixRange(sequence, matchingPattern));
      }
      continue;
    }
    ranges.push(...findCjkPatternRanges(sequence, cjkPatterns));
  }

  return mergeRanges(ranges);
}

function buildHighlightPatterns(query: string): SearchPattern[] {
  const patterns = new Map<string, SearchPattern>();

  for (const term of splitSearchQuery(query)) {
    for (const sequence of scanSearchSequences(term)) {
      if (sequence.kind === 'word') {
        const value = sequence.characters
          .map((character) => character.value)
          .join('');
        patterns.set(`word:${value}`, { kind: 'word', value });
        continue;
      }

      for (const character of sequence.characters) {
        const value = character.value;
        patterns.set(`cjk:${value}`, { kind: 'cjk', value });
      }
      for (let index = 0; index + 1 < sequence.characters.length; index += 1) {
        const value =
          sequence.characters[index].value +
          sequence.characters[index + 1].value;
        patterns.set(`cjk:${value}`, { kind: 'cjk', value });
      }
    }
  }

  return [...patterns.values()];
}

function scanSearchSequences(value: string): SearchSequence[] {
  const codePoints = Array.from(value);
  const normalizedCodePoints = codePoints.map((codePoint) =>
    codePoint.normalize('NFKC'),
  );
  const nextWordIsCjk = findNextWordKinds(normalizedCodePoints);
  const offsets: number[] = [];
  let offset = 0;
  for (const codePoint of codePoints) {
    offsets.push(offset);
    offset += codePoint.length;
  }

  const sequences: SearchSequence[] = [];
  let word: MappedCharacter[] = [];
  let cjk: MappedCharacter[] = [];

  const flushWord = () => {
    if (word.length > 0) {
      sequences.push({ kind: 'word', characters: word });
      word = [];
    }
  };
  const flushCjk = () => {
    if (cjk.length > 0) {
      sequences.push({ kind: 'cjk', characters: cjk });
      cjk = [];
    }
  };

  for (let index = 0; index < codePoints.length; index += 1) {
    const source = codePoints[index];
    const normalized = normalizedCodePoints[index].toLowerCase();
    const start = offsets[index];
    const end = start + source.length;

    let firstWordCharacter = true;
    for (const character of normalized) {
      if (CJK_CHARACTER.test(character)) {
        flushWord();
        cjk.push({ value: character, start, end });
        continue;
      }
      if (WORD_CHARACTER.test(character)) {
        flushCjk();
        if (
          word.length > 0 &&
          firstWordCharacter &&
          startsNewWord(normalizedCodePoints, index)
        ) {
          flushWord();
        }
        word.push({ value: character, start, end });
        firstWordCharacter = false;
        continue;
      }
      flushWord();
    }

    if (
      !Array.from(normalized).some((character) =>
        WORD_CHARACTER.test(character),
      ) &&
      !nextWordIsCjk[index + 1]
    ) {
      flushCjk();
    }
  }

  flushWord();
  flushCjk();
  return sequences;
}

function startsNewWord(codePoints: string[], index: number): boolean {
  if (index === 0) {
    return false;
  }

  const previous = codePoints[index - 1];
  const current = codePoints[index];
  const next = codePoints[index + 1] ?? '';
  return (
    (LOWERCASE_OR_DIGIT.test(previous) && UPPERCASE.test(current)) ||
    (UPPERCASE.test(previous) &&
      UPPERCASE.test(current) &&
      LOWERCASE.test(next))
  );
}

function findNextWordKinds(codePoints: string[]): boolean[] {
  const nextWordIsCjk = Array.from(
    { length: codePoints.length + 1 },
    () => false,
  );
  let isCjk = false;

  for (let index = codePoints.length - 1; index >= 0; index -= 1) {
    const characters = Array.from(codePoints[index]);
    if (characters.some((character) => CJK_CHARACTER.test(character))) {
      isCjk = true;
    } else if (
      characters.some((character) => WORD_CHARACTER.test(character))
    ) {
      isCjk = false;
    }
    nextWordIsCjk[index] = isCjk;
  }

  return nextWordIsCjk;
}

function findWordPrefixRange(
  sequence: SearchSequence,
  pattern: string,
): SearchHighlightRange {
  let matchedLength = 0;
  let end = sequence.characters[0]?.end ?? 0;
  for (const character of sequence.characters) {
    matchedLength += character.value.length;
    end = character.end;
    if (matchedLength >= pattern.length) {
      break;
    }
  }

  return {
    start: sequence.characters[0].start,
    end,
  };
}

function findCjkPatternRanges(
  sequence: SearchSequence,
  patterns: ReadonlySet<string>,
): SearchHighlightRange[] {
  const ranges: SearchHighlightRange[] = [];
  for (let index = 0; index < sequence.characters.length; index += 1) {
    const first = sequence.characters[index];
    if (patterns.has(first.value)) {
      ranges.push({ start: first.start, end: first.end });
    }

    const second = sequence.characters[index + 1];
    if (second && patterns.has(first.value + second.value)) {
      ranges.push({ start: first.start, end: second.end });
    }
  }

  return ranges;
}

function mergeRanges(
  ranges: SearchHighlightRange[],
): SearchHighlightRange[] {
  const sorted = [...ranges].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  const merged: SearchHighlightRange[] = [];

  for (const range of sorted) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
      continue;
    }
    previous.end = Math.max(previous.end, range.end);
  }

  return merged;
}
