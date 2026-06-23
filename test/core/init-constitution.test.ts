import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createConstitutionSkeletonIfMissing } from '../../src/core/init-constitution.js';

describe('createConstitutionSkeletonIfMissing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-init-const-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes skeleton when file missing', () => {
    const openspecPath = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecPath, { recursive: true });
    const result = createConstitutionSkeletonIfMissing(tempDir);
    expect(result).toBe('created');
    expect(fs.existsSync(path.join(openspecPath, 'constitution.md'))).toBe(true);
  });

  it('does not overwrite existing constitution', () => {
    const openspecPath = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecPath, { recursive: true });
    fs.writeFileSync(path.join(openspecPath, 'constitution.md'), 'existing');
    const result = createConstitutionSkeletonIfMissing(tempDir);
    expect(result).toBe('exists');
    expect(fs.readFileSync(path.join(openspecPath, 'constitution.md'), 'utf-8')).toBe('existing');
  });

  it('replaces template placeholder with project name', () => {
    const openspecPath = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecPath, { recursive: true });
    createConstitutionSkeletonIfMissing(tempDir);
    const content = fs.readFileSync(path.join(openspecPath, 'constitution.md'), 'utf-8');
    expect(content).not.toContain('<project-name>');
    expect(content).toContain(path.basename(tempDir));
  });
});
