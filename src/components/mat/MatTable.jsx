'use client';


import { useMemo, useState } from 'react';
import MatFormField from './MatFormField';
import { MatOption, MatSelect } from './MatSelect';
import MatTooltip from './MatTooltip';

const MAX_SAFE_INTEGER = 9007199254740991;
const isNumberValue = (value) => !isNaN(parseFloat(value)) && !isNaN(Number(value));

/** MatTableDataSource.sortingDataAccessor (default). */
export function defaultSortingDataAccessor(data, sortHeaderId) {
  const value = data[sortHeaderId];
  if (isNumberValue(value)) {
    const numberValue = Number(value);
    return numberValue < MAX_SAFE_INTEGER ? numberValue : value;
  }
  return value;
}

/** MatTableDataSource.filterPredicate (default). */
export function defaultFilterPredicate(data, filter) {
  const dataStr = Object.keys(data)
    .reduce((currentTerm, key) => currentTerm + data[key] + '◬', '')
    .toLowerCase();
  return dataStr.indexOf(filter.trim().toLowerCase()) != -1;
}

export function useMatTableDataSource({ pageSizeOptions = [], pageSize: initialPageSize, sortingDataAccessor = defaultSortingDataAccessor, filterPredicate = defaultFilterPredicate, paginate = true } = {}) {
  const [data, setData] = useState([]);
  const [filter, setFilterState] = useState('');
  const [sort, setSort] = useState({ active: undefined, direction: '' });
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(() => initialPageSize ?? (pageSizeOptions.length ? pageSizeOptions[0] : 50));

  const filteredData = useMemo(() => (filter ? data.filter((row) => filterPredicate(row, filter)) : data), [data, filter, filterPredicate]);

  const sortedData = useMemo(() => {
    if (!sort.active || sort.direction == '') return filteredData;
    return [...filteredData].sort((a, b) => {
      const valueA = sortingDataAccessor(a, sort.active);
      const valueB = sortingDataAccessor(b, sort.active);
      let comparatorResult = 0;
      if (valueA != null && valueB != null) {
        if (valueA > valueB) comparatorResult = 1;
        else if (valueA < valueB) comparatorResult = -1;
      } else if (valueA != null) comparatorResult = 1;
      else if (valueB != null) comparatorResult = -1;
      return comparatorResult * (sort.direction == 'asc' ? 1 : -1);
    });
  }, [filteredData, sort, sortingDataAccessor]);

  // _updatePaginator: keep the page index within the filtered length.
  const length = filteredData.length;
  const lastPageIndex = Math.ceil(length / pageSize) - 1 || 0;
  const effectivePageIndex = pageIndex > 0 ? Math.min(pageIndex, Math.max(lastPageIndex, 0)) : pageIndex;
  const renderedData = paginate ? sortedData.slice(effectivePageIndex * pageSize, effectivePageIndex * pageSize + pageSize) : sortedData;

  return {
    data,
    setData,
    filter,
    filteredData,
    renderedData,
    sort,
    pageIndex: effectivePageIndex,
    pageSize,
    pageSizeOptions,
    length,
    /** dataSource.filter = value */
    setFilter: (value) => setFilterState(value),
    firstPage: () => setPageIndex(0),
    /** MatSort.sort(sortable) with start 'asc', disableClear false. */
    sortBy: (id) =>
      setSort((s) => {
        if (s.active != id) return { active: id, direction: 'asc' };
        const cycle = ['asc', 'desc', ''];
        return { active: id, direction: cycle[(cycle.indexOf(s.direction) + 1) % cycle.length] };
      }),
    setPageIndex,
    /** MatPaginator._changePageSize */
    changePageSize: (size) => {
      const startIndex = effectivePageIndex * pageSize;
      setPageIndex(Math.floor(startIndex / size) || 0);
      setPageSize(size);
    },
  };
}

// ------------------------------------------------------------- sort header
const VIEW = {
  opacity: (state) => (/(^|-)active$/.test(state) ? 1 : /(^|-)hint$/.test(state) ? 0.54 : 0),
  position: (state) => {
    if (/(^|-to-)(hint|active)$/.test(state) || state === 'hint' || state === 'active') return 'translateY(0)';
    if (/desc$/.test(state)) return 'translateY(-25%)';
    return 'translateY(25%)';
  },
};
const TRANSITION = '225ms cubic-bezier(0.4,0.0,0.2,1)';
const GESTURE_STYLE = { touchAction: 'none', userSelect: 'none', WebkitUserDrag: 'none', WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)' };

