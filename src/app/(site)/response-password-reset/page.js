'use client';
// Port of components/shared/navbar/response-reset-password/response-reset-password.component.{html,ts}
// (guest-only route, see proxy.js).
import { Suspense } from 'react';
import SiteChrome from '@/components/layout/SiteChrome';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export default function ResponsePasswordResetPage() {
  return (
    <SiteChrome>
      <div className="container mt-4 mb-4 col-sm-6 col-md-4">
        <div className="modal-header">
          <h6 className="modal-title login-title" id="login-modal">
            Forgot Password
          </h6>
        </div>
        <div className="modal-body modal-content">
          <Suspense>
            <ResetPasswordForm variant="response" />
          </Suspense>
        </div>
      </div>
    </SiteChrome>
  );
}
