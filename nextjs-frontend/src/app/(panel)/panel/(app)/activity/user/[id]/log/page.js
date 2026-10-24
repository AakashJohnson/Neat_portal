'use client';
// activity/user/{user}/log (UserActivityController@index, users.activity).
import { useParams } from 'next/navigation';
import ActivityLog from '@/components/panel/ActivityLog';

export default function Page() {
  const { id } = useParams();
  return <ActivityLog mode="user" userId={id} />;
}
