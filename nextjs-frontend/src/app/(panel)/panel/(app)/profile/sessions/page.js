'use client';
// profile/sessions (Profile\SessionsController@index).
import SessionsList from '@/components/panel/SessionsList';
import { nameOrEmail, usePanel } from '@/components/panel/PanelProvider';
import { Crumb, PanelPage } from '@/components/panel/ui';

export default function PanelProfileSessionsPage() {
  const { user } = usePanel();
  const name = nameOrEmail(user);
  return (
    <PanelPage title={`${name} - Active Sessions`} heading={`Sessions (${name})`} breadcrumbs={<Crumb active>Sessions</Crumb>}>
      <SessionsList />
    </PanelPage>
  );
}
