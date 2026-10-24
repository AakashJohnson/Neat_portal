'use client';
// settings/notifications.blade.php (settings.notifications): the sign-up
// email to administrators.
import { Crumb, Messages, PanelPage } from '@/components/panel/ui';
import { SettingSwitch, phpTruthy, settingValue, useSettings } from '@/components/panel/settings';

export default function PanelNotificationSettingsPage() {
  const { data, settings, messages, onSubmit } = useSettings('notifications');
  return (
    <PanelPage
      title="Notification Settings"
      heading="Notification Settings"
      breadcrumbs={
        <>
          <Crumb muted>Settings</Crumb>
          <Crumb active>Notifications</Crumb>
        </>
      }
    >
      <Messages key={messages.n} errors={messages.errors} success={messages.success} />
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <h5 className="card-header">Email Notifications</h5>
            <div className="card-body">
              {data && (
                <form method="POST" action="/panel/settings/notifications" id="notification-settings-form" onSubmit={onSubmit} key={messages.n}>
                  <SettingSwitch
                    className="form-group mb-4"
                    name="notifications_signup_email"
                    id="switch-signup-email"
                    checked={phpTruthy(settingValue(settings, 'notifications_signup_email'))}
                    label="Sign-Up Notification"
                    help="Send an email to the Administrators when user signs up."
                  />
                  <button type="submit" className="btn btn-primary mt-3">
                    Update
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PanelPage>
  );
}
