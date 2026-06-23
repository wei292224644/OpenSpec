import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { getPackageSchemasDir } from '../artifact-graph/resolver.js';

const CONSTITUTION_DIR = path.join(getPackageSchemasDir(), 'constitution');

export interface ConstitutionWritingRules {
  rules: string[];
}

export interface ConstitutionBundle {
  template: string;
  writingRules: ConstitutionWritingRules;
  outputPath: string;
  instruction: string;
}

export function loadConstitutionBundle(): ConstitutionBundle {
  const templatePath = path.join(CONSTITUTION_DIR, 'templates', 'constitution.md');
  const rulesPath = path.join(CONSTITUTION_DIR, 'writing-rules.yaml');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const raw = parseYaml(fs.readFileSync(rulesPath, 'utf-8')) as {
    rules: string[];
    instruction: string;
  };
  return {
    template,
    writingRules: { rules: raw.rules },
    outputPath: 'openspec/constitution.md',
    instruction: raw.instruction.trim(),
  };
}

export function readConstitutionFile(projectRoot: string): string | null {
  const filePath = path.join(projectRoot, 'openspec', 'constitution.md');
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}