function SortHeader({ id, sort, onSort, children }) {
  const sorted = sort.active == id && (sort.direction === 'asc' || sort.direction === 'desc');
  const arrowDirection = sorted ? sort.direction : 'asc';
  const [viewState, setViewState] = useState({ toState: sorted ? 'active' : arrowDirection });
  const [hint, setHint] = useState(false);

  // Another column became sorted: an "active" arrow returns to its direction.
  const [lastSorted, setLastSorted] = useState(sorted);
  if (lastSorted !== sorted) {
    setLastSorted(sorted);
    if (!sorted && viewState.toState === 'active') setViewState({ fromState: 'active', toState: arrowDirection });
  }

  const setHintVisible = (visible) => {
    setHint(visible);
    if (!sorted) setViewState(visible ? { fromState: arrowDirection, toState: 'hint' } : { fromState: 'hint', toState: arrowDirection });
  };
  const handleClick = () => {
    const willBeSorted = !(sort.active == id && sort.direction === 'desc');
    onSort(id);
    // after sort(): sorted → from direction to active, otherwise active → direction
    const nextDirection = sort.active != id ? 'asc' : sort.direction === 'asc' ? 'desc' : 'asc';
    setViewState(willBeSorted ? { fromState: nextDirection, toState: 'active' } : { fromState: 'active', toState: 'asc' });
    setHint(false);
  };

  const state = `${viewState.fromState ? `${viewState.fromState}-to-` : ''}${viewState.toState}`;
  const directionState = `${sorted ? 'active-' : ''}${arrowDirection}`;
  const isDesc = /desc$/.test(directionState);
  void hint;

  return {
    thProps: {
      'mat-sort-header': '',
      style: GESTURE_STYLE,
      'aria-sort': sorted ? (sort.direction == 'asc' ? 'ascending' : 'descending') : undefined,
      onClick: handleClick,
      onMouseEnter: () => setHintVisible(true),
      onMouseLeave: () => setHintVisible(false),
    },
    content: (
      <div className={`mat-sort-header-container${sorted ? ' mat-sort-header-sorted' : ''}`}>
        <button className="mat-sort-header-button" type="button" aria-label={`Change sorting for ${id}`} onFocus={() => setHintVisible(true)} onBlur={() => setHintVisible(false)}>
          {children}
        </button>
        <div className="mat-sort-header-arrow" style={{ transform: VIEW.position(state), opacity: VIEW.opacity(state), transition: `transform ${TRANSITION}, opacity ${TRANSITION}` }}>
          <div className="mat-sort-header-stem"></div>
          <div className="mat-sort-header-indicator" style={{ transform: isDesc ? 'translateY(10px)' : 'translateY(0px)', transition: `transform ${TRANSITION}` }}>
            <div className="mat-sort-header-pointer-left" style={{ transform: isDesc ? 'rotate(45deg)' : 'rotate(-45deg)', transition: `transform ${TRANSITION}` }}></div>
            <div className="mat-sort-header-pointer-right" style={{ transform: isDesc ? 'rotate(-45deg)' : 'rotate(45deg)', transition: `transform ${TRANSITION}` }}></div>
            <div className="mat-sort-header-pointer-middle"></div>
          </div>
        </div>
      </div>
    ),
  };
}

const STICKY_TOP = { top: '0px', position: 'sticky', zIndex: 100 };

function HeaderCell({ column, dataSource, sticky }) {
  const cls = `${column.headerClass ? column.headerClass + ' ' : ''}mat-header-cell cdk-column-${column.id} mat-column-${column.id}${sticky ? ' mat-table-sticky' : ''}`;
  const style = sticky ? STICKY_TOP : undefined;
  if (!column.sortable) {
    return (
      <th className={cls} mat-header-cell="" role="columnheader" style={style}>
        {column.header}
      </th>
    );
  }
  return <SortableHeaderCell cls={cls} style={style} column={column} dataSource={dataSource} />;
}

function SortableHeaderCell({ cls, style, column, dataSource }) {
  const { thProps, content } = SortHeader({ id: column.sortId ?? column.id, sort: dataSource.sort, onSort: dataSource.sortBy, children: column.header });
  return (
    <th className={cls} mat-header-cell="" role="columnheader" {...thProps} style={{ ...thProps.style, ...style }}>
      {content}
    </th>
  );
}

