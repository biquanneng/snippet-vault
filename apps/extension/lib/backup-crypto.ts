// SPDX-License-Identifier: MPL-2.0

import { parse, stringify } from 'yaml';

import { BACKUP_FORMAT } from './backup-format';

export const ENCRYPTED_BACKUP_FORMAT_VERSION = 2;
export const BACKUP_ENCRYPTION_ALGORITHM = 'AES-256-GCM';
export const BACKUP_KDF = 'PBKDF2-SHA-256';
export const BACKUP_KDF_ITERATIONS = 600_000;
export const MIN_BACKUP_PASSPHRASE_LENGTH = 8;

const SALT_BYTES = 16;
const IV_BYTES = 12;
// Bounds keep a crafted file from forcing a near-zero or multi-minute KDF.
const MIN_KDF_ITERATIONS = 100_000;
const MAX_KDF_ITERATIONS = 10_000_000;

export type BackupCryptoErrorCode =
  | 'invalid-envelope'
  | 'decrypt-failed'
  | 'weak-passphrase';

export class BackupCryptoError extends Error {
  readonly name = 'BackupCryptoError';

  constructor(
    readonly code: BackupCryptoErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface EncryptionParameters {
  algorithm: typeof BACKUP_ENCRYPTION_ALGORITHM;
  kdf: typeof BACKUP_KDF;
  iterations: number;
  salt: string;
  iv: string;
}

interface EncryptedBackupEnvelope {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof ENCRYPTED_BACKUP_FORMAT_VERSION;
  encryption: EncryptionParameters;
  ciphertext: string;
}

interface EncryptOptions {
  iterations?: number;
}

/** Returns true when the file is an encrypted envelope, valid or not. */
export function isEncryptedBackup(serialized: string): boolean {
  const document = parseEnvelopeDocument(serialized);
  return document !== null && 'encryption' in document;
}

/**
 * Encrypts a plaintext backup. Every envelope field except `ciphertext` is
 * authenticated as AES-GCM additional data, so tampering fails decryption.
 */
export async function encryptBackup(
  plaintext: string,
  passphrase: string,
  options: EncryptOptions = {},
): Promise<string> {
  assertPassphrase(passphrase);
  const encryption: EncryptionParameters = {
    algorithm: BACKUP_ENCRYPTION_ALGORITHM,
    kdf: BACKUP_KDF,
    iterations: options.iterations ?? BACKUP_KDF_ITERATIONS,
    salt: toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES))),
    iv: toBase64(crypto.getRandomValues(new Uint8Array(IV_BYTES))),
  };
  const key = await deriveKey(passphrase, encryption);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64(encryption.iv),
      additionalData: toAdditionalData(encryption),
    },
    key,
    new TextEncoder().encode(plaintext),
  );

  const envelope: EncryptedBackupEnvelope = {
    format: BACKUP_FORMAT,
    formatVersion: ENCRYPTED_BACKUP_FORMAT_VERSION,
    encryption,
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  return stringify(envelope, { lineWidth: 0 });
}

/** Decrypts an envelope. A wrong passphrase and a damaged file look the same. */
export async function decryptBackup(
  serialized: string,
  passphrase: string,
): Promise<string> {
  const envelope = readEnvelope(serialized);
  let plaintext: ArrayBuffer;
  try {
    const key = await deriveKey(passphrase, envelope.encryption);
    plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(envelope.encryption.iv),
        additionalData: toAdditionalData(envelope.encryption),
      },
      key,
      fromBase64(envelope.ciphertext),
    );
  } catch {
    throw new BackupCryptoError(
      'decrypt-failed',
      'The passphrase is wrong or the backup is damaged',
    );
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
}

export function assertPassphrase(passphrase: string): void {
  if ([...passphrase].length < MIN_BACKUP_PASSPHRASE_LENGTH) {
    throw new BackupCryptoError(
      'weak-passphrase',
      `The passphrase must contain at least ${MIN_BACKUP_PASSPHRASE_LENGTH} characters`,
    );
  }
}

async function deriveKey(
  passphrase: string,
  encryption: EncryptionParameters,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromBase64(encryption.salt),
      iterations: encryption.iterations,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toAdditionalData(encryption: EncryptionParameters): Uint8Array<ArrayBuffer> {
  // Fixed key order keeps the authenticated bytes independent of YAML layout.
  return new TextEncoder().encode(
    JSON.stringify([
      BACKUP_FORMAT,
      ENCRYPTED_BACKUP_FORMAT_VERSION,
      encryption.algorithm,
      encryption.kdf,
      encryption.iterations,
      encryption.salt,
      encryption.iv,
    ]),
  );
}

function readEnvelope(serialized: string): EncryptedBackupEnvelope {
  const document = parseEnvelopeDocument(serialized);
  const encryption = document?.encryption;
  if (
    !document ||
    document.format !== BACKUP_FORMAT ||
    document.formatVersion !== ENCRYPTED_BACKUP_FORMAT_VERSION ||
    !isRecord(encryption) ||
    encryption.algorithm !== BACKUP_ENCRYPTION_ALGORITHM ||
    encryption.kdf !== BACKUP_KDF ||
    !Number.isSafeInteger(encryption.iterations) ||
    (encryption.iterations as number) < MIN_KDF_ITERATIONS ||
    (encryption.iterations as number) > MAX_KDF_ITERATIONS ||
    !isBase64OfLength(encryption.salt, SALT_BYTES) ||
    !isBase64OfLength(encryption.iv, IV_BYTES) ||
    typeof document.ciphertext !== 'string' ||
    !isBase64(document.ciphertext)
  ) {
    throw new BackupCryptoError(
      'invalid-envelope',
      'The file is not a valid encrypted SnippetVault backup',
    );
  }
  return document as unknown as EncryptedBackupEnvelope;
}

function parseEnvelopeDocument(
  serialized: string,
): Record<string, unknown> | null {
  if (serialized.trimStart().startsWith('{')) {
    return null;
  }
  try {
    const document: unknown = parse(serialized, {
      schema: 'core',
      customTags: [],
      maxAliasCount: 0,
      uniqueKeys: true,
    });
    return isRecord(document) ? document : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function isBase64(value: string): boolean {
  return value.length > 0 && BASE64_PATTERN.test(value);
}

function isBase64OfLength(value: unknown, bytes: number): boolean {
  return (
    typeof value === 'string' &&
    isBase64(value) &&
    fromBase64(value).byteLength === bytes
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
