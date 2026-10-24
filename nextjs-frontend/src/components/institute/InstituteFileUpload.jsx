'use client';
// Port of components/users/institute/institute-file-upload (free-seat Excel
// upload; the manual entry and paid-seat blocks are commented out in the
// original template). Same SheetJS path (ArrayBuffer → binary string →
// XLSX.read → first sheet → sheet_to_json raw:false), validation and request.
// As in the original, studentArray is never cleared between uploads.
// SheetJS 0.20.3 instead of 0.15.4: see R-37 / tests/parity/xlsx-oracle.mjs.
import { useRef, useState } from 'react';
import Scope from '@/components/common/Scope';
import { toastr } from '@/components/common/Toastr';
import { instituteService } from '@/services';
import { subscribe } from '@/lib/api';

const CATEGORIES = ['General (Gen)', 'Scheduled Caste (SC)', 'Scheduled Tribe (ST)', 'Other Backward Classes (OBC)', 'Economically Weaker Section (EWS)'];

/** validateStudents() — order of checks and messages as in the original. */
function validateStudents(studentArray) {
  let flag = true;
  studentArray.forEach((element) => {
    if (isNaN(element.mobile)) {
      alert(element.mobile);
      toastr.error('Invalid mobile number for ' + element.name + '.');
      flag = false;
    }
    if (element.mobile.length != 10) {
      toastr.error('Length of mobile number for student ' + element.name + ' is invalid.');
      flag = false;
    }
    if (element.gender != 'Male' && element.gender != 'Female' && element.gender != 'Others') {
      toastr.error('Invalid gender for ' + element.name + '.');
      flag = false;
    }
    if (element.program != 'Graduate' && element.program != 'Post Graduate' && element.program != 'Undergraduate') {
      toastr.error('Invalid program for ' + element.name + '.');
      flag = false;
    }
    const y = element.year_of_admission;
    if (isNaN(y) && !['2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019'].some((v) => y == v)) {
      toastr.error('Invalid year of admission for ' + element.name + '.');
      flag = false;
    }
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(element.email)) {
      toastr.error('Invalid email for ' + element.name + '.');
      flag = false;
    }
    if (element.dob < 11) {
      toastr.error('Invalid date of birth length for ' + element.name + '.');
      flag = false;
    }
    if (isNaN(Date.parse(element.dob)) && new Date(element.dob).getFullYear() < 2018) {
      toastr.error('Invalid date of birth for ' + element.name + '.');
      flag = false;
    }
    if (!CATEGORIES.some((c) => element.category == c)) {
      toastr.error('Invalid category for ' + element.name + '.');
      flag = false;
    }
  });
  return flag;
}

export default function InstituteFileUpload() {
  const [productImg, setProductImg] = useState(false);
  const worksheet = useRef(undefined);
  const studentArray = useRef([]);
  const XLSX = useRef(null);

  const loadXlsx = async () => (XLSX.current ??= await import('xlsx'));

  const uploadedFile = async (event) => {
    const file = event.target.files[0];
    const X = await loadXlsx();
    const readFile = new FileReader();
    readFile.onload = () => {
      const data = new Uint8Array(readFile.result);
      const arr = new Array();
      for (let i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
      const workbook = X.read(arr.join(''), { type: 'binary' });
      worksheet.current = workbook.Sheets[workbook.SheetNames[0]];
    };
    readFile.readAsArrayBuffer(file);
  };

  const handleResponse = (data) => {
    if (data['message'] == 'Error') toastr.error(data['reason']);
    if (data['message'] == 'Success') {
      toastr.success('Data inserted successfully!');
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load, as in the original
      window.location.href = '/institute';
    }
  };

  const readAsJson = async () => {
    setProductImg(true);
    const X = await loadXlsx();
    const jsonData = X.utils.sheet_to_json(worksheet.current, { raw: false });
    jsonData.forEach((element) => {
      const student = {
        name: element['Name of Beneficiary'],
        father_name: element['Father’s Name'],
        mobile: element['Valid Mobile Number'],
        email: element['Valid Email'],
        dob: element['Date of Birth'],
        admission_registration_number: element['Admission/ Registration number'],
        category: element['Category'],
        gender: element['Gender'],
        year_of_admission: element['Year of Admission'],
        program: element['Programs'],
        institute_name: element['Name of Institution'],
        state: element['State/ UT'],
        aicte_code: element['AICTE Code'],
        preference_1: element['Free Seat Preference 1'],
        preference_2: element['Free Seat Preference 2'],
        preference_3: element['Free Seat Preference 3'],
        marks_hsc: element['Marks secured in Class 12th'],
        total_marks: element['Total Marks'],
        percentage: element['Percentage'],
        department_stream: element['Department/ Stream'],
      };
      if (student.name !== undefined) studentArray.current.push(student);
    });
    if (validateStudents(studentArray.current)) {
      subscribe(instituteService.uploadExcel(jsonData), handleResponse, (res) => console.log(res));
    }
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
              <input type="file" className="form-control" onChange={uploadedFile} placeholder="Upload file for Free Seat" accept=".xlsx" />
            </div>
            <div className="col-md-4 mt-4 aligncenter">
              <button className="button-default upload" onClick={readAsJson}>
                Upload
              </button>
            </div>
            {productImg && (
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
