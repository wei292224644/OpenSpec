import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('analyzeInstructionsCommand', () => {
  let tempDir: string;
  let stdout: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-analyze-instr-'));
    const openspecDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecDir, { recursive: true });
    fs.writeFileSync(path.join(openspecDir, 'config.yaml'), 'schema: spec-driven\n');
    fs.writeFileSync(
      path.join(openspecDir, 'constitution.md'),
      '## I. Product Behavior Language (MUST)\nspec MUST ...\n- CRITERION[judgment]: each requirement is an observable outcome\n'
    );
    const changeDir = path.join(openspecDir, 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, '.openspec.yaml'),
      'schema: spec-driven\nwaivers:\n  - principle: I\n    reason: internal scaffolding\n'
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

  it('outputs parsed clauses and waivers', async () => {
    const { analyzeInstructionsCommand } = await import(
      '../../src/commands/workflow/analyze-instructions.js'
    );
    await analyzeInstructionsCommand({ change: 'demo', json: true });
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.constitutionPresent).toBe(true);
    expect(parsed.clauses[0]).toMatchObject({ id: 'I', level: 'MUST' });
    expect(parsed.waivers[0]).toMatchObject({ principle: 'I' });
    expect(Array.isArray(parsed.artifacts)).toBe(true);
  });
});
