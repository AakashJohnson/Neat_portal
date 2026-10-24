'use client';
// company-profile/index.blade.php (CompanyCreateProfile@index): look up a
// NEAT ID in neat_eoi, then create the company login. Messages are alert()s,
// as in the original.
import { useState } from 'react';
import { panelApi } from '@/lib/panelApi';

const EMPTY = { neat_id: '', email: '', company: '', phone: '', password: '' };

export default function CreateCompanyProfilePage() {
  const [f, setF] = useState(EMPTY);
  const [canSubmit, setCanSubmit] = useState(false);
  const bind = (name) => ({ value: f[name], onChange: (e) => setF((x) => ({ ...x, [name]: e.target.value })) });

  const search = async () => {
    const r = await panelApi.post('/panel/company-profile/fetch-neat-id', { neat_id: f.neat_id });
    if (r.ok) {
      setF((x) => ({ ...x, company: r.data.data.company ?? '', email: r.data.data.email ?? '', phone: r.data.data.phone ?? '' }));
      setCanSubmit(true);
    } else {
      window.alert('No record found!');
      setF((x) => ({ ...x, company: '', email: '', phone: '' }));
      setCanSubmit(false);
    }
  };

  const submit = async () => {
    const { neat_id, company, email, phone, password } = f;
    const r = await panelApi.post('/panel/company-profile', { neat_id, company, email, phone, password });
    if (r.ok) {
      window.alert(r.data.msg);
      setF(EMPTY);
      setCanSubmit(false);
    } else window.alert('No record found!');
  };

  return (
    <div className="row">
      <div className="content-page" style={{ marginLeft: '0px' }}>
        <main role="main" className="px-4">
          <div className="container" style={{ alignItems: 'center' }}>
            <h2>Create Company Login </h2>
            <div className="form-group col-md-4" style={{ display: 'inline-block' }}>
              <label htmlFor="email">NEAT ID </label>
              <input type="text" className="form-control" id="neat_id" {...bind('neat_id')} />
            </div>
            <div className="col-md-2" style={{ display: 'inline-block' }}>
              <button type="submit" id="searchid" className="btn btn-default" onClick={search}>
                Submit
              </button>
            </div>
            <div className="form-group col-md-6">
              <label htmlFor="email">Email </label>
              <input type="email" className="form-control" id="email" {...bind('email')} />
            </div>
            <div className="form-group col-md-6">
              <label htmlFor="email">Compny Name </label>
              <input type="text" className="form-control" id="company" {...bind('company')} />
            </div>
            <div className="form-group col-md-6">
              <label htmlFor="pwd">Phone </label>
              <input type="text" className="form-control" id="phone" {...bind('phone')} />
            </div>
            <div className="form-group col-md-6">
              <label htmlFor="pwd">Password </label>
              <input type="password" className="form-control" id="password" required {...bind('password')} />
            </div>
            <button type="submit" id="submit" className="btn btn-primary " disabled={!canSubmit} onClick={submit}>
              Submit
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
