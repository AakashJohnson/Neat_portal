'use client';
// Port of admin/admin-dashboard (the admin shell's default child and
// "dashboard"): getAdminCounts tiles; "Free Seats Allocated" is a static 0.
import Link from 'next/link';
import { useState } from 'react';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { useNgOnInit } from '@/lib/useNgOnInit';

function Tile({ cols = 'col-xl-6 col-sm-6 col-md-6', bg, icon, href, label: [l1, l2], width, now, number }) {
  return (
    <div className={cols}>
      <div className="item d-flex align-items-center">
        <div className={`icon ${bg}`}>
          <i className={`zmdi ${icon}`}></i>
        </div>
        <div className="title">
          <Link href={href}>
            {href === '/admin/courses' && ' '}
            <span>
              {l1}
              <br />
              {l2}
            </span>
          </Link>
          <div className="progress">
            <div role="progressbar" style={{ width, height: '4px' }} aria-valuenow={now} aria-valuemin="0" aria-valuemax="100" className={`progress-bar ${bg}`}></div>
          </div>
        </div>
        <div className="number">
          <strong>{number}</strong>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState({});

  useNgOnInit(() => {
    subscribe(adminService.getAdminCounts(), (data) =>
      setCounts({ products: data['products'], students: data['students'], institutes: data['institutes'], companies: data['companies'], learners: data['learners'] }),
    );
  });

  return (
    <>
      <div className="breadcrumb-holder container-fluid">
        <ul className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/admin">Home</Link>
          </li>
          <li className="breadcrumb-item active">Dashboard</li>
        </ul>
      </div>
      <section className="dashboard-counts no-padding-bottom">
        <div className="container-fluid">
          <div className="row bg-white has-shadow">
            <Tile bg="bg-violet" icon="zmdi-book" href="/admin/courses" label={['Courses ', 'Offered']} width="25%" now="25" number={counts.products} />
            <Tile bg="bg-red" icon="zmdi-male-female" href="/admin/registered-student" label={['Registered ', 'Student']} width="70%" now="70" number={counts.students} />
            <Tile bg="bg-green" icon="zmdi-receipt" href="/admin/registered-institute" label={['Registered ', 'Institutes']} width="40%" now="40" number={counts.institutes} />
            <Tile bg="bg-orange" icon="zmdi-accounts" href="/admin/registered-company" label={['Registered', ' Company']} width="50%" now="50" number={counts.companies} />
            <Tile cols="col-xl-6 col-sm-6" bg="bg-blue" icon="zmdi-book-image" href="/admin/free-seat-student" label={['Free Seats', 'Allocated ']} width="40%" now="40" number="0" />
            <Tile cols="col-xl-6 col-sm-6" bg="bg-green" icon="zmdi-format-list-bulleted" href="/admin/registered-learner" label={['Registered', 'Learners']} width="50%" now="90" number={counts.learners} />
          </div>
        </div>
      </section>
    </>
  );
}
