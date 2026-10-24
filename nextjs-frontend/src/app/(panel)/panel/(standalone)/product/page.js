'use client';
// company-profile/product.blade.php (CompanyCreateProfile@product): load the
// accepted Phase-2 product codes of a NEAT ID, fill the form from the chosen
// code, then create the product. Messages are alert()s, as in the original.
import { useState } from 'react';
import { panelApi } from '@/lib/panelApi';

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
  const [f, setF] = useState({ neat_id: '', code: '', product_active: '', ...Object.fromEntries(FIELDS.map(([k]) => [k, ''])) });
  const [codes, setCodes] = useState(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const bind = (name) => ({ value: f[name], onChange: (e) => setF((x) => ({ ...x, [name]: e.target.value })) });

  const search = async () => {
    const r = await panelApi.post('/panel/company-profile/products', { neat_id: f.neat_id });
    if (r.ok) setCodes((r.data.data ?? []).map((p) => p.code));
    else window.alert('No record found!');
  };

  const chooseCode = async (code) => {
    setF((x) => ({ ...x, code }));
    const r = await panelApi.post('/panel/company-profile/product-details', { code });
    if (!r.ok) return; // the original had no error handler here
    const d = r.data.data;
    setF((x) => ({
      ...x,
      product: d.product ?? '',
      product_active: d.product_active ?? '',
      company: d.company ?? '',
      youtube_link: d.youtube ?? '',
      trial_sol_link: d.trial_sol_link ?? '',
      product_technology: d.technology ?? '',
      contact_person_email: d.email ?? '',
      product_type: d.product_type ?? '',
      proposed_pricing: d.pricing ?? '',
      avg_likert_rating: d.avg_like ?? '',
    }));
    setCanSubmit(true);
  };

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
              <label htmlFor="email">NEAT ID </label>
              <input type="text" className="form-control" id="neat_id" {...bind('neat_id')} />
            </div>
            <div className="col-md-2" style={{ display: 'inline-block' }}>
              <button type="submit" id="searchid" className="btn btn-default" onClick={search}>
                Submit
              </button>
            </div>
            <div className="form-group col-md-6">
              <label htmlFor="email">Code </label>
              <select className="form-control" id="code" required value={f.code} onChange={(e) => chooseCode(e.target.value)}>
                {codes && <option value="">-- Select Product Code --</option>}
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
