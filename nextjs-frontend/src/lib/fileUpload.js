'use client';


import { toastr } from '@/components/common/Toastr';
import { fileService } from '@/services';
import { subscribe } from '@/lib/api';

const IMAGE = { 'image/png': 'png', 'image/jpg': 'jpg', 'image/jpeg': 'jpeg' };
const EXTENSIONS = {
  course_logo: IMAGE,
  b2b_discount_table: IMAGE,
  product_video: { 'video/mp4': 'mp4' },
  mouFile: { 'application/pdf': 'pdf' },
};
const MAX_SIZE = {
  course_logo: [2, 'File size should be less than 2Mb.'],
  b2b_discount_table: [2, 'File size should be less than 2Mb.'],
  product_video: [100, 'File size should be less than 100Mb.'],
  mouFile: [10, 'File size should be less than 10Mb.'],
};

/** checkFileExtension(type, fileName) */
export const checkFileExtension = (type, fileName) => EXTENSIONS[fileName]?.[type] ?? null;

export function uploadFile(event, fileType, code) {
  const elem = event.target;
  const myFile = elem.files[0];
  const extension = checkFileExtension(myFile.type, elem.id);

  const limit = MAX_SIZE[fileType];
  if (limit && myFile.size > 1024 * 1024 * limit[0]) {
    toastr.error(limit[1]);
    toastr.error('Invalid File!');
  }

  if (extension == null) {
    toastr.error('Invalid file extension.');
    return;
  }
  if (elem.files.length > 0) {
    const formData = new FormData();
    formData.append('myfile', elem.files[0]);
    formData.append('code', code);
    formData.append('inputField', elem.id);
    formData.append('type', extension);
    subscribe(fileService.saveFile(formData), (data) => {
      if (data == 'Success') toastr.success('File uploaded successfully!');
    });
  }
  elem.value = '';
}
