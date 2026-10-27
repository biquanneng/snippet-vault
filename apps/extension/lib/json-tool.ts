// SPDX-License-Identifier: MPL-2.0

/**
 * JSON tool transforms. Formatting and minifying rewrite only structural
 * whitespace: tokens are copied verbatim from the input, so numbers keep their
 * original literal (no `JSON.parse` precision loss) and strings keep their
 * original escapes. The scanner is iterative so deep nesting cannot overflow
 * the call stack.
 */

export const JSON_TOOL_MAX_LENGTH = 10 * 1024 * 1024;
/**
 * Indentation grows with depth × lines, so a small, deeply nested input can
 * expand far beyond its own size. Output is capped before it is allocated.
 */
export const JSON_TOOL_MAX_OUTPUT_LENGTH = 64 * 1024 * 1024;

export type JsonToolErrorCode =
  | 'empty'
  | 'tooLarge'
  | 'outputTooLarge'
  | 'invalidJson'
  | 'notStringLiteral';

export interface JsonToolError {
  code: JsonToolErrorCode;
  /** 1-based position of the offending character, for `invalidJson`. */
  line?: number;
  column?: number;
}

export type JsonToolResult =
  | { ok: true; text: string }
  | { ok: false; error: JsonToolError };

export type JsonIndent = '  ' | '    ' | '\t';

class JsonOutputTooLargeError extends Error {}

class JsonSyntaxError extends Error {
  constructor(readonly position: number) {
    super('Invalid JSON');
  }
}

const NUMBER_PATTERN = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const LITERALS = ['true', 'false', 'null'] as const;

export function formatJson(
  input: string,
  indent: JsonIndent = '  ',
): JsonToolResult {
  return rewrite(input, indent);
}

export function minifyJson(input: string): JsonToolResult {
  return rewrite(input, null);
}

/**
 * Decodes one level of escaping from a JSON string literal, e.g.
 * `"{\"a\":1}"` → `{"a":1}`. The surrounding quotes may be omitted. Anything
 * that is not a complete, valid string literal is rejected rather than having
 * backslashes stripped blindly.
 */
export function unescapeJsonString(input: string): JsonToolResult {
  const precheck = checkInput(input);
  if (precheck) {
    return { ok: false, error: precheck };
  }
  const trimmed = input.trim();
  const literal = trimmed.startsWith('"') ? trimmed : `"${trimmed}"`;
  try {
    if (scanString(literal, 0) !== literal.length) {
      return { ok: false, error: { code: 'notStringLiteral' } };
    }
  } catch {
    return { ok: false, error: { code: 'notStringLiteral' } };
  }
  // Strings carry no numeric precision, so the native decoder is exact here.
  return { ok: true, text: JSON.parse(literal) as string };
}

function checkInput(input: string): JsonToolError | null {
  if (input.length > JSON_TOOL_MAX_LENGTH) {
    return { code: 'tooLarge' };
  }
  if (!input.trim()) {
    return { code: 'empty' };
  }
  return null;
}

type Mode = 'value' | 'key' | 'after-value';

