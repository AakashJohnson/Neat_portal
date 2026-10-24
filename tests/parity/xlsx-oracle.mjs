// Oracle test: the institute Excel upload parses sheets with SheetJS.
// Angular used xlsx 0.15.4 (CVE-2023-30533 prototype pollution, ReDoS fixed in
// 0.20.2); the port uses 0.20.3. This compares, for workbooks covering the
// upload template's columns and typical cell types/formats, the exact code
// path of institute-file-upload.component.ts:
//   ArrayBuffer → binary string → XLSX.read(bstr, {type:'binary'}) → first
//   sheet → sheet_to_json(ws, { raw: false })
// with both versions. 0.15.4 is loaded read-only from the Angular project.
//   node tests/parity/xlsx-oracle.mjs
import { createRequire } from 'node:module';
import path from 'node:path';

const requireNew = createRequire(import.meta.url);
const requireOld = createRequire(path.resolve(import.meta.dirname, '../../../frontend/frontend/package.json'));
const XNEW = requireNew('xlsx');
const XOLD = requireOld('xlsx');
console.log(`old ${XOLD.version} / new ${XNEW.version}`);

const FREE_HEADERS = ['Name of Beneficiary', 'Father’s Name', 'Valid Mobile Number', 'Valid Email', 'Date of Birth', 'Admission/ Registration number', 'Category', 'Department/ Stream', 'Gender', 'Year of Admission', 'Programs', 'Name of Institution', 'State/ UT', 'AICTE Code', 'Free Seat Preference 1', 'Free Seat Preference 2', 'Free Seat Preference 3', 'Marks secured in Class 12th', 'Total Marks', 'Percentage'];

// Cells as {v, t, z} so each sheet exercises a specific format.
const n = (v, z) => ({ v, t: 'n', ...(z ? { z } : {}) });
const s = (v) => ({ v, t: 's' });
const d = (y, m, day, z) => {
  // Excel serial for a date (1900 system).
  const serial = (Date.UTC(y, m - 1, day) - Date.UTC(1899, 11, 30)) / 86400000;
  return { v: serial, t: 'n', z };
};

const rows = [
  [s('Asha Kumari'), s('Ram'), n(9876543210), s('asha@example.com'), d(2001, 5, 7, 'dd/mm/yyyy'), s('ADM/21/001'), s('General (Gen)'), s('CSE'), s('Female'), n(2019), s('Undergraduate'), s('ABC College'), s('Kerala'), s('1-12345'), s('P1'), s('P2'), s('P3'), n(456), n(500), n(0.912, '0.00%')],
  [s('Ravi'), s('Mohan'), s('98765 43210'), s('ravi@example'), d(1999, 12, 31, 'm/d/yy'), n(12345), s('Scheduled Caste (SC)'), s('ECE'), s('Male'), s('2018'), s('Graduate'), s('XYZ'), s('Goa'), n(1012345), s('P1'), s(''), s(''), n(410.5), n(500), n(82.1)],
  [s('Zed'), s('Y'), n(98765432101), s('zed@example.co.in'), s('07-05-2001'), s('R1'), s('Other Backward Classes (OBC)'), s('Mech'), s('Others'), n(2020, '0'), s('Post Graduate'), s('Q'), s('Delhi'), s('AICTE-9'), s(''), s(''), s(''), n(1e3, '#,##0'), n(1234567.891, '#,##0.00'), n(12.3456, '0.0')],
  [s('Date formats'), s('F'), n(9000000001, '0'), s('df@example.com'), d(2002, 2, 28, 'd-mmm-yy'), s('R2'), s('Economically Weaker Section (EWS)'), s('IT'), s('Male'), n(2021), s('Graduate'), s('Q'), s('Delhi'), s('A'), s(''), s(''), s(''), n(0), n(0), d(2020, 1, 1, 'yyyy-mm-dd')],
  [s('Times'), s('F'), n(9000000002, '@'), s('t@example.com'), { v: 37000.75, t: 'n', z: 'm/d/yyyy h:mm' }, s('R3'), s('Scheduled Tribe (ST)'), s('IT'), s('Female'), n(2016), s('Undergraduate'), s('Q'), s('Delhi'), s('A'), s(''), s(''), s(''), n(-5.5), n(1 / 3), n(1e21)],
];

function buildWorkbook(bookType) {
  const ws = {};
  const all = [FREE_HEADERS.map(s), ...rows];
  all.forEach((row, r) => row.forEach((cell, c) => (ws[XNEW.utils.encode_cell({ r, c })] = { ...cell })));
  ws['!ref'] = XNEW.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: all.length - 1, c: FREE_HEADERS.length - 1 } });
  const wb = XNEW.utils.book_new();
  XNEW.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XNEW.write(wb, { type: 'array', bookType });
}

// institute-file-upload.component.ts readExcel() + readAsJson()
function angularPath(X, arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const arr = new Array();
  for (let i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
  const bstr = arr.join('');
  const workbook = X.read(bstr, { type: 'binary' });
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  return X.utils.sheet_to_json(ws, { raw: false });
}

let failed = 0;
for (const bookType of ['xlsx', 'xls', 'csv']) {
  const buf = buildWorkbook(bookType);
  const ab = buf instanceof ArrayBuffer ? buf : new Uint8Array(buf).buffer;
  const a = angularPath(XOLD, ab);
  const b = angularPath(XNEW, ab);
  const diffs = [];
  a.forEach((row, i) => {
    for (const k of new Set([...Object.keys(row), ...Object.keys(b[i] ?? {})])) if (row[k] !== b[i]?.[k]) diffs.push(`row ${i + 2} "${k}": 0.15.4=${JSON.stringify(row[k])} 0.20.3=${JSON.stringify(b[i]?.[k])}`);
  });
  if (a.length !== b.length) diffs.push(`row count ${a.length} vs ${b.length}`);
  // The inputs accept only .xlsx; CSV (only via the file dialog's 'All files') is a
  // documented difference (R-37): 0.15.4 re-typed date-like CSV text as m/d/yy.
  const known = bookType === 'csv';
  if (diffs.length && !known) failed++;
  console.log(`${diffs.length ? (known ? 'KNOWN' : 'DIFF') : 'SAME'} ${bookType} (${a.length} rows)`);
  diffs.forEach((x) => console.log('  ' + x));
}
process.exit(failed ? 1 : 0);
