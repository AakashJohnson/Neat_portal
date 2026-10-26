'use client';


import DOMPurify from 'dompurify';
import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';
import { usePanel } from '@/components/panel/PanelProvider';
import { formatDate } from '@/lib/carbon';

const noopSubscribe = () => () => {};

export default function AnnouncementCard({ announcement }) {
  const panel = usePanel();
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const body = useMemo(() => (isClient ? DOMPurify.sanitize(announcement.parsed_body ?? '') : ''), [isClient, announcement.parsed_body]);
  const creator = announcement.creator;
  return (
    <div className="card overflow-hidden shadow-lg">
      <div className="card-body p-0">
        <div className="p-4">
          <h4 className="card-title mb-3">{announcement.title}</h4>
          <div dangerouslySetInnerHTML={{ __html: body }} />
        </div>
        <div className="d-flex justify-content-between align-items-center px-4 py-3 bg-lighter">
          <div className="d-flex align-items-center ">
            <img className="rounded-circle img-responsive mr-2" width="40" src={creator?.avatar} alt={creator?.name} />
            <div>
              <div className="line-height-1">{creator?.name}</div>
              <div className="text-muted">{formatDate(announcement.created_at, 'M d')}</div>
            </div>
          </div>
          {panel.can('announcements.manage') && (
            <div>
              <Link href={`/panel/announcements/${announcement.id}/edit`} className="btn btn-secondary btn-sm">
                Edit
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
