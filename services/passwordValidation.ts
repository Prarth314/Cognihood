export const MIN_PASSWORD_LENGTH = 10;

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`;
  if (password !== confirmation) return 'The passwords do not match. Enter the same new password twice.';
  return null;
}
