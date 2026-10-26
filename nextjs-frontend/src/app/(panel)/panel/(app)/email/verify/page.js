'use client';


import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePanel } from '@/components/panel/PanelProvider';
import { PanelPage } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';

export default function PanelVerifyNoticePage() {
  const panel = usePanel();
  const router = useRouter();
  const [resent, setResent] = useState(false);
  const verified = Boolean(panel.user?.email_verified_at);

  useEffect(() => {
    if (verified) router.replace('/panel');
  }, [verified, router]);

  const resend = async (e) => {
    e.preventDefault();
    const res = await panelApi.post('/panel/email/resend');
    if (res.ok && res.data?.verified) router.replace('/panel');
    else if (res.ok) setResent(true);
  };

  return (
    <PanelPage title="" heading="">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Verify Your Email Address</h5>
                {resent && (
                  <div className="alert alert-success" role="alert">
                    A fresh verification link has been sent to your email address.
                  </div>
                )}
                Before proceeding, please check your email for a verification link. If you did not receive the email,{' '}
                <form action="/panel/email/resend" method="POST" className="d-inline" onSubmit={resend}>
                  <button type="submit" className="d-inline btn btn-link p-0">
                    click here to request another
                  </button>
                  .
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PanelPage>
  );
}
