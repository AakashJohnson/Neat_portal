'use client';
// Route "admin/reports" → AdminReportsComponent: Excel exports (SheetJS +
// FileSaver, "<name>_export_<timestamp>.xlsx"). The tile counters are never
// loaded in the original, so they stay empty.
import Link from 'next/link';
import { saveAs } from 'file-saver';
import MatIcon from '@/components/mat/MatIcon';
import MatTooltip from '@/components/mat/MatTooltip';
import { excelService } from '@/services';
import { subscribe } from '@/lib/api';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';

async function exportAsExcelFile(json, excelFileName) {
  const XLSX = await import('xlsx');
  let workbook;
  switch (excelFileName) {
    case 'InstitutesWithStudents':
      workbook = { Sheets: { Institutes: XLSX.utils.json_to_sheet(json['institutes']), Students: XLSX.utils.json_to_sheet(json['students']) }, SheetNames: ['Institutes', 'Students'] };
      break;
    case 'RegisteredUsers':
      workbook = { Sheets: { RegisteredUsers: XLSX.utils.json_to_sheet(json) }, SheetNames: ['RegisteredUsers'] };
      break;
    case 'FreeSeatAllocation':
      workbook = { Sheets: { FreeSeatAllocation: XLSX.utils.json_to_sheet(json) }, SheetNames: ['FreeSeatAllocation'] };
      break;
  }
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([excelBuffer], { type: EXCEL_TYPE }), excelFileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
}

function exportAsXLSX(fileName, roleId) {
  switch (fileName) {
    case 'InstitutesWithStudents':
      subscribe(excelService.getInstitutesWithStudents(), (data) => exportAsExcelFile(data, 'InstitutesWithStudents'));
      break;
    case 'RegisteredUsers':
      subscribe(excelService.getUsers(roleId), (data) => exportAsExcelFile(data['RegisteredUsers'], 'RegisteredUsers'));
      break;
    case 'FreeSeatAllocation':
      subscribe(excelService.getUsers(roleId), (data) => exportAsExcelFile(data['FreeSeatAllocation'], 'FreeSeatAllocation'));
      break;
  }
}

function Tile({ cols = 'col-xl-6 col-sm-6 col-md-6', bg, icon, href, label: [l1, l2], width, now, onExport, showCount }) {
  return (
    <div className={cols}>
      <div className="item d-flex align-items-center">
        <div className={`icon ${bg}`}>
          <i className={`zmdi ${icon}`}></i>
        </div>
        <div className="title">
          <Link href={href}>
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
          <strong>
            <MatTooltip message="Export as excel">
              <MatIcon onClick={onExport} style={{ cursor: 'pointer' }} mattooltip="Export as excel">
                {' save_alt '}
              </MatIcon>
            </MatTooltip>
          </strong>
        </div>
        {showCount && (
          <div className="number">
            <strong></strong>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <header className="page-header">
        <h2 className="no-margin-bottom">Reports</h2>
      </header>
      <div className="breadcrumb-holder container-fluid">
        <ul className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/admin">Home</Link>
          </li>
          <li className="breadcrumb-item active">Reports</li>
        </ul>
      </div>
      <section className="dashboard-counts no-padding-bottom">
        <div className="container-fluid">
          <div className="row bg-white has-shadow">
            <Tile bg="bg-red" icon="zmdi-male-female" href="/admin/registered-student" label={['Registered ', 'Student']} width="70%" now="70" onExport={() => exportAsXLSX('RegisteredUsers', 3)} showCount />
            <Tile bg="bg-green" icon="zmdi-receipt" href="/admin/registered-institute" label={['Registered ', 'Institutes']} width="40%" now="40" onExport={() => exportAsXLSX('InstitutesWithStudents', 'InstitutesWithStudents')} />
            <Tile bg="bg-orange" icon="zmdi-accounts" href="/admin/registered-company" label={['Registered', ' Company']} width="50%" now="50" onExport={() => exportAsXLSX('RegisteredUsers', 4)} showCount />
            <Tile cols="col-xl-6 col-sm-6" bg="bg-blue" icon="zmdi-book-image" href="/admin/free-seat-allocation" label={['Free Seats', 'Allocated ']} width="40%" now="40" onExport={() => exportAsXLSX('FreeSeatAllocation', '')} />
            <Tile cols="col-xl-6 col-sm-6" bg="bg-green" icon="zmdi-format-list-bulleted" href="/admin/registered-learner" label={['Registered', 'Learners']} width="50%" now="90" onExport={() => exportAsXLSX('RegisteredUsers', 6)} showCount />
          </div>
        </div>
      </section>
    </>
  );
}
