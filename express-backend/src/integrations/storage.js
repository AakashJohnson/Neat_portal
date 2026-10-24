// Local file storage under Laravel's public/ directory (PUBLIC_STORAGE_PATH),
// so files uploaded by either backend keep the same public URLs:
//   /files/course_logo/<name>, /files/product_video/<name>,
//   /files/b2b_discount_table/<name>, /files/mou_file/<name>
import { mkdir, rename, copyFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export const publicRoot = () => path.resolve(env.PUBLIC_STORAGE_PATH);

/** Absolute path for a sub-path of public/, refusing anything that escapes it. */
export function publicPath(...parts) {
  const root = publicRoot();
  const full = path.resolve(root, ...parts);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error('Path escapes the public storage directory');
  }
  return full;
}

/** Laravel UploadedFile::move(): move a temp upload into public/<subPath>/<fileName>. */
export async function moveUpload(tempPath, subPath, fileName) {
  const dir = publicPath(subPath);
  await mkdir(dir, { recursive: true });
  const dest = publicPath(subPath, path.basename(fileName));
  try {
    await rename(tempPath, dest);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await copyFile(tempPath, dest); // temp dir on another volume
    await unlink(tempPath);
  }
  return dest;
}

export async function removeFile(subPath, fileName) {
  await unlink(publicPath(subPath, path.basename(String(fileName ?? ''))));
}

export async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
