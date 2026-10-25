'use client';
// Port of components/users/institute/student-details: the institute's students
// (getInstituteDetails → permanent_institute_id → getStudents) in a mat-table
// with search, sort and paginator. The "ID" column shows application_number
// but sorts by the row's `id` property, as in the original matColumnDef.
import Scope from '@/components/common/Scope';
import MatFormField from '@/components/mat/MatFormField';
import MatIcon from '@/components/mat/MatIcon';
import MatInput from '@/components/mat/MatInput';
import { MatPaginator, MatTable, useMatTableDataSource } from '@/components/mat/MatTable';
import { instituteService } from '@/services';
import { apiErrorMessage, subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';
import { useState } from 'react';

const text = (v) => ` ${v ?? ''} `;
const COLUMNS = [
  { id: 'id', header: ' ID ', cell: (row) => text(row.application_number) },
  { id: 'admission_registration_number', header: ' Admission Number ', cell: (row) => text(row.admission_registration_number) },
  { id: 'name', header: ' Name ', cell: (row) => text(row.name) },
  { id: 'email', header: ' Email ', cell: (row) => text(row.email) },
  { id: 'program', header: ' Program ', cell: (row) => text(row.program) },
];

export default function InstituteStudentDetailsPage() {
  const ds = useMatTableDataSource({ pageSizeOptions: [5, 10, 25, 100] });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useNgOnInit(() => {
    subscribe(instituteService.getStudents({}), (res) => {
      if (res?.message !== 'Success') setError(apiErrorMessage({ data: res }));
      else ds.setData(res.students);
    }, (res) => setError(apiErrorMessage(res)));
  });

  const applyFilter = (filterValue) => {
    ds.setFilter(filterValue.trim().toLowerCase());
    ds.firstPage();
  };

  return (
    <Scope name="student-details">
      <div className="container">
        {error && <p role="alert">{error}</p>}
        <MatFormField className="col-md-3 col-sm-12" appearance="outline" label="Search" empty={!search} suffix={<MatIcon matsuffix="">search</MatIcon>}>
          {(id) => <MatInput id={id} type="search" value={search} onChange={(e) => { setSearch(e.target.value); applyFilter(e.target.value); }} />}
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
      <br />
      <br />
    </Scope>
  );
}
