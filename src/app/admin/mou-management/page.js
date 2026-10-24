'use client';
// Route "admin/mou-management" → AdminMomManagementComponent: MoU list (search,
// sort, paginator), MoU upload for a company chosen with an autocomplete
// (upload progress bar), and per-row MoU date editing. Kept from the original:
//   - "Please Select Company" shows until a company is chosen;
//   - only the Neat Id column really sorts (the other sort headers read
//     row.company / row.mouStatus / row.mouDate, which do not exist);
//   - an invalid file (not a PDF, or > 10 MB) leaves "Uploading... 0%" on
//     screen: uploadFileWithProgress() returns null and .subscribe() throws;
//   - mat-icon-button / mat-flat-button / mat-stroked-button are plain buttons
//     (MatButtonModule is not imported).
import { useRef, useState } from 'react';
import Link from 'next/link';
import Scope from '@/components/common/Scope';
import { toastr } from '@/components/common/Toastr';
import { SearchField, pad } from '@/components/admin/AdminParts';
import MatAutocomplete from '@/components/mat/MatAutocomplete';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle, useDatepicker } from '@/components/mat/MatDatepicker';
import { MatError } from '@/components/mat/MatError';
import MatFormField from '@/components/mat/MatFormField';
import MatIcon from '@/components/mat/MatIcon';
import MatProgressBar from '@/components/mat/MatProgressBar';
import { MatPaginator, MatTable, useMatTableDataSource } from '@/components/mat/MatTable';
import MatTooltip from '@/components/mat/MatTooltip';
import { adminService } from '@/services';
import { subscribe } from '@/lib/api';
import { checkFileExtension } from '@/lib/fileUpload';
import { fileUrl } from '@/lib/format';
import { useFormGroup } from '@/lib/forms';
import { useNgOnInit } from '@/lib/useNgOnInit';

/** The edit form of one row: <input matInput [matDatepicker] [(ngModel)]="row.newMouDate"> + Save / Cancel. */
function MouDateEditor({ row, onSave, onCancel }) {
  const picker = useDatepicker();
  const form = useFormGroup({ newMouDate: [row.mou_date ? new Date(row.mou_date) : null] });
  return (
    <div className="d-flex align-items-center gap-2 justify-content-center">
      <MatFormField appearance="outline" style={{ width: '140px' }} empty={!form.value.newMouDate} suffix={<MatDatepickerToggle picker={picker} matsuffix="" />}>
        {(id) => (
          <>
            <MatDatepickerInput picker={picker} form={form} name="newMouDate" id={id} />
            <MatDatepicker picker={picker} />
          </>
        )}
      </MatFormField>
      <button mat-flat-button="" color="primary" onClick={() => onSave(form.value.newMouDate)}>
        {' Save '}
      </button>
      <button mat-stroked-button="" color="warn" onClick={onCancel}>
        {' Cancel '}
      </button>
    </div>
  );
}