/** <table mat-table matSort [dataSource]> with header row and rows. */
export function MatTable({ dataSource, columns, sort = true, stickyHeader = false, className = '' }) {
  return (
    <table className={`mat-table ${className}`.trim()} mat-table="" matsort={sort ? '' : undefined} role="grid">
      <thead role="rowgroup">
        <tr className="mat-header-row" mat-header-row="" role="row">
          {columns.map((c) => (
            <HeaderCell key={c.id} column={{ ...c, sortable: sort && c.sortable !== false }} dataSource={dataSource} sticky={stickyHeader} />
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {dataSource.filter && dataSource.data?.length > 0 && dataSource.renderedData.length === 0 && (
          <tr><td colSpan={columns.length}><p role="status">No results found.</p></td></tr>
        )}
        {dataSource.renderedData.map((row, i) => (
          <tr key={i} className="mat-row" mat-row="" role="row">
            {columns.map((c) => (
              <td key={c.id} className={`${c.cellClass ? c.cellClass + ' ' : ''}mat-cell cdk-column-${c.id} mat-column-${c.id}`} mat-cell="" role="gridcell">
                {c.cell(row, i)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot role="rowgroup" className="mat-table-sticky" style={{ display: 'none', bottom: '0px', position: 'sticky', zIndex: 10 }}></tfoot>
    </table>
  );
}

// --------------------------------------------------------------- paginator
const navButton = (kind, disabled, onClick) => (
  <MatTooltip message={kind === 'previous' ? 'Previous page' : 'Next page'} position="above" disabled={disabled}>
    <button
      className={`mat-paginator-navigation-${kind} mat-icon-button`}
      mat-icon-button=""
      type="button"
      aria-label={kind === 'previous' ? 'Previous page' : 'Next page'}
      disabled={disabled}
      style={GESTURE_STYLE}
      onClick={onClick}
    >
      <span className="mat-button-wrapper">
        <svg className="mat-paginator-icon" focusable="false" viewBox="0 0 24 24">
          <path d={kind === 'previous' ? 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' : 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'}></path>
        </svg>
      </span>
      <div className="mat-button-ripple mat-ripple mat-button-ripple-round"></div>
      <div className="mat-button-focus-overlay"></div>
    </button>
  </MatTooltip>
);

/**
 * <MatPaginator dataSource={ds} /> (client-side data source), or server-side:
 * <MatPaginator length pageIndex pageSize pageSizeOptions onPage={(e) => …} />
 * where onPage receives the PageEvent { pageIndex, previousPageIndex, pageSize, length }.
 */
export function MatPaginator({ dataSource, length: lengthInput, pageIndex: pageIndexInput, pageSize: pageSizeInput, pageSizeOptions: optionsInput, onPage }) {
  const ds = dataSource ?? {
    length: lengthInput,
    pageIndex: pageIndexInput,
    pageSize: pageSizeInput,
    pageSizeOptions: optionsInput ?? [],
    // _changePageSize(): keep the first item of the current page in view.
    changePageSize: (size) => onPage?.({ pageIndex: Math.floor((pageIndexInput * pageSizeInput) / size) || 0, previousPageIndex: pageIndexInput, pageSize: size, length: lengthInput }),
    setPageIndex: (i) => onPage?.({ pageIndex: i, previousPageIndex: pageIndexInput, pageSize: pageSizeInput, length: lengthInput }),
  };
  const { length, pageIndex, pageSize, pageSizeOptions } = ds;
  const [selectOpen, setSelectOpen] = useState(false);
  const displayedOptions = [...new Set([...pageSizeOptions, pageSize])].sort((a, b) => a - b);
  let rangeLabel;
  if (length == 0 || pageSize == 0) rangeLabel = `0 of ${length}`;
  else {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
    rangeLabel = `${startIndex + 1} - ${endIndex} of ${length}`;
  }
  const maxPageIndex = Math.ceil(length / pageSize) - 1;
  const hasPrevious = pageIndex >= 1 && pageSize != 0;
  const hasNext = pageIndex < maxPageIndex && pageSize != 0;

  return (
    <mat-paginator class="mat-paginator">
      <div className="mat-paginator-outer-container">
        <div className="mat-paginator-container">
          <div className="mat-paginator-page-size">
            <div className="mat-paginator-page-size-label">Items per page:</div>
            {displayedOptions.length > 1 && (
              <MatFormField className="mat-paginator-page-size-select" appearance="legacy" controlType="mat-select" empty={false} panelOpen={selectOpen}>
                <MatSelect value={pageSize} aria-label="Items per page:" onChange={(v) => ds.changePageSize(v)} onOpenedChange={setSelectOpen}>
                  {displayedOptions.map((o) => (
                    <MatOption key={o} value={o}>
                      {o}
                    </MatOption>
                  ))}
                </MatSelect>
              </MatFormField>
            )}
          </div>
          <div className="mat-paginator-range-actions">
            <div className="mat-paginator-range-label">{rangeLabel}</div>
            {navButton('previous', !hasPrevious, () => ds.setPageIndex(pageIndex - 1))}
            {navButton('next', !hasNext, () => ds.setPageIndex(pageIndex + 1))}
          </div>
        </div>
      </div>
    </mat-paginator>
  );
}
