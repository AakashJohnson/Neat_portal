'use client';
// announcements::list (AnnouncementListController, 7 per page): the cards of
// every announcement, for any logged-in user.
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnnouncementCard from '@/components/panel/AnnouncementCard';
import Pagination from '@/components/panel/Pagination';
import { Crumb, PanelPage } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';

export default function PanelAnnouncementListPage() {
  const page = useSearchParams().get('page') ?? '1';
  const [result, setResult] = useState(null);
  useEffect(() => {
    panelApi.get('/panel/announcements/list', { page }).then((r) => r.ok && setResult(r.data));
  }, [page]);

  const announcements = result?.data ?? [];
  return (
    <PanelPage title="Announcements" heading="Announcements" breadcrumbs={<Crumb active>Announcements</Crumb>}>
      <div className="row">
        <div className="col-md-6 mx-auto mb-4">
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
          {result && announcements.length === 0 && (
            <div className="card">
              <div className="card-body">
                <p className="lead text-center m-0">No new announcements at the moment.</p>
              </div>
            </div>
          )}
          <Pagination meta={result?.meta} />
        </div>
      </div>
    </PanelPage>
  );
}
