import { describe, it, expect } from 'vitest';
import { detectConfigMigrationHints } from '../../../src/core/constitution/migration.js';

describe('detectConfigMigrationHints', () => {
  it('suggests constitution for plan-level MUST language in context', () => {
    const hints = detectConfigMigrationHints({
      schema: 'spec-driven',
      context: 'Requirements MUST describe observable user behavior.',
    });
    expect(hints.some((h) => h.suggestion === 'constitution')).toBe(true);
  });

  it('suggests linter for code-mechanical rules', () => {
    const hints = detectConfigMigrationHints({
      schema: 'spec-driven',
      context: 'Always use path.join(), never hardcode slashes.',
    });
    expect(hints.some((h) => h.suggestion === 'linter')).toBe(true);
  });

  it('keeps pure descriptive background', () => {
    const hints = detectConfigMigrationHints({
      schema: 'spec-driven',
      context: 'Tech stack: TypeScript, Node, pnpm.',
    });
    expect(hints.every((h) => h.suggestion === 'keep')).toBe(true);
  });

  it('tags rules entries with their artifactId', () => {
    const hints = detectConfigMigrationHints({
      schema: 'spec-driven',
      rules: { specs: ['Requirements MUST be observable'] },
    });
    expect(hints.some((h) => h.source === 'rules' && h.artifactId === 'specs')).toBe(true);
  });
});
