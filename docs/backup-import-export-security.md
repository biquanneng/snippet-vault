# Backup import and export security

Status: implemented local v1 boundary  
Updated: 2026-08-01

## Scope

SnippetVault can export and import local backup files from Settings → Storage.
This is a manual, single-device feature. It does not upload files, store cloud
credentials, merge records, synchronize devices, or change UI preferences.

The backup contains authoritative labels, contexts, Vault records, and active
Temporary workspace records. It deliberately excludes the disposable search
index and storage metadata. Expired Temporary records are excluded at export
and checked again at import so an old archive cannot revive them.

## Protection boundary

SnippetVault exports one readable JSON format using the `.sv` extension. The
file contains snippet content, secrets, full URLs, and source metadata. Anyone
who can read the file can read the exported data. SnippetVault does not encrypt
the backup or the live IndexedDB database, and it does not defend a machine
already controlled by malware or a user with browser-profile access.

## Import trust and validation

- Only a verified extension page can request export, inspection, or import.
  Content scripts and ordinary web pages are denied.
- The file picker and settings UI accept `.sv` backup files only; the content
  is still validated independently and is never trusted based on its filename.
- Runtime messages and selected files are limited to 25 MiB.
- The importer accepts only the exact supported format and version, known
  fields and enums, bounded field lengths, valid normalized HTTP(S) source
  URLs, unique IDs, and complete label/context references. The built-in label
  and environment IDs must remain present so a restore does not trigger
  implicit default-data merging on a later startup.
- A preview returns only format metadata and record counts. It does not return
  snippet contents to the settings UI.
- The original archive is parsed again when the user confirms import; no
  service-worker preview cache is trusted.

## Replacement and failure behavior

Import is a full replacement, never a merge. The preview records the current
business-data revision. If any local write or cleanup changes that revision
before confirmation, import returns a conflict with zero writes and requires a
new preview.

Labels, contexts, Vault items, and Temporary items are cleared and replaced in
one IndexedDB read-write transaction. A failed clear, put, validation, or
transaction leaves the previously committed business data intact. A successful
transaction advances the local revision once.

The FlexSearch index is derived state and cannot share that transaction. It is
rebuilt after commit. If rebuilding fails, the imported business data remains
authoritative and the operation reports `rebuild-required`; later search must
rebuild rather than return stale results.

## Residual risks

- A malicious file within the configured size limit can still consume
  noticeable CPU and memory while being rejected.
- Backup files can outlive deletion from the live extension database and must
  be managed by the user like any other sensitive local file.
- Import has no undo in v1. Users should export a fresh JSON backup and store it
  securely before replacing data they may need later.
