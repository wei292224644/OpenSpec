import type { ProjectConfig } from '../project-config.js';

export interface MigrationHint {
  source: 'context' | 'rules';
  artifactId?: string;
  text: string;
  suggestion: 'constitution' | 'linter' | 'keep';
  reason: string;
}

const NORMATIVE = /\b(MUST NOT|MUST|SHALL NOT|SHALL|SHOULD NOT|SHOULD)\b/;
const CODE_MECHANICAL = /(path\.join|console\.log|eslint|lint\b|coverage|no-console|hardcode)/i;

function classify(text: string): Pick<MigrationHint, 'suggestion' | 'reason'> {
  if (CODE_MECHANICAL.test(text)) {
    return { suggestion: 'linter', reason: 'Code-mechanical rule — belongs in linter/CI, not constitution' };
  }
  if (NORMATIVE.test(text)) {
    return { suggestion: 'constitution', reason: 'Plan-level normative language — candidate constitution clause' };
  }
  return { suggestion: 'keep', reason: 'Descriptive background — leave in config.yaml context' };
}

export function detectConfigMigrationHints(config: ProjectConfig): MigrationHint[] {
  const hints: MigrationHint[] = [];
  for (const line of (config.context ?? '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    hints.push({ source: 'context', text: line, ...classify(line) });
  }
  for (const [artifactId, rules] of Object.entries(config.rules ?? {})) {
    for (const rule of rules) {
      hints.push({ source: 'rules', artifactId, text: rule, ...classify(rule) });
    }
  }
  return hints;
}