function rewrite(input: string, indent: JsonIndent | null): JsonToolResult {
  const precheck = checkInput(input);
  if (precheck) {
    return { ok: false, error: precheck };
  }

  const out: string[] = [];
  let outLength = 0;
  const emit = (chunk: string) => {
    outLength += chunk.length;
    if (outLength > JSON_TOOL_MAX_OUTPUT_LENGTH) {
      throw new JsonOutputTooLargeError();
    }
    out.push(chunk);
  };
  const stack: ('object' | 'array')[] = [];
  const newline = (depth: number) => {
    if (indent !== null) {
      // Checked before `repeat` allocates the indentation string.
      if (outLength + 1 + depth * indent.length > JSON_TOOL_MAX_OUTPUT_LENGTH) {
        throw new JsonOutputTooLargeError();
      }
      emit('\n');
      emit(indent.repeat(depth));
    }
  };
  let pos = skipWhitespace(input, 0);
  let mode: Mode = 'value';

  try {
    for (;;) {
      if (mode === 'key') {
        if (input[pos] !== '"') {
          throw new JsonSyntaxError(pos);
        }
        const end = scanString(input, pos);
        emit(input.slice(pos, end));
        pos = skipWhitespace(input, end);
        if (input[pos] !== ':') {
          throw new JsonSyntaxError(pos);
        }
        emit(indent === null ? ':' : ': ');
        pos = skipWhitespace(input, pos + 1);
        mode = 'value';
        continue;
      }

      if (mode === 'value') {
        const char = input[pos];
        if (char === '{' || char === '[') {
          const close = char === '{' ? '}' : ']';
          emit(char);
          pos = skipWhitespace(input, pos + 1);
          if (input[pos] === close) {
            emit(close);
            pos = skipWhitespace(input, pos + 1);
            mode = 'after-value';
          } else {
            stack.push(char === '{' ? 'object' : 'array');
            newline(stack.length);
            mode = char === '{' ? 'key' : 'value';
          }
          continue;
        }
        const end = scanScalar(input, pos);
        emit(input.slice(pos, end));
        pos = skipWhitespace(input, end);
        mode = 'after-value';
        continue;
      }

      const container = stack.at(-1);
      if (container === undefined) {
        if (pos !== input.length) {
          throw new JsonSyntaxError(pos);
        }
        return { ok: true, text: out.join('') };
      }
      const char = input[pos];
      if (char === ',') {
        emit(',');
        newline(stack.length);
        pos = skipWhitespace(input, pos + 1);
        mode = container === 'object' ? 'key' : 'value';
      } else if (
        (char === '}' && container === 'object') ||
        (char === ']' && container === 'array')
      ) {
        stack.pop();
        newline(stack.length);
        emit(char);
        pos = skipWhitespace(input, pos + 1);
      } else {
        throw new JsonSyntaxError(pos);
      }
    }
  } catch (error) {
    if (error instanceof JsonOutputTooLargeError) {
      return { ok: false, error: { code: 'outputTooLarge' } };
    }
    if (error instanceof JsonSyntaxError) {
      return {
        ok: false,
        error: { code: 'invalidJson', ...toLineColumn(input, error.position) },
      };
    }
    throw error;
  }
}

function scanScalar(input: string, pos: number): number {
  const char = input[pos];
  if (char === '"') {
    return scanString(input, pos);
  }
  if (char === '-' || (char >= '0' && char <= '9')) {
    NUMBER_PATTERN.lastIndex = pos;
    if (!NUMBER_PATTERN.test(input)) {
      throw new JsonSyntaxError(pos);
    }
    return NUMBER_PATTERN.lastIndex;
  }
  for (const literal of LITERALS) {
    if (input.startsWith(literal, pos)) {
      return pos + literal.length;
    }
  }
  throw new JsonSyntaxError(pos);
}

/** Returns the index just past the closing quote of the string at `pos`. */
function scanString(input: string, pos: number): number {
  let index = pos + 1;
  while (index < input.length) {
    const code = input.charCodeAt(index);
    if (code === 0x22) {
      return index + 1;
    }
    if (code < 0x20) {
      throw new JsonSyntaxError(index);
    }
    if (code === 0x5c) {
      const escape = input[index + 1];
      if (escape === 'u') {
        if (!/^[0-9a-fA-F]{4}$/.test(input.slice(index + 2, index + 6))) {
          throw new JsonSyntaxError(index);
        }
        index += 6;
        continue;
      }
      if (escape === undefined || !'"\\/bfnrt'.includes(escape)) {
        throw new JsonSyntaxError(index);
      }
      index += 2;
      continue;
    }
    index += 1;
  }
  throw new JsonSyntaxError(index);
}

function skipWhitespace(input: string, pos: number): number {
  let index = pos;
  while (index < input.length) {
    const code = input.charCodeAt(index);
    if (code !== 0x20 && code !== 0x0a && code !== 0x0d && code !== 0x09) {
      break;
    }
    index += 1;
  }
  return index;
}

function toLineColumn(
  input: string,
  position: number,
): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let index = 0; index < position && index < input.length; index += 1) {
    if (input.charCodeAt(index) === 0x0a) {
      line += 1;
      lineStart = index + 1;
    }
  }
  return { line, column: position - lineStart + 1 };
}
