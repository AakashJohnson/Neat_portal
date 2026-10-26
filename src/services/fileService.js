import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromFile } from 'file-type';
import { db, table } from '../database/knex.js';
import { assertAuthenticated } from './auth/hardening.js';
import { legacyErrorResponse } from './serviceErrors.js';
import { LegacyResponse } from './auth/tokenAuth.js';
import { moveUpload, removeFile } from '../integrations/storage.js';
import { saveDocument } from '../integrations/eoiApi.js';
import { logger } from '../config/logger.js';
import { unixNow } from '../utils/time.js';
import { looseEq, phpConcat } from '../utils/php.js';

const ADMIN_ROLE = 1;
const MB = 1024 * 1024;

const UPLOAD_RULES = {
  course_logo: { types: ['png', 'jpg', 'jpeg'], maxBytes: 2 * MB, dir: 'files/course_logo', column: 'course_logo' },
  b2b_discount_table: { types: ['png', 'jpg', 'jpeg'], maxBytes: 2 * MB, dir: 'files/b2b_discount_table', column: 'b2b_discount_table' },
  product_video: { types: ['mp4'], maxBytes: 100 * MB, dir: 'files/product_video', column: 'product_video' },
  mouFile: { types: ['pdf'], maxBytes: 10 * MB, dir: 'files/mou_file' },
  mouFile_old_backup: { types: ['pdf'], maxBytes: 10 * MB, dir: 'files/mou_file' },
};

// file-type reports jpg for both .jpg and .jpeg.
const sniffMatches = (sniffed, declared) => sniffed === declared || (sniffed === 'jpg' && declared === 'jpeg');

const discard = (file) => (file?.path ? unlink(file.path).catch(() => {}) : undefined);

/** Ownership check in hardened mode: the product/company must belong to the token's account. */
async function assertUploadAllowed(req, inputField, code) {
  const payload = await assertAuthenticated(req);
  if (!payload || Number(payload.role_id) === ADMIN_ROLE) return;
  if (inputField.startsWith('mouFile')) throw new LegacyResponse(403, { message: 'Error', reason: 'Forbidden' });
  const product = await db(table('product_details')).where('code', code ?? null).first('neat_id');
  if (!product || !looseEq(product.neat_id, payload.application_number)) {
    throw new LegacyResponse(403, { message: 'Error', reason: 'Forbidden' });
  }
}

/** POST /api/uploadFile (multipart: myfile, code, inputField, type) */
export async function uploadFile(req) {
  const file = req.file;
  const { code = null, inputField = null, type: extension = null } = req.body ?? {};
  try {
    const rule = UPLOAD_RULES[inputField];
    if (!rule) {
      await discard(file);
      return { status: 200, empty: true }; // unknown inputField: the action returns nothing
    }
    await assertUploadAllowed(req, inputField, code);


    if (!file) return { status: 500, body: { message: 'Server Error' } };

    const sniffed = (await fileTypeFromFile(file.path))?.ext;
    if (!rule.types.includes(String(extension)) || !sniffMatches(sniffed, String(extension)) || file.size > rule.maxBytes) {
      await discard(file);
      return { status: 422, body: 'Invalid file.' };
    }

    const fileName = phpConcat('File_', code, '_', inputField, '_', unixNow(), '.', extension);
    const realName = file.originalname;
    const dest = await moveUpload(file.path, rule.dir, fileName);

    if (rule.column) {
      await db(table('product_details'))
        .where('code', code)
        .update({ [`${rule.column}_uploaded`]: 'Yes', [`${rule.column}_name`]: realName, [`${rule.column}_file`]: fileName });
      return { status: 200, body: 'Success' };
    }

    const company = await db(table('company_details')).where('neat_id', code).first();
    await db(table('company_details')).where('neat_id', code).update({ mou_file_uploaded: 'Yes', mou_file_name: realName, mou_file: fileName });
    if (inputField === 'mouFile_old_backup') return { status: 200, body: 'Success' };

    // Forward the MoU to the NEAT EoI system (same contract as the Guzzle call).
    try {
      const { statusCode, body } = await saveDocument({ applicationId: code, companyName: company ? company.name : '', filePath: dest, fileName });
      let data = null;
      try {
        data = JSON.parse(body);
      } catch {
        data = null;
      }
      if (statusCode >= 200 && statusCode < 300) {
        return { status: 200, body: { status: true, message: 'MOU uploaded successfully.', local_file: fileName, other_server_response: data } };
      }
      return {
        status: 500,
        body: { status: false, message: 'MOU saved locally but other server returned an error.', other_server_status: statusCode, other_server_response: data || body },
      };
    } catch (err) {
      return { status: 500, body: { status: false, message: 'MOU saved locally but other server API could not be reached.', error: err.message } };
    }
  } catch (err) {
    await discard(file);
    if (err instanceof LegacyResponse) return { status: err.status, body: err.body };
    return legacyErrorResponse(err);
  }
}

