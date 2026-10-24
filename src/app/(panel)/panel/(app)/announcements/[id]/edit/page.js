'use client';
import { use } from 'react';
import AnnouncementForm from '@/components/panel/AnnouncementForm';

export default function PanelAnnouncementEditPage({ params }) {
  const { id } = use(params);
  return <AnnouncementForm id={id} />;
}
