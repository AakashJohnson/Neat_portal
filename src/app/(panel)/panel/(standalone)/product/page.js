'use client';


import { useCallback, useState } from 'react';
import { panelApi } from '@/lib/panelApi';
import { searchResponse, useAsyncSearch } from '@/lib/liveSearch';
import SearchStatus from '@/components/common/SearchStatus';

const FIELDS = [
  ['product', 'Product Name '],
  ['company', 'Compny Name '],
  ['youtube_link', 'Youtube Link '],
  ['trial_sol_link', 'LMS Url '],
  ['product_technology', 'Product Technology '],
  ['contact_person_email', 'Email '],
  ['product_type', 'Product Type '],
  ['proposed_pricing', 'Price '],
  ['avg_likert_rating', 'Avg Rating '],
];

export default function CompanyProductEntryPage() {
  const [neatId, setNeatId] = useState('');
  const [code, setCode] = useState('');
  const [edits, setEdits] = useState({});
  const load = useCallback(async () => {
    const query = neatId.trim();
    if (!query) return null;
    const data = searchResponse(await panelApi.post('/panel/company-profile/products', { neat_id: query }));
    if (!Array.isArray(data?.data)) throw new Error('Unable to load product codes. Please try again.');
    return { query, codes: data.data.map(p => p.code) };
  }, [neatId]);
  const lookup = useAsyncSearch(load);
  const codes = lookup.data?.query === neatId.trim() ? lookup.data.codes : [];
  const loadDetails = useCallback(async () => {
    if (!code) return null;
    const response = await panelApi.post('/panel/company-profile/product-details', { code });
    if (response.status === 404) return { code, neatId, record: null };
    const data = searchResponse(response);
    if (!data?.data || typeof data.data !== 'object') throw new Error('Unable to load product details. Please try again.');
    return { code, neatId, record: data.data };
  }, [code, neatId]);
  const details = useAsyncSearch(loadDetails, { delay: 0 });
  const d = details.data?.code === code && details.data?.neatId === neatId ? details.data.record : null;
  const f = {
    neat_id: neatId, code, product: d?.product ?? '', product_active: d?.product_active ?? '',
    company: d?.company ?? '', youtube_link: d?.youtube ?? '', trial_sol_link: d?.trial_sol_link ?? '',
    product_technology: d?.technology ?? '', contact_person_email: d?.email ?? '', product_type: d?.product_type ?? '',
    proposed_pricing: d?.pricing ?? '', avg_likert_rating: d?.avg_like ?? '', ...edits,
  };
  const canSubmit = !!d && !details.loading && !lookup.loading && codes.includes(code);
  const bind = name => ({ value: f[name], onChange: e => {
    if (name === 'neat_id') { setNeatId(e.target.value); setCode(''); setEdits({}); }
    else setEdits(values => ({ ...values, [name]: e.target.value }));
  } });
  const chooseCode = value => { setCode(value); setEdits({}); };

  const submit = async () => {
    const r = await panelApi.post('/panel/company-profile/create-product', {
      neat_id: f.neat_id,
      code: f.code,
      company: f.company,
      product: f.product,
      email: f.contact_person_email,
      youtube_link: f.youtube_link,
      trial_sol_link: f.trial_sol_link,
      product_technology: f.product_technology,
      product_type: f.product_type,
      proposed_pricing: f.proposed_pricing,
      avg_likert_rating: f.avg_likert_rating,
      product_active: f.product_active,
    });
    window.alert(r.ok ? r.data.msg : 'No record found!');
  };

  return (
    <div className="row">
      <div className="content-page" style={{ marginLeft: '0px' }}>
        <main role="main" className="px-4">
          <div className="container" style={{ alignItems: 'center' }}>
            <h2>Product Entry </h2>
            <div className="form-group col-md-4" style={{ display: 'inline-block' }}>
              <label htmlFor="neat_id">NEAT ID </label>
              <input type="search" className="form-control" id="neat_id" {...bind('neat_id')} />
            </div>
            <div className="col-md-2" style={{ display: 'inline-block' }}>
              <button type="button" id="searchid" className="btn btn-default" onClick={lookup.refresh}>
                Search
              </button>
            </div>
            <SearchStatus loading={!!neatId && lookup.loading || !!code && details.loading} error={lookup.error || details.error} empty={!!neatId.trim() && !codes.length || !!code && !d && !details.loading} />
            <div className="form-group col-md-6">
              <label htmlFor="code">Code </label>
              <select className="form-control" id="code" required value={f.code} onChange={(e) => chooseCode(e.target.value)}>
                <option value="">-- Select Product Code --</option>
                {(codes ?? []).map((c, i) => (
                  <option key={`${c}-${i}`} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {FIELDS.map(([name, label]) => (
              <div key={name} className="form-group col-md-6">
                <label htmlFor="email">{label}</label>
                <input type="text" className="form-control" id={name} {...bind(name)} />
              </div>
            ))}
            <input type="hidden" className="form-control" id="product_active" value={f.product_active} />
            <button type="submit" id="submit" className="btn btn-primary " disabled={!canSubmit} onClick={submit}>
              Submit
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
