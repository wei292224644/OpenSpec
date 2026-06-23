import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadConstitutionBundle,
  readConstitutionFile,
} from '../../../src/core/constitution/loader.js';

describe('constitution loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-constitution-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loadConstitutionBundle returns template and writing rules', () => {
    const bundle = loadConstitutionBundle();
    expect(bundle.template).toContain('Project Constitution');
    expect(bundle.outputPath).toBe('openspec/constitution.md');
    expect(bundle.writingRules.rules.length).toBeGreaterThan(0);
    expect(bundle.writingRules.rules.some((r) => r.includes('MUST'))).toBe(true);
  });

  it('readConstitutionFile returns null when missing', () => {
    expect(readConstitutionFile(tempDir)).toBeNull();
  });

  it('readConstitutionFile returns content when present', () => {
    const dir = path.join(tempDir, 'openspec');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'constitution.md'), '# Project Constitution: test\n');
    expect(readConstitutionFile(tempDir)).toContain('Project Constitution');
  });
});
