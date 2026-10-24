// Outbound call made by FileController::uploadFile (inputField = mouFile):
// the MoU is forwarded to the NEAT EoI system (EOI_API_URL).
import { readFile } from 'node:fs/promises';
import { env } from '../config/env.js';

/**
 * Guzzle multipart POST with http_errors=false, timeout 60s, connect timeout 40s.
 * @returns {Promise<{ statusCode: number, body: string }>}
 * @throws on network failure / timeout (caught by the caller like the original)
 */
export async function saveDocument({ applicationId, companyName, filePath, fileName }) {
  const form = new FormData();
  form.append('application_id', String(applicationId ?? ''));
  form.append('company_name', String(companyName ?? ''));
  form.append('comment', 'This document uploaded on neat portal');
  form.append('status', 'Approved');
  form.append('mou_document', new Blob([await readFile(filePath)]), fileName);

  const res = await fetch(env.EOI_API_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(60_000) });
  return { statusCode: res.status, body: await res.text() };
}
