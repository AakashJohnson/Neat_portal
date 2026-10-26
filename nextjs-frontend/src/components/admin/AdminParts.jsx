'use client';


import Link from 'next/link';
import { useState } from 'react';
import MatFormField from '@/components/mat/MatFormField';
import MatIcon from '@/components/mat/MatIcon';
import MatInput from '@/components/mat/MatInput';
import { useMatTableDataSource } from '@/components/mat/MatTable';

export function PageHeader({ title, crumb = title, home = 'Home' }) {
  return (
    <>
      <header className="page-header">
        <h2 className="no-margin-bottom">{title}</h2>
      </header>
      <div className="breadcrumb-holder container-fluid">
        <ul className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/admin">{home}</Link>
          </li>
          <li className="breadcrumb-item active">{crumb}</li>
        </ul>
      </div>
    </>
  );
}

/** section.dashboard-box > … > .card with a .bg-head header. */
export function DashboardCard({ title, headerClass = 'card-header bg-head d-flex align-items-center', headerExtra, children }) {
  return (
    <section className="dashboard-box no-padding-bottom">
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-12">
            <div className="card">
              <div className={headerClass}>
                <h3 className="h4">{title}</h3>
                {headerExtra}
              </div>
              <div className="card-body">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


export function SearchField({ className = 'col-md-3 col-sm-12', label = 'Search', onKeyUp, placeholder, style, value: controlled, onValueChange }) {
  const [own, setOwn] = useState('');
  const value = controlled ?? own;
  return (
    <MatFormField className={className} appearance="outline" label={label} empty={!value} style={style} suffix={<MatIcon matsuffix="">search</MatIcon>}>
      {(id) => (
        <MatInput
          id={id}
          value={value}
          placeholder={placeholder}
          type="search"
          onChange={(e) => {
            const next = e.target.value;
            if (onValueChange) onValueChange(next);
            else setOwn(next);
            onKeyUp?.(next);
          }}
        />
      )}
    </MatFormField>
  );
}

/** MatTableDataSource + paginator [5, 10, 25, 100] and applyFilter(). */
export function useAdminTable() {
  const ds = useMatTableDataSource({ pageSizeOptions: [5, 10, 25, 100] });
  const applyFilter = (filterValue) => {
    ds.setFilter(filterValue.trim().toLowerCase());
    ds.firstPage();
  };
  return { ds, applyFilter };
}


export const pad = (v) => ` ${v ?? ''} `;
