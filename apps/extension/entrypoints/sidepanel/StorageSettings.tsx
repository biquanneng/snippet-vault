// SPDX-License-Identifier: MPL-2.0

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  Database,
  Download,
  HardDriveUpload,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  BackupCryptoError,
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
} from '../../lib/backup-crypto';
import {
  MAX_BACKUP_CONTENT_LENGTH,
  MESSAGE_TYPE,
  sendExtensionMessage,
  type BackupSummaryData,
  type ExportBackupData,
  type ExtensionErrorCode,
  type ImportBackupData,
} from '../../lib/browser/message-contract';
import { toIntlLocale, type Translator } from '../../lib/i18n-catalog';
import { useI18n } from '../../lib/use-i18n';
import {
  BackupPassphraseDialog,
  type BackupPassphraseDialogMode,
  type BackupPassphraseSubmission,
} from './BackupPassphraseDialog';

type BackupAction = 'export' | 'inspect' | 'import';

/** Base64 ciphertext and the envelope make encrypted files about 4/3 larger. */
const MAX_BACKUP_FILE_LENGTH =
  Math.ceil((MAX_BACKUP_CONTENT_LENGTH * 4) / 3) + 4096;

interface BackupFile {
  contents: string;
  fileName: string;
}

interface PendingImport extends BackupFile {
  encrypted: boolean;
  summary: BackupSummaryData;
}

