import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '../services/passwordValidation';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

const PasswordRecoveryForm: React.FC = () => {
  const { recoverySessionReady, updatePassword, exitPasswordRecovery, error, clearError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validateNewPassword(password, confirmation);
    setValidationError(problem);
    if (problem) return;
    setBusy(true);
    clearError();
    try {
      await updatePassword(password);
      setPassword('');
      setConfirmation('');
    } catch {
      // AuthContext presents provider and session errors without logging credentials.
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await exitPasswordRecovery();
    } catch {
      // Leave the recovery screen visible until its session has ended.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <h1 className="ui-display">CogniHood</h1>
          <p className="ui-body">Choose a new password for your account.</p>
        </div>
        <Card>
          <div className="space-y-5">
            <h2 className="ui-h2">Reset your password</h2>
            <p className="ui-body">Use at least {MIN_PASSWORD_LENGTH} characters. After saving, sign in with your new password.</p>
            {(error || validationError) && <p className="ui-field-error" role="alert">{validationError ?? error}</p>}
            <form className="space-y-4" onSubmit={submit}>
              <Input label="New password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={password} onChange={event => { setPassword(event.target.value); setValidationError(null); }} disabled={!recoverySessionReady || busy} />
              <Input label="Confirm new password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={confirmation} onChange={event => { setConfirmation(event.target.value); setValidationError(null); }} disabled={!recoverySessionReady || busy} />
              <Button type="submit" className="w-full" disabled={!recoverySessionReady || busy}>{busy ? 'Please wait…' : 'Save new password'}</Button>
              <Button variant="ghost" className="w-full" onClick={() => { void cancel(); }} disabled={busy}>Return to sign in</Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PasswordRecoveryForm;
