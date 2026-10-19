// SPDX-License-Identifier: MPL-2.0

/**
 * Local, prefix-based credential detection. Only formats with a distinctive
 * shape are recognized; unprefixed random strings (such as an AWS secret key)
 * are deliberately ignored to keep false positives rare. Nothing here leaves
 * the device.
 */

interface DetectionRule {
  labelId: string;
  matches: (content: string) => boolean;
}

const AWS_ACCESS_KEY_PATTERN = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/;
const ALIYUN_ACCESS_KEY_PATTERN = /\bLTAI[A-Za-z0-9]{12,30}\b/;
const GITHUB_TOKEN_PATTERN =
  /\b(?:gh[oprsu]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/;
const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/;
const AI_API_KEY_PATTERN = /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{20,}/g;
const PRIVATE_KEY_PATTERN = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;
const PUBLIC_KEY_PATTERN =
  /-----BEGIN (?:RSA |EC )?PUBLIC KEY-----|\bssh-(?:rsa|ed25519|ecdsa-sha2-nistp\d{3}) AAAA[A-Za-z0-9+/]{20,}/;
// Requires inline credentials (`user:password@`); bare hosts are not secrets.
const CONNECTION_STRING_PATTERN =
  /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?|mssql|sqlserver):\/\/[^\s:@/]*:[^\s@/]+@[^\s/]+/i;

const RULES: readonly DetectionRule[] = [
  {
    labelId: 'ak',
    matches: (content) =>
      AWS_ACCESS_KEY_PATTERN.test(content) ||
      ALIYUN_ACCESS_KEY_PATTERN.test(content),
  },
  {
    labelId: 'token',
    matches: (content) =>
      GITHUB_TOKEN_PATTERN.test(content) || JWT_PATTERN.test(content),
  },
  { labelId: 'api-key', matches: hasAiApiKey },
  {
    labelId: 'private-key',
    matches: (content) => PRIVATE_KEY_PATTERN.test(content),
  },
  {
    labelId: 'public-key',
    matches: (content) => PUBLIC_KEY_PATTERN.test(content),
  },
  {
    labelId: 'connection-string',
    matches: (content) => CONNECTION_STRING_PATTERN.test(content),
  },
];

/** Returns built-in label IDs for recognized formats, in a stable order. */
export function detectLabelIds(content: string): string[] {
  return RULES.filter((rule) => rule.matches(content)).map(
    (rule) => rule.labelId,
  );
}

/** `sk-` keys must contain a digit so hyphenated prose is not mistaken for one. */
function hasAiApiKey(content: string): boolean {
  for (const match of content.matchAll(AI_API_KEY_PATTERN)) {
    if (/\d/.test(match[0])) {
      return true;
    }
  }
  return false;
}
