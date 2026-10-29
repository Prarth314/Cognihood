import { describe, expect, it } from 'vitest';
import { validateNewPassword } from './passwordValidation';

describe('new password validation', () => {
  it('rejects matching passwords shorter than the account policy', () => {
    expect(validateNewPassword('short', 'short')).toContain('at least 10');
  });

  it('rejects a mistyped confirmation even if both entries are long enough', () => {
    expect(validateNewPassword('example-password-one', 'example-password-two')).toContain('do not match');
  });

  it('accepts matching long passwords without silently trimming them', () => {
    expect(validateNewPassword('example password ', 'example password ')).toBeNull();
    expect(validateNewPassword('example password ', 'example password')).not.toBeNull();
  });
});
