import { describe, it, expect } from 'vitest';
import { getTmpDir, getOutputDir } from './fileManager';
import path from 'path';
import os from 'os';

describe('fileManager', () => {
  it('should return correct temp directory', () => {
    const tmpDir = getTmpDir();
    expect(tmpDir).toBe(path.join(os.tmpdir(), 'wazakkir'));
  });

  it('should return correct output directory', () => {
    const outputDir = getOutputDir();
    expect(outputDir).toBe(path.join(process.cwd(), 'output'));
  });
});
