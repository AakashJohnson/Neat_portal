'use client';
// Port of components/users/institute/institute-file-upload (free-seat Excel
// upload; the manual entry and paid-seat blocks are commented out in the
// original template). Each selection replaces the previous batch.
// SheetJS 0.20.3 instead of 0.15.4: see R-37 / tests/parity/xlsx-oracle.mjs.
import { useRef, useState } from 'react';
import Scope from '@/components/common/Scope';
import { toastr } from '@/components/common/Toastr';
import { instituteService } from '@/services';
import { apiErrorMessage, subscribe } from '@/lib/api';

export default function InstituteFileUpload() {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const XLSX = useRef(null);

  const loadXlsx = async () => (XLSX.current ??= await import('xlsx'));

  const uploadedFile = async (event) => {
    const file = event.target.files[0];
    setRows([]);
    setMessage('');
    if (!file) return;
    setBusy(true);
    try {
      const X = await loadXlsx();
      const workbook = X.read(await file.arrayBuffer(), { type: 'array' });
      const data = X.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
      if (!data.length) throw new Error('The spreadsheet contains no student nominations.');
      setRows(data);
      setMessage(`${data.length} student nomination(s) ready to upload.`);
    } catch (error) {
      console.error('Unable to read nomination spreadsheet', error);
      setMessage('Unable to read nominations. Choose a filled-in copy of the sample Excel file.');
    } finally {
      setBusy(false);
    }
  };

  const handleResponse = (data) => {
    if (data?.message !== 'Success') {
      setMessage(apiErrorMessage({ data }));
      return;
    }
    if (data['message'] == 'Success') {
      toastr.success('Data inserted successfully!');
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load, as in the original
      window.location.href = '/institute';
    }
  };

  const readAsJson = async () => {
    if (busy || !rows.length) return;
    setBusy(true);
    setMessage('');
    await subscribe(instituteService.uploadExcel(rows), handleResponse, (res) => setMessage(apiErrorMessage(res)));
    setBusy(false);
  };

  return (
    <Scope name="institute-file-upload">
      <div className="contact-form-area section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12" style={{ textAlign: 'center' }}>
              <h2>Free Seat File Upload</h2>
              <p>Institute is required to upload nominations of students for free seats, as per existing AICTE free seat Scheme.</p>
            </div>
            <div className="col-md-2"></div>
            <div className="col-md-4">
              <div className="col blink_me">
                <a href="/assets/sample_excel.xlsx" add="" style={{ color: 'blue' }} className="w-100">
                  Click here to download sample excel file
                </a>
              </div>
              <input type="file" disabled={busy} className="form-control" onChange={uploadedFile} placeholder="Upload file for Free Seat" accept=".xlsx" />
            </div>
            <div className="col-md-4 mt-4 aligncenter">
              <button className="button-default upload" disabled={busy || !rows.length} onClick={readAsJson}>
                Upload
              </button>
            </div>
            {message && <p role="status">{message}</p>}
            {busy && (
              <div className="col-lg-2 col-md-2">
                <img src="/assets/loader.gif" style={{ width: '50px' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Scope>
  );
}
