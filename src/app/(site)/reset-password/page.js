'use client';
// Port of components/pages/reset-password/reset-password.component.{html,ts}.
import { Suspense } from 'react';
import SiteChrome from '@/components/layout/SiteChrome';
import AuthBanner from '@/components/auth/AuthBanner';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <SiteChrome>
      <section className="login-block">
        <div className="container">
          <div className="row">
            <AuthBanner />
            <div className="col-md-6 login-sec">
              <h2 className="text-center">Reset Password</h2>
              <Suspense>
                <ResetPasswordForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