/** POST /api/deleteFile {neat_id, fileName, type} */
export async function deleteFile(req, { neat_id, fileName, type }) {
  try {
    const payload = await assertAuthenticated(req, [ADMIN_ROLE]);
    void payload;
  } catch (err) {
    if (err instanceof LegacyResponse) return { status: err.status, body: err.body };
    throw err;
  }
  if (type !== 'mouFile') return { status: 200, body: 'Error' };

  await db(table('company_details')).where('neat_id', neat_id ?? null).update({ mou_file_uploaded: 'None', mou_file_name: 'None', mou_file: 'None' });
  try {
    await removeFile('files/mou_file', path.basename(String(fileName ?? '')));
  } catch (err) {

    logger.warn({ err: err.message }, 'deleteFile: unlink failed');
    return { status: 500, body: { message: 'Server Error' } };
  }
  return { status: 200, body: 'Success' };
}

const MOU_TYPES = ['pdf', 'doc', 'docx'];

const sniffToMou = (ext) => (ext === 'cfb' ? 'doc' : ext);

/** POST /api/updateMou (multipart: neat_id, mou_document) */
export async function updateMou(req) {
  const file = req.file;
  const neatId = req.body?.neat_id ?? null;
  try {
    try {
      await assertAuthenticated(req, [ADMIN_ROLE]);
    } catch (err) {
      if (err instanceof LegacyResponse) {
        await discard(file);
        return { status: err.status, body: { status: false, message: err.body.reason ?? 'Unauthorized' } };
      }
      throw err;
    }

    // Validator: neat_id required|string; mou_document required|file|mimes:pdf,doc,docx|max:10240 (first error only).
    let error = null;
    if (neatId === null || String(neatId).trim() === '') error = 'The neat id field is required.';
    else if (!file) error = 'The mou document field is required.';
    else {
      const sniffed = sniffToMou((await fileTypeFromFile(file.path))?.ext);
      if (!MOU_TYPES.includes(sniffed)) error = 'The mou document must be a file of type: pdf, doc, docx.';
      else if (file.size / 1024 > 10240) error = 'The mou document may not be greater than 10240 kilobytes.';
      else file.sniffed = sniffed;
    }
    if (error) {
      await discard(file);
      return { status: 422, body: { status: false, message: error } };
    }

    if (!(await db(table('company_details')).where('neat_id', neatId).first())) {
      await discard(file);
      return { status: 404, body: { status: false, message: `Company not found for NEAT ID: ${neatId}` } };
    }

    const clientExt = path.extname(file.originalname).slice(1);
    const extension = MOU_TYPES.includes(clientExt.toLowerCase()) ? clientExt : file.sniffed;
    const fileName = `File_${neatId}_mou_document_${unixNow()}.${extension}`;
    await moveUpload(file.path, 'files/mou_file', fileName);
    await db(table('company_details')).where('neat_id', neatId).update({ mou_file_uploaded: 'Yes', mou_file_name: file.originalname, mou_file: fileName });

    return { status: 200, body: { status: true, message: 'MOU uploaded successfully.', neat_id: neatId, mou_file: fileName, mou_file_name: file.originalname } };
  } catch (err) {
    await discard(file);
    logger.error({ neat_id: neatId, err: err.message }, 'NEAT Portal MOU Upload Error');
    return { status: 500, body: { status: false, message: 'Server Error' } };
  }
}
