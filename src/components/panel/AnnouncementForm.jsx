'use client';
// announcements::add-edit (AnnouncementRequest: title required|max:150, body
// required|max:1500); "E-Mail Notification" only when creating. Both
// redirect to the index with the success flash.
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Crumb, Messages, PanelPage, setFlash } from '@/components/panel/ui';
import { useJsValidation } from '@/lib/jsValidation';
import { panelApi, validationMessages } from '@/lib/panelApi';

export default function AnnouncementForm({ id = null }) {
  const edit = id !== null;
  const router = useRouter();
  const v = useJsValidation({ title: 'required|max:150', body: 'required|max:1500', email_notifications: 'boolean' });
  const [announcement, setAnnouncement] = useState(edit ? null : {});
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (edit) panelApi.get(`/panel/announcements/${id}`).then((r) => r.ok && setAnnouncement(r.data));
  }, [edit, id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!v.validateAll(e.currentTarget)) return;
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = edit ? await panelApi.put(`/panel/announcements/${id}`, data) : await panelApi.post('/panel/announcements', data);
    if (res.ok) {
      setFlash(edit ? 'Announcement updated successfully.' : 'Announcement created successfully.');
      router.push('/panel/announcements');
    } else {
      setErrors(validationMessages(res.data));
      window.scrollTo(0, 0);
    }
  };

  const title = edit ? 'Update Announcement' : 'New Announcement';
  return (
    <PanelPage
      title={title}
      heading={title}
      breadcrumbs={
        <>
          <Crumb href="/panel/announcements">Announcements</Crumb>
          <Crumb active>{edit ? 'Update' : 'Create'}</Crumb>
        </>
      }
    >
      <Messages errors={errors} />
      {announcement && (
        <form method="POST" action="/panel/announcements" id="announcement-form" noValidate onSubmit={onSubmit}>
          <div className="row">
            <div className="col-md-6 my-4 mx-auto">
              <div className="card">
                <h6 className="card-header">{edit ? 'Update Announcement' : 'Create an Announcement'}</h6>
                <div className="card-body">
                  <div className={v.groupClass('title')}>
                    <label htmlFor="title">Title</label>
                    <input type="text" className="form-control input-solid" id="title" name="title" placeholder="What are you announcing?" defaultValue={announcement.title ?? ''} {...v.field('title')} />
                    {v.error('title')}
                  </div>
                  <div className={v.groupClass('body')}>
                    <label htmlFor="body">Body</label>
                    <textarea name="body" className="form-control input-solid" rows="10" id="body" placeholder="Describe your announcement using markdown..." defaultValue={announcement.body ?? ''} {...v.field('body')}></textarea>
                    {v.error('body')}
                  </div>
                  {!edit && (
                    <div className="form-group mt-4">
                      <div className="custom-control custom-checkbox">
                        <input type="checkbox" className="custom-control-input" name="email_notification" id="email_notification" value="1" />
                        <label className="custom-control-label font-weight-normal" htmlFor="email_notification">
                          <span className="d-block">E-Mail Notification</span>
                          <small>Send email notification about the announcement to all users.</small>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="row">
                <div className="col-md-12">
                  <button type="submit" className="btn btn-primary">
                    {edit ? 'Update Announcement' : 'Create Announcement'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </PanelPage>
  );
}
