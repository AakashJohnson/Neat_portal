'use client';
// Route "company/verification" → IdVerificationComponent: students' paid-course
// transaction ids with Accept / Reject (assignPaidCourse). Both Laravel routes
// point to missing methods (R-03): the list stays empty and the actions fail.
import { useState } from 'react';
import Scope from '@/components/common/Scope';
import { toastr } from '@/components/common/Toastr';
import MatFormField from '@/components/mat/MatFormField';
import MatIcon from '@/components/mat/MatIcon';
import MatInput from '@/components/mat/MatInput';
import { MatPaginator, MatTable, useMatTableDataSource } from '@/components/mat/MatTable';
import { companyService, courseService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

const handleStatus = (data) => {
  if (data['message'] == 'Success') toastr.success(data['reason']);
  else toastr.error(data['reason']);
};
const setStatus = (application_number, code, status) => subscribe(courseService.assignPaidCourse({ application_number, code, status }), handleStatus);

const text = (v) => ` ${v ?? ''} `;
const COLUMNS = [
  { id: 'application_number', header: ' Application Number ', cell: (row) => text(row.application_number) },
  { id: 'code', header: ' Product Code', cell: (row) => text(row.code) },
  { id: 'transaction_id', header: ' Transaction Id ', cell: (row) => text(row.transaction_id) },
  {
    id: 'accept',
    header: ' Accept Application ',
    cell: (row) => (
      <a onClick={() => setStatus(row.application_number, row.code, 'Approved')} className="org-button">
        Accept
      </a>
    ),
  },
  {
    id: 'reject',
    header: ' Reject Application ',
    cell: (row) => (
      <a onClick={() => setStatus(row.application_number, row.code, 'Rejected')} className="org-button">
        Reject
      </a>
    ),
  },
];

export default function IdVerificationPage() {
  const ds = useMatTableDataSource({ pageSizeOptions: [5, 10, 25, 100] });
  const [search, setSearch] = useState('');

  useNgOnInit(() => {
    subscribe(companyService.getStudentTransactionIds(), (data) => ds.setData(data['students'] ?? []));
  });

  const applyFilter = (filterValue) => {
    ds.setFilter(filterValue.trim().toLowerCase());
    ds.firstPage();
  };

  return (
    <Scope name="id-verification">
      <div className="container">
        <MatFormField className="col-md-3 col-sm-12" appearance="outline" label="Search" empty={!search} suffix={<MatIcon matsuffix="">search</MatIcon>}>
          {(id) => <MatInput id={id} value={search} onChange={(e) => setSearch(e.target.value)} onKeyUp={(e) => applyFilter(e.currentTarget.value)} />}
        </MatFormField>
        <div className="mat-elevation-z8">
          <MatTable dataSource={ds} columns={COLUMNS} />
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
