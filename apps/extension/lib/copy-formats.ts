// SPDX-License-Identifier: MPL-2.0

export type CopyFormat =
  | 'raw'
  | 'shell-export'
  | 'dotenv'
  | 'json-field'
  | 'http-header';

export type CopyFormatFailureReason =
  | 'invalid-variable-name'
  | 'invalid-shell-value'
  | 'invalid-dotenv-value'
  | 'invalid-header-name'
  | 'invalid-header-value';

export type CopyFormatResult =
  | { ok: true; text: string }
  | { ok: false; reason: CopyFormatFailureReason };

// An absolute end assertion also rejects a trailing newline, unlike `$`.
const VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*(?![\s\S])/;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+(?![\s\S])/;

/** Pure formatting only; callers decide when to write to the clipboard. */
export function formatAs(
  format: CopyFormat,
  { name, value }: { name?: string; value: string },
): CopyFormatResult {
  const fieldName = name ?? (format === 'http-header' ? 'X-Value' : 'VALUE');
  switch (format) {
    case 'raw':
      return { ok: true, text: value };
    case 'shell-export':
      if (!VARIABLE_NAME.test(fieldName)) {
        return { ok: false, reason: 'invalid-variable-name' };
      }
      // POSIX shells cannot represent NUL in a variable's value.
      if (value.includes('\0')) {
        return { ok: false, reason: 'invalid-shell-value' };
      }
      return {
        ok: true,
        text: `export ${fieldName}='${value.replaceAll("'", "'\\''")}'`,
      };
    case 'dotenv': {
      if (!VARIABLE_NAME.test(fieldName)) {
        return { ok: false, reason: 'invalid-variable-name' };
      }
      const quoted = quoteDotenvValue(value);
      return quoted === null
        ? { ok: false, reason: 'invalid-dotenv-value' }
        : { ok: true, text: `${fieldName}=${quoted}` };
    }
    case 'json-field':
      return {
        ok: true,
        text: `${JSON.stringify(fieldName)}: ${JSON.stringify(value)}`,
      };
    case 'http-header':
      if (!HEADER_NAME.test(fieldName)) {
        return { ok: false, reason: 'invalid-header-name' };
      }
      if (/[\r\n\0]/.test(value)) {
        return { ok: false, reason: 'invalid-header-value' };
      }
      return { ok: true, text: `${fieldName}: ${value}` };
  }
}

/**
 * Picks a quoting style that the `dotenv` parser reads back verbatim. It has
 * no escape sequences except `\n`/`\r` expansion inside double quotes, so a
 * value is wrapped in a quote character it does not contain; single quotes and
 * backticks keep real line breaks. `${}` expansion by dotenv-expand is out of
 * scope: single quotes are preferred because most loaders leave them literal.
 */
function quoteDotenvValue(value: string): string | null {
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  if (!value.includes('`')) {
    return `\`${value}\``;
  }
  if (!value.includes('"') && !/\\[nr]/.test(value)) {
    return `"${value.replaceAll('\r', '\\r').replaceAll('\n', '\\n')}"`;
  }
  return null;
}