export function StorageSettings() {
  const { locale, t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [action, setAction] = useState<BackupAction | null>(null);
  const [pendingImport, setPendingImport] =
    useState<PendingImport | null>(null);
  const [passphraseMode, setPassphraseMode] =
    useState<BackupPassphraseDialogMode | null>(null);
  const [encryptedFile, setEncryptedFile] = useState<BackupFile | null>(null);
  const [decryptError, setDecryptError] = useState<string>();
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(toIntlLocale(locale)),
    [locale],
  );
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(toIntlLocale(locale), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );
  const busy = action !== null;

  function startExport() {
    if (!busy) {
      setPassphraseMode('export');
    }
  }

  async function exportBackup(submission: BackupPassphraseSubmission) {
    if (busy) {
      return;
    }

    setAction('export');
    try {
      const response = await sendExtensionMessage<ExportBackupData>({
        type: MESSAGE_TYPE.exportBackup,
      });
      if (!response.ok) {
        showBackupError(response.error.code, response.error.message, t);
        return;
      }

      downloadBackup(
        submission.encrypt
          ? {
              ...response.data,
              contents: await encryptBackup(
                response.data.contents,
                submission.passphrase,
              ),
            }
          : response.data,
      );
      setPassphraseMode(null);
      toast.success(
        submission.encrypt
          ? t('settings.storage.backupExportedEncrypted')
          : t('settings.storage.backupExported'),
      );
    } catch (error: unknown) {
      toast.error(t('settings.storage.backupFailed'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAction(null);
    }
  }

  function chooseBackup() {
    if (!busy) {
      fileInputRef.current?.click();
    }
  }

  async function inspectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || busy) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.sv')) {
      toast.error(t('settings.storage.backupFileOnly'));
      return;
    }
    if (file.size === 0) {
      toast.error(t('settings.storage.backupFailed'));
      return;
    }
    if (file.size > MAX_BACKUP_FILE_LENGTH) {
      toast.error(t('settings.storage.backupTooLarge'));
      return;
    }

    setAction('inspect');
    try {
      const contents = await file.text();
      if (isEncryptedBackup(contents)) {
        setDecryptError(undefined);
        setEncryptedFile({ contents, fileName: file.name });
        setPassphraseMode('decrypt');
        return;
      }
      await previewBackup({ contents, fileName: file.name }, false);
    } catch (error: unknown) {
      toast.error(t('settings.storage.backupFailed'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAction(null);
    }
  }

  async function decryptAndPreview(
    submission: BackupPassphraseSubmission,
  ) {
    if (!encryptedFile || !submission.encrypt || busy) {
      return;
    }

    setAction('inspect');
    try {
      const contents = await decryptBackup(
        encryptedFile.contents,
        submission.passphrase,
      );
      setPassphraseMode(null);
      setEncryptedFile(null);
      await previewBackup(
        { contents, fileName: encryptedFile.fileName },
        true,
      );
    } catch (error: unknown) {
      if (
        error instanceof BackupCryptoError &&
        error.code === 'decrypt-failed'
      ) {
        setDecryptError(t('settings.storage.decryptFailed'));
        return;
      }
      setPassphraseMode(null);
      setEncryptedFile(null);
      toast.error(
        error instanceof BackupCryptoError
          ? t('settings.storage.invalidEncryptedBackup')
          : t('settings.storage.backupFailed'),
        {
          description:
            error instanceof BackupCryptoError || !(error instanceof Error)
              ? undefined
              : error.message,
        },
      );
    } finally {
      setAction(null);
    }
  }

  /** Sends plaintext to the background for validation; never ciphertext. */
  async function previewBackup(backup: BackupFile, encrypted: boolean) {
    if (
      backup.contents.length > MAX_BACKUP_CONTENT_LENGTH ||
      new TextEncoder().encode(backup.contents).byteLength >
        MAX_BACKUP_CONTENT_LENGTH
    ) {
      toast.error(t('settings.storage.backupTooLarge'));
      return;
    }

    const response = await sendExtensionMessage<BackupSummaryData>({
      type: MESSAGE_TYPE.inspectBackup,
      payload: { contents: backup.contents },
    });
    if (!response.ok) {
      showBackupError(response.error.code, response.error.message, t);
      return;
    }

    setPendingImport({ ...backup, encrypted, summary: response.data });
  }

  async function importBackup() {
    if (!pendingImport || busy) {
      return;
    }

    const backup = pendingImport;
    setAction('import');
    const response = await sendExtensionMessage<ImportBackupData>({
      type: MESSAGE_TYPE.importBackup,
      payload: {
        contents: backup.contents,
        expectedDataRevision: backup.summary.expectedDataRevision,
      },
    });
    setAction(null);

    if (!response.ok) {
      setPendingImport(null);
      showBackupError(response.error.code, response.error.message, t);
      return;
    }

    setPendingImport(null);
    toast.success(t('settings.storage.backupImported'), {
      ...(response.data.searchStatus === 'rebuild-required'
        ? {
            description: t(
              'settings.storage.backupImportedIndexPending',
            ),
          }
        : {}),
    });
  }

  return (
    <div className="space-y-5 px-4 py-5 pb-8">
      <section className="space-y-6">
        <div className="flex items-start gap-3 py-3">
          <Database
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">
                {t('settings.storage.localTitle')}
              </h3>
              <Badge variant="secondary" className="rounded-md">
                {t('settings.storage.active')}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t('settings.storage.localDescription')}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 py-3">
          <Download
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium">
              {t('settings.storage.backupTitle')}
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t('settings.storage.backupDescription')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                aria-busy={action === 'export'}
                onClick={startExport}
              >
                {action === 'export' ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download aria-hidden="true" />
                )}
                {t('settings.storage.exportBackup')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                aria-busy={action === 'inspect'}
                onClick={chooseBackup}
              >
                {action === 'inspect' ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <HardDriveUpload aria-hidden="true" />
                )}
                {t('settings.storage.importBackup')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".sv"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => void inspectBackup(event)}
              />
            </div>
          </div>
        </div>
      </section>

      <Alert className="border-0 bg-muted/40 shadow-none">
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>{t('settings.storage.noticeTitle')}</AlertTitle>
        <AlertDescription>
          {t('settings.storage.noticeDescription')}
        </AlertDescription>
      </Alert>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open && action !== 'import') {
            setPendingImport(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.storage.importPreviewTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.storage.importReplaceWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingImport ? (
            <div className="space-y-3">
              <p className="truncate font-mono text-xs text-muted-foreground">
                {pendingImport.fileName}
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <BackupSummaryRow
                  label={t('settings.storage.backupFormat')}
                  value={numberFormatter.format(
                    pendingImport.summary.formatVersion,
                  )}
                />
                <BackupSummaryRow
                  label={t('settings.storage.backupEncryption')}
                  value={
                    pendingImport.encrypted
                      ? t('settings.storage.backupEncrypted')
                      : t('settings.storage.backupNotEncrypted')
                  }
                />
                <BackupSummaryRow
                  label={t('settings.storage.backupExportedAt')}
                  value={dateTimeFormatter.format(
                    new Date(pendingImport.summary.exportedAt),
                  )}
                />
                <BackupSummaryRow
                  label={t('settings.storage.backupLabels')}
                  value={numberFormatter.format(
                    pendingImport.summary.counts.labels,
                  )}
                />
                <BackupSummaryRow
                  label={t('settings.storage.backupVaultItems')}
                  value={numberFormatter.format(
                    pendingImport.summary.counts.vaultItems,
                  )}
                />
                <BackupSummaryRow
                  label={t('settings.storage.backupWorkspaceItems')}
                  value={numberFormatter.format(
                    pendingImport.summary.counts.workspaceItems,
                  )}
                />
                <BackupSummaryRow
                  label={t('settings.storage.backupExpiredSkipped')}
                  value={numberFormatter.format(
                    pendingImport.summary.expiredWorkspaceItems,
                  )}
                />
              </dl>
              <p className="text-xs leading-5 text-muted-foreground">
                {t('settings.storage.importPreferencesUnaffected')}
              </p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={action === 'import'}>
              {t('settings.storage.cancel')}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={action === 'import'}
              aria-busy={action === 'import'}
              onClick={() => void importBackup()}
            >
              {action === 'import' ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : null}
              {t('settings.storage.importReplace')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BackupPassphraseDialog
        mode={passphraseMode}
        busy={busy}
        error={passphraseMode === 'decrypt' ? decryptError : undefined}
        onPassphraseEdit={() => setDecryptError(undefined)}
        onCancel={() => {
          setPassphraseMode(null);
          setEncryptedFile(null);
        }}
        onSubmit={(submission) =>
          void (passphraseMode === 'export'
            ? exportBackup(submission)
            : decryptAndPreview(submission))
        }
      />
    </div>
  );
}

function BackupSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <>
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </>
  );
}

function downloadBackup(backup: ExportBackupData) {
  const url = URL.createObjectURL(
    new Blob([backup.contents], { type: backup.mimeType }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = backup.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function showBackupError(
  code: ExtensionErrorCode,
  message: string,
  t: Translator,
) {
  const title =
    code === 'BACKUP_TOO_LARGE'
      ? t('settings.storage.backupTooLarge')
      : code === 'CONFLICT'
        ? t('settings.storage.backupConflict')
        : t('settings.storage.backupFailed');
  toast.error(title, {
    ...(message !== title ? { description: message } : {}),
  });
}
