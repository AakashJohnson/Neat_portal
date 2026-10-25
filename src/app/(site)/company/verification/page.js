'use client';
// Route "company/verification" → IdVerificationComponent: students' paid-course
// transaction ids with Accept / Reject (assignPaidCourse).
import { useState } from 'react';
import Scope from '@/components/common/Scope';
import { toastr } from '@/components/common/Toastr';
import MatFormField from '@/components/mat/MatFormField';
import MatIcon from '@/components/mat/MatIcon';
import MatInput from '@/components/mat/MatInput';
import { MatPaginator, MatTable, useMatTableDataSource } from '@/components/mat/MatTable';
import { companyService, courseService } from '@/services';
import { apiErrorMessage, subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

const text = (v) => ` ${v ?? ''} `;
const columns = (setStatus, busy) => [
  { id: 'application_number', header: ' Application Number ', cell: (row) => text(row.application_number) },
  { id: 'code', header: ' Product Code', cell: (row) => text(row.code) },
  { id: 'transaction_id', header: ' Transaction Id ', cell: (row) => text(row.transaction_id) },
  {
    id: 'accept',
    header: ' Accept Application ',
    cell: (row) => (
      <button type="button" disabled={busy} onClick={() => setStatus(row.application_number, row.code, 'Approved')} className="org-button">
        Accept
      </button>
    ),
  },
  {
    id: 'reject',
    header: ' Reject Application ',
    cell: (row) => (
      <button type="button" disabled={busy} onClick={() => setStatus(row.application_number, row.code, 'Rejected')} className="org-button">
        Reject
      </button>
    ),
  },
];

export default function IdVerificationPage() {
  const ds = useMatTableDataSource({ pageSizeOptions: [5, 10, 25, 100] });
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const failure = res => {
    const message = apiErrorMessage(res);
    setError(message);
    toastr.error(message);
  };
  const load = () => subscribe(companyService.getStudentTransactionIds(), data => {
    setError('');
    ds.setData(data.students);
  }, failure);
  const setStatus = async (application_number, code, status) => {
    if (busy) return;
    setBusy(true);
    await subscribe(courseService.assignPaidCourse({ application_number, code, status }), data => {
      toastr.success(data.reason);
      load();
    }, failure);
    setBusy(false);
  };

  useNgOnInit(load);

  const applyFilter = (filterValue) => {
    ds.setFilter(filterValue.trim().toLowerCase());
    ds.firstPage();
  };

  return (
    <Scope name="id-verification">
      <div className="container">
        {error && <p role="alert">{error}</p>}
        <MatFormField className="col-md-3 col-sm-12" appearance="outline" label="Search" empty={!search} suffix={<MatIcon matsuffix="">search</MatIcon>}>
          {(id) => <MatInput id={id} value={search} onChange={(e) => setSearch(e.target.value)} onKeyUp={(e) => applyFilter(e.currentTarget.value)} />}
        </MatFormField>
        <div className="mat-elevation-z8">
          <MatTable dataSource={ds} columns={columns(setStatus, busy)} />
          {ds.data.length === 0 && (
            <div>
              <p className="no-records-found"> No Records Found! </p>
            </div>
          )}
          <MatPaginator dataSource={ds} />
        </div>
      </div>
    </Scope>
  );
}
