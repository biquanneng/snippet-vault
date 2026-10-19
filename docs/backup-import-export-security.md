# Backup import and export security

Status: implemented local v2 boundary (YAML, optional passphrase encryption)  
Updated: 2026-10-19

## Scope

SnippetVault can export and import local backup files from Settings → Storage.
This is a manual, single-device feature. It does not upload files, store cloud
credentials, merge records, synchronize devices, or change UI preferences.

The backup contains authoritative labels, Vault records, and active Temporary
workspace records. It deliberately excludes the disposable search index and
storage metadata. Expired Temporary records are excluded at export and checked
again at import so an old archive cannot revive them.

## File format

Backups use the `.sv` extension and contain YAML, format version 2. Multi-line
snippet content is written as a literal block scalar and placed last in each
record so the file stays readable and diff-friendly. Version 1 JSON backups are
still accepted on import; their legacy contexts are converted to labels with
the same rules as the storage v3 → v4 migration. Export always writes version 2.

An encrypted backup is a YAML envelope:

```yaml
format: snippet-vault-export
formatVersion: 2
encryption:
  algorithm: AES-256-GCM
  kdf: PBKDF2-SHA-256
  iterations: 600000
  salt: <base64, 16 bytes>
  iv: <base64, 12 bytes>
ciphertext: <base64>
```

Decrypting `ciphertext` yields exactly the plaintext version 2 YAML document.

## Protection boundary

- Encryption is the default export option. The key is derived from the user's
  passphrase with PBKDF2-SHA-256 (600,000 iterations) and a fresh random salt;
  the content is encrypted with AES-256-GCM and a fresh random IV. All of this
  uses WebCrypto; no cryptography dependency is bundled.
- Every envelope field except `ciphertext` is bound as AES-GCM additional
  authenticated data, so changing the algorithm, iteration count, salt, or IV
  makes decryption fail instead of silently weakening it.
- Import rejects envelopes whose iteration count is outside 100,000–10,000,000
  before running the KDF, so a crafted file cannot force a trivial or
  multi-minute derivation.
- Encryption and decryption run only in the side panel page. The passphrase is
  never stored, never written to extension storage, and never sent through
  runtime messaging; the background only sees plaintext YAML, as before.
- A wrong passphrase and a damaged file produce the same error. A forgotten
  passphrase cannot be recovered.
- Plaintext export remains available. Such a file contains snippet content,
  secrets, full URLs, and source metadata in readable form.
- SnippetVault still does not encrypt the live IndexedDB database, and it does
  not defend a machine already controlled by malware or a user with
  browser-profile access.

## Import trust and validation

- Only a verified extension page can request export, inspection, or import.
  Content scripts and ordinary web pages are denied.
- The file picker and settings UI accept `.sv` backup files only; the content
  is still validated independently and is never trusted based on its filename.
- Runtime messages carrying plaintext are limited to 25 MiB; encrypted files
  may be up to roughly 4/3 of that before decryption, and the decrypted
  plaintext is checked against the same 25 MiB limit.
- YAML is parsed with the core schema only. Custom tags, aliases, duplicate
  keys, multi-document streams, and non-mapping documents are rejected. An
  encrypted envelope sent to the background without decryption is rejected.
- The importer accepts only the supported formats and versions, known fields
  and enums, bounded field lengths, valid normalized HTTP(S) source URLs,
  unique IDs, and complete label references. The built-in label IDs must
  remain present so a restore does not trigger implicit default-data merging
  on a later startup.
- A preview returns only format metadata and record counts. It does not return
  snippet contents to the settings UI.
- The decrypted archive is parsed again when the user confirms import; no
  service-worker preview cache is trusted.

## Replacement and failure behavior

Import is a full replacement, never a merge. The preview records the current
business-data revision. If any local write or cleanup changes that revision
before confirmation, import returns a conflict with zero writes and requires a
new preview.

Labels, Vault items, and Temporary items are cleared and replaced in one
IndexedDB read-write transaction. A failed clear, put, validation, or
transaction leaves the previously committed business data intact. A successful
transaction advances the local revision once.

The FlexSearch index is derived state and cannot share that transaction. It is
rebuilt after commit. If rebuilding fails, the imported business data remains
authoritative and the operation reports `rebuild-required`; later search must
rebuild rather than return stale results.

## Residual risks

- A malicious file within the configured size limit can still consume
  noticeable CPU and memory while being rejected.
- Passphrase strength is the user's responsibility; only a minimum length of
  8 characters is enforced.
- Backup files can outlive deletion from the live extension database and must
  be managed by the user like any other sensitive local file.
- Import has no undo. Users should export a fresh encrypted backup and store it
  securely before replacing data they may need later.
- SnippetVault 0.3.x cannot read version 2 backups.
