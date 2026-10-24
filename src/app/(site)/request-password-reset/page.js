// Route "request-password-reset" → RequestResetPasswordComponent, which can
// only live inside a MatDialog (it injects MatDialogRef): routing to it failed
// with NullInjectorError and the Angular app ended on an empty page at "/"
// (R-35). DEV-F06: the port redirects to "/" (home page rendered).
import { redirect } from 'next/navigation';

export default function RequestPasswordResetPage() {
  redirect('/');
}
