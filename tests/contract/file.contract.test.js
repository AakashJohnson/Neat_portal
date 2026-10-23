// FIL-01..03 — parity with Laravel Api\FileController, plus DEV-10 security checks.
// Laravel writes into the original repo's public/files: every file it creates
// here is deleted again and DB columns are restored. Dangerous inputs (.php
// upload, ../ traversal) and the MoU upload (which POSTs to the real external
// EoI server) are never sent to Laravel.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { existsSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { LARAVEL, nodeApp, laravelAvailable, fixtureToken, callNode } from '../helpers/contract.js';
import { db } from '../../src/database/knex.js';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const LARAVEL_PUBLIC = path.resolve('../backend/backend/public');
const NODE_PUBLIC = process.env.PUBLIC_STORAGE_PATH;

let reference;
let product;
let company;
let stub;
let stubCalls = [];

beforeAll(async () => {
  reference = await laravelAvailable();
  product = await db('product_details').whereNotNull('code').first('code', 'course_logo_uploaded', 'course_logo_name', 'course_logo_file', 'neat_id');
  company = await db('company_details').first('neat_id', 'mou_file_uploaded', 'mou_file_name', 'mou_file', 'name');
  // Local stand-in for https://neatphase2eoiapi.aicte-india.org/api/saveDocument
  stub = http.createServer((req, res) => {
    let size = 0;
    req.on('data', (c) => (size += c.length));
    req.on('end', () => {
      stubCalls.push({ url: req.url, size, contentType: req.headers['content-type'] });
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: true, message: 'stub saved' }));
    });
  });
  await new Promise((r) => stub.listen(59999, '127.0.0.1', r));
});

afterAll(async () => {
  await db('product_details').where('code', product.code).update({
    course_logo_uploaded: product.course_logo_uploaded, course_logo_name: product.course_logo_name, course_logo_file: product.course_logo_file,
  });
  await db('company_details').where('neat_id', company.neat_id).update({ mou_file_uploaded: company.mou_file_uploaded, mou_file_name: company.mou_file_name, mou_file: company.mou_file });
  await new Promise((r) => stub.close(r));
});

