'use client';

import { Crumb, Messages, PanelPage } from '@/components/panel/ui';
import { settingValue, useSettings } from '@/components/panel/settings';

export default function PanelGeneralSettingsPage() {
  const { data, settings, messages, onSubmit } = useSettings('general');
  return (
    <PanelPage
      title="General Settings"
      heading="General Settings"
      breadcrumbs={
        <>
          <Crumb muted>Settings</Crumb>
          <Crumb active>General</Crumb>
        </>
      }
    >
      <Messages key={messages.n} errors={messages.errors} success={messages.success} />
      {data && (
        <form method="POST" action="/panel/settings/general" id="general-settings-form" onSubmit={onSubmit} key={messages.n}>
          <div className="row">
            <div className="col-md-8">
              <div className="card">
                <div className="card-body">
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input type="text" className="form-control input-solid" id="app_name" name="app_name" defaultValue={settingValue(settings, 'app_name') ?? ''} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Update
          </button>
        </form>
      )}
    </PanelPage>
  );
}
