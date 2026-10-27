// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { detectLabelIds } from './secret-detection';

describe('secret detection', () => {
  it.each([
    ['AWS access key', 'AKIAIOSFODNN7EXAMPLE', ['ak']],
    ['AWS temporary key', 'id=ASIAY34FZKBOKMUTVV7A', ['ak']],
    ['Aliyun access key', 'LTAI5tQZ9xKm3PbN8rW2', ['ak']],
    ['GitHub classic token', `ghp_${'a1B2'.repeat(9)}`, ['token']],
    ['GitHub fine-grained token', `github_pat_${'11ABCDEFG0'.repeat(3)}`, ['token']],
    [
      'JWT',
      'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      ['token'],
    ],
    ['OpenAI project key', `sk-proj-${'Ab3d'.repeat(8)}`, ['api-key']],
    ['Anthropic key', `sk-ant-api03-${'Xy9_'.repeat(8)}`, ['api-key']],
    [
      'PEM private key',
      '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaA==\n-----END OPENSSH PRIVATE KEY-----',
      ['private-key'],
    ],
    ['PEM public key', '-----BEGIN PUBLIC KEY-----\nMIIBIjAN\n', ['public-key']],
    ['SSH public key', `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5${'A'.repeat(20)} me@host`, ['public-key']],
    ['Postgres URL', 'postgres://app:s3cr3t@db.internal:5432/app', ['connection-string']],
    ['MongoDB SRV URL', 'mongodb+srv://user:pa55@cluster0.example.net/db', ['connection-string']],
    ['Redis URL with empty user', 'rediss://:token123@cache.example.com:6380', ['connection-string']],
  ])('detects %s', (_name, content, expected) => {
    expect(detectLabelIds(content)).toEqual(expected);
  });

  it.each([
    ['plain prose', 'Remember to rotate the staging credentials next week.'],
    ['hyphenated prose after sk-', 'sk-this-is-just-a-long-hyphenated-phrase'],
    ['word containing sk-', 'task-manager-configuration-reference-1234'],
    ['lowercase AKIA-like text', 'akiaiosfodnn7example'],
    ['short AKIA prefix', 'AKIA1234'],
    ['AWS secret key without prefix', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'],
    ['database URL without password', 'postgres://db.internal:5432/app'],
    ['https URL with credentials', 'https://user:pass@example.com'],
    ['code snippet', 'const token = getToken();\nfetch(url, { headers });'],
    ['ghp prefix too short', 'ghp_abc123'],
  ])('ignores %s', (_name, content) => {
    expect(detectLabelIds(content)).toEqual([]);
  });

  it('returns each label once in rule order', () => {
    const content = [
      'postgres://app:s3cr3t@db:5432/app',
      'AKIAIOSFODNN7EXAMPLE',
      'LTAI5tQZ9xKm3PbN8rW2',
      `sk-proj-${'Ab3d'.repeat(8)}`,
    ].join('\n');

    expect(detectLabelIds(content)).toEqual([
      'ak',
      'api-key',
      'connection-string',
    ]);
  });
});
