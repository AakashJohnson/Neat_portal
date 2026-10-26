import { Router } from 'express';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { asyncHandler, send } from '../http/asyncHandler.js';
import * as files from '../services/fileService.js';
import { input } from '../utils/request.js';
import { normalizeBody } from '../middleware/normalizeInput.js';

const tmpDir = path.join(os.tmpdir(), 'neat-uploads');
mkdirSync(tmpDir, { recursive: true });

// Temp-file uploads; the service validates and moves them into public/files.
// 110 MB ceiling: the largest legitimate upload (product video) is 100 MB.
const upload = multer({ dest: tmpDir, limits: { fileSize: 110 * 1024 * 1024, files: 1 } });

export const fileRouter = Router();

fileRouter.post('/uploadFile', upload.single('myfile'), normalizeBody, asyncHandler(async (req, res) => send(res, await files.uploadFile(req))));
fileRouter.post('/deleteFile', upload.none(), normalizeBody, asyncHandler(async (req, res) => send(res, await files.deleteFile(req, input(req, 'neat_id', 'fileName', 'type')))));
fileRouter.post('/updateMou', upload.single('mou_document'), normalizeBody, asyncHandler(async (req, res) => send(res, await files.updateMou(req))));
