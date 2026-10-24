'use client';
// announcements::show — the card of one announcement.
import { use, useEffect, useState } from 'react';
import AnnouncementCard from '@/components/panel/AnnouncementCard';
import { Crumb, PanelPage } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';

export default function PanelAnnouncementShowPage({ params }) {
  const { id } = use(params);
  const [announcement, setAnnouncement] = useState(null);
  useEffect(() => {
    panelApi.get(`/panel/announcements/${id}`).then((r) => r.ok && setAnnouncement(r.data));
  }, [id]);

  return (
    <PanelPage
      title={`Announcement:${announcement?.title ?? ''}`}
      heading="Announcement Details"
      breadcrumbs={
        <>
          <Crumb href="/panel/announcements">Announcements</Crumb>
          <Crumb active>Announcement Details</Crumb>
        </>
      }
    >
      <div className="row">
        <div className="col-md-6 mx-auto mb-4">{announcement && <AnnouncementCard announcement={announcement} />}</div>
      </div>
    </PanelPage>
  );
}
