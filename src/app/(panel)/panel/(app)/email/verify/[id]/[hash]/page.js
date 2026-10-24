'use client';
// email/verify/{id}/{hash}?expires&signature (VerificationController@verify,
// auth + signed): marks the address verified and goes to the dashboard; a bad
// or expired signature, or another user's link, is a 403.
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { usePanel } from '@/components/panel/PanelProvider';
import { PanelPage } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';

export default function PanelVerifyEmailPage({ params }) {
  const { id, hash } = use(params);
  const query = useSearchParams();
  const router = useRouter();
  const { refresh } = usePanel();
  const [error, setError] = useState(null);
  const expires = query.get('expires');
  const signature = query.get('signature');

  useEffect(() => {
    panelApi.post('/panel/email/verify', { id, hash, expires, signature }).then(async (r) => {
      if (r.ok) {
        await refresh();
        router.replace('/panel');
      } else setError(r.data?.message || r.data?.error || 'This action is unauthorized.');
    });
  }, [id, hash, expires, signature, refresh, router]);

  return (
    <PanelPage title="" heading="">
      {error && (
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">403</h5>
                  {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PanelPage>
  );
}
