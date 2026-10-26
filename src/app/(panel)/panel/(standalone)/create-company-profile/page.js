'use client';


import { useCallback, useState } from 'react';
import { panelApi } from '@/lib/panelApi';
import { searchResponse, useAsyncSearch } from '@/lib/liveSearch';
import SearchStatus from '@/components/common/SearchStatus';

const EMPTY = { neat_id: '', email: '', company: '', phone: '', password: '' };

export default function CreateCompanyProfilePage() {
  const [neatId, setNeatId] = useState('');
  const [edits, setEdits] = useState({});
  const load = useCallback(async () => {
    const query = neatId.trim();
    if (!query) return null;
    const response = await panelApi.post('/panel/company-profile/fetch-neat-id', { neat_id: query });
    if (response.status === 404) return { query, record: null };
    const data = searchResponse(response);
    if (!data?.data || typeof data.data !== 'object') throw new Error('Unable to load company details. Please try again.');
    return { query, record: data.data };
  }, [neatId]);
  const lookup = useAsyncSearch(load);
  const record = lookup.data?.query === neatId.trim() ? lookup.data.record : null;
  const f = { ...EMPTY, ...(record ? { company: record.company ?? '', email: record.email ?? '', phone: record.phone ?? '' } : {}), ...edits, neat_id: neatId };
  const canSubmit = !!record && !lookup.loading && !lookup.error;
  const bind = name => ({ value: f[name], onChange: e => {
    if (name === 'neat_id') { setNeatId(e.target.value); setEdits({}); }
    else setEdits(values => ({ ...values, [name]: e.target.value }));
  } });

  const submit = async () => {
    const { neat_id, company, email, phone, password } = f;
    const r = await panelApi.post('/panel/company-profile', { neat_id, company, email, phone, password });
    if (r.ok) {
      window.alert(r.data.msg);
      setNeatId('');
      setEdits({});
    } else window.alert('No record found!');
  };

  return (
    <div className="row">
      <div className="content-page" style={{ marginLeft: '0px' }}>
        <main role="main" className="px-4">
          <div className="container" style={{ alignItems: 'center' }}>
            <h2>Create Company Login </h2>
            <div className="form-group col-md-4" style={{ display: 'inline-block' }}>
              <label htmlFor="neat_id">NEAT ID </label>
              <input type="search" className="form-control" id="neat_id" {...bind('neat_id')} />
            </div>
            <div className="col-md-2" style={{ display: 'inline-block' }}>
              <button type="button" id="searchid" className="btn btn-default" onClick={lookup.refresh}>
                Search
              </button>
            </div>
            <SearchStatus loading={!!neatId && lookup.loading} error={lookup.error} empty={!!neatId.trim() && !record} />
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
