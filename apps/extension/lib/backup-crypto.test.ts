// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';

import {
  BackupCryptoError,
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
} from './backup-crypto';
import { BackupFormatError, parseBackup, serializeBackup } from './backup-format';

// The minimum accepted work factor keeps tests fast without bypassing bounds.
const iterations = 100_000;
const passphrase = 'correct horse battery';
const plaintext = [
  'format: snippet-vault-export',
  'formatVersion: 2',
  'items:',
  '  - content: |',
  '      LTAI5t 第二行 🔑',
  '',
].join('\n');

async function expectCode(
  promise: Promise<unknown>,
  code: BackupCryptoError['code'],
) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('backup encryption', () => {
  it('round-trips plaintext and does not expose it in the envelope', async () => {
    const encrypted = await encryptBackup(plaintext, passphrase, { iterations });

    expect(isEncryptedBackup(encrypted)).toBe(true);
    expect(encrypted).not.toContain('LTAI5t');
    await expect(decryptBackup(encrypted, passphrase)).resolves.toBe(plaintext);
  });

  it('uses a fresh salt and IV for each export', async () => {
    const first = parse(await encryptBackup(plaintext, passphrase, { iterations }));
    const second = parse(await encryptBackup(plaintext, passphrase, { iterations }));

    expect(first.encryption.salt).not.toBe(second.encryption.salt);
    expect(first.encryption.iv).not.toBe(second.encryption.iv);
  });

  it('rejects a wrong passphrase', async () => {
    const encrypted = await encryptBackup(plaintext, passphrase, { iterations });

    await expectCode(decryptBackup(encrypted, 'wrong passphrase'), 'decrypt-failed');
  });

  it.each(['salt', 'iv'] as const)(
    'rejects a tampered %s',
    async (field) => {
      const envelope = parse(
        await encryptBackup(plaintext, passphrase, { iterations }),
      );
      const other = parse(
        await encryptBackup(plaintext, passphrase, { iterations }),
      );
      envelope.encryption[field] = other.encryption[field];

      await expectCode(
        decryptBackup(stringify(envelope), passphrase),
        'decrypt-failed',
      );
    },
  );

  it('authenticates the work factor', async () => {
    const envelope = parse(
      await encryptBackup(plaintext, passphrase, { iterations }),
    );
    envelope.encryption.iterations = iterations + 1;

    await expectCode(
      decryptBackup(stringify(envelope), passphrase),
      'decrypt-failed',
    );
  });

  it('rejects malformed envelopes before running the KDF', async () => {
    const envelope = parse(
      await encryptBackup(plaintext, passphrase, { iterations }),
    );

    for (const mutate of [
      (value: typeof envelope) => {
        value.encryption.iterations = 1;
      },
      (value: typeof envelope) => {
        value.encryption.algorithm = 'AES-128-CBC';
      },
      (value: typeof envelope) => {
        value.ciphertext = 'not base64!';
      },
      (value: typeof envelope) => {
        value.formatVersion = 3;
      },
    ]) {
      const copy = structuredClone(envelope);
      mutate(copy);
      await expectCode(
        decryptBackup(stringify(copy), passphrase),
        'invalid-envelope',
      );
    }
  });

  it('rejects short passphrases when encrypting', async () => {
    await expectCode(encryptBackup(plaintext, 'short'), 'weak-passphrase');
  });

  it('does not treat plaintext backups as encrypted', () => {
    expect(isEncryptedBackup(plaintext)).toBe(false);
    expect(isEncryptedBackup('{"format":"snippet-vault-export"}')).toBe(false);
    expect(isEncryptedBackup(': not yaml : [')).toBe(false);
  });

  it('round-trips a serialized backup through encryption and parsing', async () => {
    const snapshot = {
      labels: [],
      records: [
        {
          kind: 'vault' as const,
          item: {
            id: 'item-1',
            content: 'line one\n  indented: value # not a comment\n',
            labelIds: [],
            pinned: false,
            createdAt: 1_760_000_000_000,
            updatedAt: 1_760_000_000_000,
          },
        },
      ],
    };
    const serialized = serializeBackup(snapshot);
    const encrypted = await encryptBackup(serialized, passphrase, { iterations });

    expect(() => parseBackup(encrypted)).toThrow(BackupFormatError);
    const decrypted = await decryptBackup(encrypted, passphrase);
    expect(parseBackup(decrypted).snapshot).toEqual(snapshot);
  });
});
