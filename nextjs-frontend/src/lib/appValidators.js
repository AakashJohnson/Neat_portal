// Port of src/app/theme/utils/app-validators.ts.


export function emailValidator(value) {
  const emailRegexp = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/;
  if (value && !emailRegexp.test(value)) return { invalidEmail: true };
  return null;
}

/**
 * matchingPasswords(passwordKey, confirmationKey): group validator that, on a
 * mismatch, replaces the confirmation control's errors with
 * { mismatchedPasswords: true } (passwordConfirmation.setErrors(...)) and adds
 * no group-level error. useFormGroup applies `controlErrors`.
 */
export function matchingPasswords(passwordKey, passwordConfirmationKey) {
  return (values) => (values[passwordKey] !== values[passwordConfirmationKey] ? { controlErrors: { [passwordConfirmationKey]: { mismatchedPasswords: true } } } : null);
}