export default function Page() {
  const ds = useMatTableDataSource({ pageSizeOptions: [5, 10, 25, 100] });
  const mouForm = useFormGroup({ neat_id: ['', (v) => (v == null || v.length === 0 ? { required: true } : null)], mouFile: [''] });
  const [companySource, setCompanySource] = useState([]);
  const [companyText, setCompanyText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editing, setEditing] = useState({});
  const [, setRevision] = useState(0);
  const fileInput = useRef(null);

  const filteredCompanies = (() => {
    if (!companyText) return companySource;
    const filterValue = String(companyText).toLowerCase().trim();
    return companySource.filter((c) => (c.name ? String(c.name).toLowerCase() : '').indexOf(filterValue) !== -1 || (c.neat_id ? String(c.neat_id).toLowerCase() : '').indexOf(filterValue) !== -1);
  })();

  const loadMouList = () =>
    subscribe(
      adminService.getMouList(),
      (data) => {
        const list = data && data.mouLists && data.mouLists.companyLists ? data.mouLists.companyLists : [];
        ds.setData(list);
        setCompanySource(list.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      },
      (error) => {
        console.error('API Error:', error);
        setCompanySource([]);
      },
    );
  useNgOnInit(loadMouList);

  const onCompanySelected = (name) => {
    const selected = companySource.find((c) => c.name === name);
    if (selected) mouForm.patchValue({ neat_id: selected.neat_id });
  };

  const onFileSelected = (event) => {
    if (event?.target?.files?.length > 0) {
      setSelectedFile(event.target.files[0]);
      mouForm.patchValue({ mouFile: event.target.files[0] });
    }
  };

  const onSubmitMou = () => {
    const neatId = mouForm.value.neat_id;
    if (!neatId || !selectedFile) {
      alert('Please select company and file');
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    // uploadFileWithProgress(): size check for mouFile, extension from the MIME type.
    if (selectedFile.size > 1024 * 1024 * 10) {
      toastr.error('File size should be less than 10Mb.');
      toastr.error('Invalid File!');
      return;
    }
    const extension = checkFileExtension(selectedFile.type, 'mouFile');
    if (extension == null) {
      toastr.error('Invalid file extension.');
      return;
    }
    const formData = new FormData();
    formData.append('myfile', selectedFile);
    formData.append('code', neatId);
    formData.append('inputField', 'mouFile');
    formData.append('type', extension);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/bff/uploadFile');
    xhr.upload.onprogress = (e) => {
      if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setIsUploading(false);
        setUploadProgress(100);
        loadMouList();
        mouForm.reset();
        setSelectedFile(null);
        setCompanyText('');
        setTimeout(() => setUploadProgress(0), 1000);
      } else {
        console.error(xhr.status);
        setIsUploading(false);
        toastr.error('Upload failed');
      }
    };
    xhr.onerror = () => {
      setIsUploading(false);
      toastr.error('Upload failed');
    };
    xhr.send(formData);
  };

  const applyFilter = (value) => {
    ds.setFilter(value.trim().toLowerCase());
    ds.firstPage();
  };

  const updateMouDate = (row, newMouDate) => {
    if (!newMouDate) {
      alert('Please select a date.');
      return;
    }
    const formattedDate = newMouDate.toLocaleDateString('en-CA');
    subscribe(
      adminService.updateMouDate(row.neat_id, formattedDate),
      () => {
        row.mou_date = formattedDate;
        setEditing((e) => ({ ...e, [row.neat_id]: false }));
        setRevision((r) => r + 1);
        alert('MOU date updated successfully!');
      },
      (err) => {
        console.error('Error updating date:', err);
        alert('Failed to update MOU date.');
      },
    );
  };

  const columns = [
    { id: 'company', header: ' Company ', headerClass: 'headerBG text-left', cellClass: 'text-left', cell: (row) => pad(row.name) },
    { id: 'neat_id', header: ' Neat Id ', headerClass: 'headerBG text-left', cellClass: 'text-left', cell: (row) => pad(row.neat_id) },
    {
      id: 'mouStatus',
      header: ' MOU Signed ',
      headerClass: 'headerBG text-center',
      cellClass: 'text-center',
      cell: (row) => (
        <>
          {row.mou_file_uploaded == 'Yes' && <span className="badge bg-success">Signed</span>}
          {row.mou_file_uploaded == 'None' && <span className="badge bg-danger">Not Signed</span>}
        </>
      ),
    },
    {
      id: 'mouDoc',
      header: ' MOU Document ',
      headerClass: 'headerBG text-center',
      cellClass: 'text-center',
      sortable: false,
      cell: (row) =>
        row.mou_file_uploaded == 'Yes' ? (
          <MatTooltip message="Download MOU">
            <a href={fileUrl(`files/mou_file/${row.mou_file ?? ''}`)} target="_blank" mattooltip="Download MOU">
              <MatIcon color="primary">download</MatIcon>
            </a>
          </MatTooltip>
        ) : (
          'NA'
        ),
    },
    { id: 'mouDate', header: ' MOU Date ', headerClass: 'headerBG text-center', cellClass: 'text-center', cell: (row) => pad(row.mou_date || '-') },
    {
      id: 'mouAction',
      header: ' Action ',
      headerClass: 'headerBG text-center',
      cellClass: 'text-center',
      sortable: false,
      cell: (row) =>
        editing[row.neat_id] ? (
          <MouDateEditor row={row} onSave={(date) => updateMouDate(row, date)} onCancel={() => setEditing((e) => ({ ...e, [row.neat_id]: false }))} />
        ) : (
          <div className="d-flex justify-content-center">
            <MatTooltip message="Edit Date">
              <button mat-icon-button="" mattooltip="Edit Date" onClick={() => setEditing((e) => ({ ...e, [row.neat_id]: true }))}>
                <MatIcon>edit</MatIcon>
              </button>
            </MatTooltip>
          </div>
        ),
    },
  ];

  return (
    <Scope name="admin-mom-management">
      <div>
        <header className="page-header">
          <h2 className="no-margin-bottom">MOU Management</h2>
        </header>
        <div className="breadcrumb-holder container-fluid">
          <ul className="breadcrumb">
            <li className="breadcrumb-item">
              <Link href="/admin">Home</Link>
            </li>
            <li className="breadcrumb-item active">MOU Management</li>
          </ul>
        </div>
        <section className="dashboard-box no-padding-bottom">
          <div className="container-fluid">
            <div className="row">
              <div className="col-lg-12">
                <div className="card">
                  <div className="card-header bg-head d-flex justify-content-between align-items-center">
                    <h3 className="h4 mb-0">MOU Management</h3>
                  </div>
                  <div className="card-body">
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <SearchField className="w-100" label="Search Company" onKeyUp={applyFilter} />
                      </div>
                    </div>
                    <form
                      className="row align-items-center"
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        mouForm.markSubmitted();
                        onSubmitMou();
                      }}
                    >
                      <div className="col-md-4 mb-3">
                        <MatFormField appearance="outline" className="w-100" label="Select Company" empty={!companyText}>
                          {(id) => (
                            <MatAutocomplete
                              id={id}
                              value={companyText}
                              onChange={setCompanyText}
                              placeholder="Search company"
                              options={filteredCompanies.map((c) => ({ value: c.name, label: ` ${c.name} [${c.neat_id}] ` }))}
                              onOptionSelected={onCompanySelected}
                            />
                          )}
                        </MatFormField>
                        <input type="hidden" name="neat_id" value={mouForm.value.neat_id ?? ''} readOnly />
                      </div>
                      <div className="col-md-4 mb-3 d-flex align-items-center gap-2">
                        <input type="file" hidden onChange={onFileSelected} ref={fileInput} name="mouFile" />
                        <button type="button" className="btn btn-outline-primary" onClick={() => fileInput.current.click()}>
                          <MatIcon>attach_file</MatIcon>
                          {' Choose '}
                        </button>
                      </div>
                      <div className="col-md-2 mb-3">
                        <button type="submit" className="btn btn-success w-100">
                          <MatIcon>cloud_upload</MatIcon>
                          {' Upload '}
                        </button>
                      </div>
                      <div>{mouForm.hasError('neat_id', 'required') && <MatError> Please Select Company </MatError>}</div>
                      {selectedFile && (
                        <div className="file-status mt-2">
                          <div className="text-success font-weight-medium mb-1">
                            <MatIcon className="mat-icon-inline">attach_file</MatIcon> {selectedFile.name}{' '}
                          </div>
                        </div>
                      )}
                      {isUploading && (
                        <div className="col-md-12 mt-2">
                          <MatProgressBar value={uploadProgress} />
                          <div className="text-center small mt-1"> Uploading... {uploadProgress}% </div>
                        </div>
                      )}
                    </form>
                    <div className="table-responsive mt-4">
                      <MatTable dataSource={ds} columns={columns} className="table table-bordered table-hover align-middle" />
                      {ds.data?.length === 0 && (
                        <div className="text-center mt-3">
                          <p className="text-muted">No Records Found!</p>
                        </div>
                      )}
                      <MatPaginator dataSource={ds} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Scope>
  );
}
