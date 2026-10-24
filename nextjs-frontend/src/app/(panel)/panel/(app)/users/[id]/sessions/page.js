'use client';
// users/{user}/sessions (Users\SessionsController@index, adminView).
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SessionsList from '@/components/panel/SessionsList';
import { nameOrEmail } from '@/components/panel/PanelProvider';
import { Crumb, PanelPage } from '@/components/panel/ui';
import { panelApi } from '@/lib/panelApi';

export default function PanelUserSessionsPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  useEffect(() => {
    panelApi.get(`/users/${id}`).then((r) => r.ok && setUser(r.data));
  }, [id]);
  const name = user ? nameOrEmail(user) : '';
  return (
    <PanelPage
      title={`${name} - Active Sessions`}
      heading={`Sessions (${name})`}
      breadcrumbs={
        <>
          <Crumb href="/panel/users">Users</Crumb>
          <Crumb href={`/panel/users/${id}`}>{name}</Crumb>
          <Crumb active>Sessions</Crumb>
        </>
      }
    >
      <SessionsList userId={id} />
    </PanelPage>
  );
}
