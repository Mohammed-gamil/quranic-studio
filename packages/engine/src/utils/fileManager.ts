// FILE: packages/engine/src/utils/fileManager.ts

import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from './logger';
import { makeError } from '../types/errors';

export function getOutputDir(): string {
  const dir = process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'output');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getTmpDir(): string {
  const dir = process.env.TMP_DIR ?? path.join(os.tmpdir(), 'wazakkir');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function cleanup(paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        logger.debug({ path: p }, 'Cleaning up filepath or directory');
        fs.rmSync(p, { recursive: true, force: true });
      }
    } catch (err: any) {
      logger.error({ path: p, error: err }, 'Failed to clean up target path');
      throw makeError('FILE_ERROR', `Failed to delete path ${p}: ${err.message}`, { originalError: err });
    }
  }
}
