// SPDX-License-Identifier: MPL-2.0

import { useEffect, useId, useState, type FormEvent } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';

import {
  Alert,
  AlertDescription,
} from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import { MIN_BACKUP_PASSPHRASE_LENGTH } from '../../lib/backup-crypto';
import { useI18n } from '../../lib/use-i18n';

export type BackupPassphraseDialogMode = 'export' | 'decrypt';

export type BackupPassphraseSubmission =
  | { encrypt: true; passphrase: string }
  | { encrypt: false };

interface BackupPassphraseDialogProps {
  mode: BackupPassphraseDialogMode | null;
  busy: boolean;
  /** Shown under the passphrase field, e.g. after a failed decryption. */
  error?: string;
  /** Lets the owner clear `error` once the user starts correcting it. */
  onPassphraseEdit?: () => void;
  onCancel: () => void;
  onSubmit: (submission: BackupPassphraseSubmission) => void;
}

export function BackupPassphraseDialog({
  mode,
  busy,
  error,
  onPassphraseEdit,
  onCancel,
  onSubmit,
}: BackupPassphraseDialogProps) {
  const { t } = useI18n();
  const passphraseId = useId();
  const confirmationId = useId();
  const encryptId = useId();
  const [encrypt, setEncrypt] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validationError, setValidationError] = useState<string>();
  const exporting = mode === 'export';
  const needsPassphrase = !exporting || encrypt;
  const fieldError = validationError ?? error;

  useEffect(() => {
    // Passphrases never outlive the dialog that collected them.
    setEncrypt(true);
    setPassphrase('');
    setConfirmation('');
    setValidationError(undefined);
  }, [mode]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }
    if (!needsPassphrase) {
      onSubmit({ encrypt: false });
      return;
    }
    if (
      exporting &&
      [...passphrase].length < MIN_BACKUP_PASSPHRASE_LENGTH
    ) {
      setValidationError(
        t('settings.storage.passphraseTooShort', [
          MIN_BACKUP_PASSPHRASE_LENGTH,
        ]),
      );
      return;
    }
    if (exporting && passphrase !== confirmation) {
      setValidationError(t('settings.storage.passphraseMismatch'));
      return;
    }
    setValidationError(undefined);
    onSubmit({ encrypt: true, passphrase });
  }

  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          onCancel();
        }
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {exporting
                ? t('settings.storage.exportDialogTitle')
                : t('settings.storage.decryptDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {exporting
                ? t('settings.storage.exportDialogDescription')
                : t('settings.storage.decryptDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            {exporting ? (
              <Field orientation="horizontal">
                <Checkbox
                  id={encryptId}
                  checked={encrypt}
                  disabled={busy}
                  onCheckedChange={(checked) => {
                    setEncrypt(checked === true);
                    setValidationError(undefined);
                  }}
                />
                <FieldContent>
                  <FieldLabel htmlFor={encryptId}>
                    {t('settings.storage.encryptLabel')}
                  </FieldLabel>
                  <FieldDescription>
                    {t('settings.storage.encryptDescription')}
                  </FieldDescription>
                </FieldContent>
              </Field>
            ) : null}

            {needsPassphrase ? (
              <>
                <Field data-invalid={fieldError ? true : undefined}>
                  <FieldLabel htmlFor={passphraseId}>
                    {t('settings.storage.passphrase')}
                  </FieldLabel>
                  <Input
                    id={passphraseId}
                    type="password"
                    autoFocus
                    autoComplete={
                      exporting ? 'new-password' : 'current-password'
                    }
                    value={passphrase}
                    disabled={busy}
                    aria-invalid={fieldError ? true : undefined}
                    onChange={(event) => {
                      setPassphrase(event.target.value);
                      setValidationError(undefined);
                      onPassphraseEdit?.();
                    }}
                  />
                  {!exporting && fieldError ? (
                    <FieldError>{fieldError}</FieldError>
                  ) : null}
                </Field>
                {exporting ? (
                  <Field data-invalid={fieldError ? true : undefined}>
                    <FieldLabel htmlFor={confirmationId}>
                      {t('settings.storage.passphraseConfirm')}
                    </FieldLabel>
                    <Input
                      id={confirmationId}
                      type="password"
                      autoComplete="new-password"
                      value={confirmation}
                      disabled={busy}
                      aria-invalid={fieldError ? true : undefined}
                      onChange={(event) => {
                        setConfirmation(event.target.value);
                        setValidationError(undefined);
                      }}
                    />
                    {fieldError ? <FieldError>{fieldError}</FieldError> : null}
                  </Field>
                ) : null}
              </>
            ) : (
              <Alert variant="destructive" className="border-0 bg-muted/40">
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>
                  {t('settings.storage.plaintextWarning')}
                </AlertDescription>
              </Alert>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onCancel}
            >
              {t('settings.storage.cancel')}
            </Button>
            <Button type="submit" disabled={busy} aria-busy={busy}>
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : null}
              {exporting
                ? t('settings.storage.exportConfirm')
                : t('settings.storage.decrypt')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