/** Multipart POST to Laravel with fetch. */
async function laravelUpload(path_, fields, file) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  if (file) form.append(file.field, new Blob([file.buffer]), file.name);
  const res = await fetch(`${LARAVEL}${path_}`, { method: 'POST', body: form, headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function nodeUpload(path_, fields, file, query = {}) {
  let r = request(nodeApp()).post(path_).query(query).set('Accept', 'application/json');
  for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
  if (file) r = r.attach(file.field, file.buffer, file.name);
  const res = await r;
  let body;
  try { body = JSON.parse(res.text); } catch { body = res.text; }
  return { status: res.status, body };
}

describe('FIL-01 uploadFile', () => {
  it('unknown inputField → empty 200 (both)', async ({ skip }) => {
    if (!reference) skip();
    const fields = { code: product.code, inputField: 'nonsense', type: 'png' };
    const file = { field: 'myfile', buffer: PNG, name: 'logo.png' };
    const l = await laravelUpload('/api/uploadFile', fields, file);
    const n = await nodeUpload('/api/uploadFile', fields, file);
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
  });

  it('course_logo png: same response, same DB columns, file stored under files/course_logo', async ({ skip }) => {
    if (!reference) skip();
    const fields = { code: product.code, inputField: 'course_logo', type: 'png' };
    const file = { field: 'myfile', buffer: PNG, name: 'logo.png' };
    const l = await laravelUpload('/api/uploadFile', fields, file);
    const lRow = await db('product_details').where('code', product.code).first('course_logo_uploaded', 'course_logo_name', 'course_logo_file');
    const lFile = path.join(LARAVEL_PUBLIC, 'files', 'course_logo', lRow.course_logo_file);
    expect(existsSync(lFile)).toBe(true);
    unlinkSync(lFile); // leave the original repo untouched

    await new Promise((r) => setTimeout(r, 1100)); // distinct timestamp in the file name
    const n = await nodeUpload('/api/uploadFile', fields, file);
    const nRow = await db('product_details').where('code', product.code).first('course_logo_uploaded', 'course_logo_name', 'course_logo_file');
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body); // "Success"
    expect(nRow.course_logo_uploaded).toBe('Yes');
    expect(nRow.course_logo_name).toBe(lRow.course_logo_name);
    expect(nRow.course_logo_file).toMatch(new RegExp(`^File_${product.code}_course_logo_\\d{10}\\.png$`));
    expect(existsSync(path.join(NODE_PUBLIC, 'files', 'course_logo', nRow.course_logo_file))).toBe(true);

    // Served at the same public URL scheme as Laravel.
    const served = await request(nodeApp()).get(`/files/course_logo/${nRow.course_logo_file}`);
    expect(served.status).toBe(200);
  });

  it('DEV-10: a .php payload or a type/content mismatch is rejected (Node only)', async () => {
    const php = Buffer.from('<?php echo "pwned"; ?>');
    for (const [type, buffer, name] of [['php', php, 'x.php'], ['png', php, 'x.png'], ['jpg', PDF, 'x.jpg']]) {
      const n = await nodeUpload('/api/uploadFile', { code: product.code, inputField: 'course_logo', type }, { field: 'myfile', buffer, name });
      expect(n.status).toBe(422);
      expect(n.body).toBe('Invalid file.');
    }
  });

  it('mouFile: stored, company updated, forwarded to the EoI API (stubbed)', async () => {
    stubCalls = [];
    const n = await nodeUpload('/api/uploadFile', { code: company.neat_id, inputField: 'mouFile', type: 'pdf' }, { field: 'myfile', buffer: PDF, name: 'mou.pdf' });
    expect(n.status).toBe(200);
    expect(n.body).toMatchObject({ status: true, message: 'MOU uploaded successfully.', other_server_response: { status: true, message: 'stub saved' } });
    expect(stubCalls).toHaveLength(1);
    expect(stubCalls[0].contentType).toMatch(/multipart\/form-data/);
    const row = await db('company_details').where('neat_id', company.neat_id).first('mou_file_uploaded', 'mou_file_name', 'mou_file');
    expect(row).toMatchObject({ mou_file_uploaded: 'Yes', mou_file_name: 'mou.pdf' });
  });
});

describe('FIL-02 deleteFile', () => {
  it('non-mouFile type → "Error" (both)', async ({ skip }) => {
    if (!reference) skip();
    const fields = { neat_id: company.neat_id, fileName: 'x.pdf', type: 'logo' };
    const l = await laravelUpload('/api/deleteFile', fields);
    const n = await nodeUpload('/api/deleteFile', fields);
    expect(n.body).toEqual(l.body);
  });

  it('mouFile deletes the file and resets the columns', async () => {
    const name = 'File_contract_delete.pdf';
    writeFileSync(path.join(NODE_PUBLIC, 'files', 'mou_file', name), PDF);
    const n = await nodeUpload('/api/deleteFile', { neat_id: company.neat_id, fileName: name, type: 'mouFile' });
    expect(n.body).toBe('Success');
    expect(existsSync(path.join(NODE_PUBLIC, 'files', 'mou_file', name))).toBe(false);
    expect(await db('company_details').where('neat_id', company.neat_id).first('mou_file')).toEqual({ mou_file: 'None' });
  });

  it('DEV-10: "../" traversal cannot delete files outside files/mou_file (Node only)', async () => {
    const victimDir = path.join(NODE_PUBLIC, 'victim');
    mkdirSync(victimDir, { recursive: true });
    const victim = path.join(victimDir, 'keep.txt');
    writeFileSync(victim, 'keep');
    const n = await nodeUpload('/api/deleteFile', { neat_id: company.neat_id, fileName: '../../victim/keep.txt', type: 'mouFile' });
    expect(n.status).toBe(500); // basename "keep.txt" does not exist in mou_file
    expect(existsSync(victim)).toBe(true);
  });
});

describe('FIL-03 updateMou', () => {
  it('validation errors match Laravel (no neat_id / no file / wrong type)', async ({ skip }) => {
    if (!reference) skip();
    const cases = [
      [{}, null],
      [{ neat_id: company.neat_id }, null],
      [{ neat_id: company.neat_id }, { field: 'mou_document', buffer: PNG, name: 'mou.pdf' }],
    ];
    for (const [fields, file] of cases) {
      const l = await laravelUpload('/api/updateMou', fields, file);
      const n = await nodeUpload('/api/updateMou', fields, file);
      expect(n.status).toBe(l.status);
      expect(n.body).toEqual(l.body);
    }
  });

  it('unknown company → 404 (both)', async ({ skip }) => {
    if (!reference) skip();
    const file = { field: 'mou_document', buffer: PDF, name: 'mou.pdf' };
    const l = await laravelUpload('/api/updateMou', { neat_id: 'NO_SUCH_NEAT' }, file);
    const n = await nodeUpload('/api/updateMou', { neat_id: 'NO_SUCH_NEAT' }, file);
    expect(n.status).toBe(l.status);
    expect(n.body).toEqual(l.body);
  });

  it('valid pdf: same response shape and DB update (Laravel file removed afterwards)', async ({ skip }) => {
    if (!reference) skip();
    const file = { field: 'mou_document', buffer: PDF, name: 'contract-mou.pdf' };
    const l = await laravelUpload('/api/updateMou', { neat_id: company.neat_id }, file);
    expect(l.status).toBe(200);
    const lPath = path.join(LARAVEL_PUBLIC, 'files', 'mou_file', l.body.mou_file);
    if (existsSync(lPath)) unlinkSync(lPath);
    await new Promise((r) => setTimeout(r, 1100));
    const n = await nodeUpload('/api/updateMou', { neat_id: company.neat_id }, file);
    expect(n.status).toBe(200);
    const mask = (b) => ({ ...b, mou_file: b.mou_file.replace(/_\d{10}\./, '_<t>.') });
    expect(mask(n.body)).toEqual(mask(l.body));
  });
});

describe('SEC-UPLOAD-01 hardened mode', () => {
  it('uploadFile / deleteFile / updateMou require a token unless LEGACY_PUBLIC_ENDPOINTS=true', async () => {
    process.env.LEGACY_PUBLIC_ENDPOINTS = 'false';
    try {
      const up = await nodeUpload('/api/uploadFile', { code: product.code, inputField: 'course_logo', type: 'png' }, { field: 'myfile', buffer: PNG, name: 'l.png' });
      expect(up.status).toBe(401);
      const del = await nodeUpload('/api/deleteFile', { neat_id: company.neat_id, fileName: 'x', type: 'mouFile' });
      expect(del.status).toBe(401);
      const student = await db('users').where('id', 13).first('email');
      const token = await fixtureToken(callNode, student.email);
      const mou = await nodeUpload('/api/updateMou', { neat_id: company.neat_id }, { field: 'mou_document', buffer: PDF, name: 'm.pdf' }, { token });
      expect(mou.status).toBe(403);
    } finally {
      process.env.LEGACY_PUBLIC_ENDPOINTS = 'true';
    }
  });
});
