'use client';
// AdminRegisteredStudentComponent / AdminRegisteredLearnerComponent: a mat-table
// over one server page (Laravel paginate(): data, current_page, total,
// per_page), search debounced 500 ms, mat-spinner while loading (the table and
// paginator are removed meanwhile), paginator [25, 50, 100] starting at 100.
import { useRef, useState } from 'react';
import { DashboardCard, PageHeader, SearchField } from '@/components/admin/AdminParts';
import MatProgressSpinner from '@/components/mat/MatProgressSpinner';
import { MatPaginator, MatTable } from '@/components/mat/MatTable';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

/**
 * @param {{ title: string, listKey: 'students'|'learners', fetchPage: (page, perPage, search) => Promise,
 *           columns: object[], placeholder: string, loadingText: string, errorLabel: string }} props
 */
export default function ServerPagedList({ title, listKey: key, fetchPage, columns, placeholder, loadingText, errorLabel }) {
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef(null);
  // The component fields as the next request reads them (set synchronously).
  const state = useRef({ pageSize: 100, searchText: '' });

  const load = (page) => {
    setLoading(true);
    subscribe(
      fetchPage(page, state.current.pageSize, state.current.searchText),
      (response) => {
        console.log(`${errorLabel} API ${key === 'students' ? 'RESPONSE:' : 'Response:'}`, response);
        if (response && response.message === 'Success' && response[key]) {
          setRows(response[key].data || []);
          setCurrentPage(response[key].current_page || page);
          setTotalRecords(response[key].total || 0);
          state.current.pageSize = response[key].per_page || state.current.pageSize;
          setPageSize(state.current.pageSize);
        } else {
          setRows([]);
          setTotalRecords(0);
        }
        setLoading(false);
      },
      (error) => {
        console.error(`${errorLabel} API Error:`, error);
        setRows([]);
        setTotalRecords(0);
        setLoading(false);
      },
    );
  };

  useNgOnInit(() => load(1));

  const applyFilter = (value) => {
    state.current.searchText = value.trim();
    setSearchText(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      load(1);
    }, 500);
  };

  const pageChanged = (event) => {
    state.current.pageSize = event.pageSize;
    setPageSize(event.pageSize);
    setCurrentPage(event.pageIndex + 1);
    load(event.pageIndex + 1);
  };

  return (
    <div>
      <PageHeader title={` ${title} `} crumb={` ${title} `} home=" Home " />
      <DashboardCard title={` ${title} `}>
        <div className="row">
          <div className="col-md-4 col-sm-12">
            <SearchField className="" label=" Search " style={{ width: '100%' }} placeholder={placeholder} value={searchText} onValueChange={setSearchText} onKeyUp={applyFilter} />
          </div>
        </div>
        {loading && (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <MatProgressSpinner spinner diameter="40" style={{ margin: 'auto' }} />
            <div style={{ marginTop: '10px' }}> {loadingText} </div>
          </div>
        )}
        {!loading && (
          <div className="table-responsive">
            <MatTable dataSource={{ renderedData: rows }} columns={columns} sort={false} className="table table-bordered course-details-checkout" />
            {rows.length === 0 && (
              <div className="no-records-found">
                <p> No Records Found! </p>
              </div>
            )}
            <MatPaginator length={totalRecords} pageIndex={currentPage - 1} pageSize={pageSize} pageSizeOptions={[25, 50, 100]} onPage={pageChanged} />
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
