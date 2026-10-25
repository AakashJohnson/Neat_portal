'use client';
import { useCallback, useState } from 'react';
import { DashboardCard, PageHeader, SearchField } from '@/components/admin/AdminParts';
import SearchStatus from '@/components/common/SearchStatus';
import { MatPaginator, MatTable } from '@/components/mat/MatTable';
import { searchResponse, useAsyncSearch } from '@/lib/liveSearch';

export default function ServerPagedList({ title, listKey, fetchPage, columns, placeholder }) {
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const load = useCallback(async () => {
    const result = searchResponse(await fetchPage(currentPage, pageSize, searchText.trim()));
    if (!Array.isArray(result?.[listKey]?.data)) throw new Error('Unable to load search results. Please try again.');
    return result[listKey];
  }, [fetchPage, currentPage, pageSize, searchText, listKey]);
  const result = useAsyncSearch(load);
  const rows = result.data?.data ?? [];

  return (
    <div>
      <PageHeader title={` ${title} `} crumb={` ${title} `} home=" Home " />
      <DashboardCard title={` ${title} `}>
        <div className="row"><div className="col-md-4 col-sm-12">
          <SearchField className="" label=" Search " style={{ width: '100%' }} placeholder={placeholder} value={searchText} onValueChange={setSearchText} onKeyUp={() => setCurrentPage(1)} />
        </div></div>
        <SearchStatus loading={result.loading} error={result.error} empty={!rows.length} />
        <div className="table-responsive" aria-busy={result.loading}>
          <MatTable dataSource={{ renderedData: rows }} columns={columns} sort={false} className="table table-bordered course-details-checkout" />
          <MatPaginator length={result.data?.total ?? 0} pageIndex={currentPage - 1} pageSize={pageSize} pageSizeOptions={[25, 50, 100]} onPage={event => { setPageSize(event.pageSize); setCurrentPage(event.pageIndex + 1); }} />
        </div>
      </DashboardCard>
    </div>
  );
}
