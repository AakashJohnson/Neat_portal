import path from 'node:path';

export const projectRoot = path.resolve(import.meta.dirname, '..', '..');
export const projectPath = (...parts) => path.resolve(projectRoot, ...parts);
