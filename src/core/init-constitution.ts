import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadConstitutionBundle } from './constitution/index.js';

export function createConstitutionSkeletonIfMissing(
  projectPath: string
): 'created' | 'exists' {
  const target = path.join(projectPath, 'openspec', 'constitution.md');
  if (fs.existsSync(target)) return 'exists';
  const bundle = loadConstitutionBundle();
  const projectName = path.basename(projectPath);
  const content = bundle.template
    .replace(/<project-name>/g, projectName)
    .replace('YYYY-MM-DD', new Date().toISOString().slice(0, 10));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf-8');
  return 'created';
}
