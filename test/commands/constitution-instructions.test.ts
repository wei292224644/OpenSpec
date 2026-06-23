import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('constitutionInstructionsCommand', () => {
  let tempDir: string;
  let stdout: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-const-instr-'));
    const openspecDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecDir, { recursive: true });
    fs.writeFileSync(
      path.join(openspecDir, 'config.yaml'),
      'schema: spec-driven\ncontext: |\n  Tech stack: TypeScript\n  Requirements MUST be observable\n'
    );
    stdout = '';
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      stdout += args.map(String).join(' ') + '\n';
    });
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('outputs JSON with template, writing rules, and migration hints', async () => {
    const { constitutionInstructionsCommand } = await import(
      '../../src/commands/workflow/constitution-instructions.js'
    );
    await constitutionInstructionsCommand({ json: true });
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.template).toContain('Project Constitution');
    expect(parsed.writingRules.length).toBeGreaterThan(0);
    expect(parsed.resolvedOutputPath).toContain('openspec/constitution.md');
    expect(parsed.configContext).toContain('TypeScript');
    expect(parsed.migrationHints.some((h: { suggestion: string }) => h.suggestion === 'constitution')).toBe(true);
  });
});
