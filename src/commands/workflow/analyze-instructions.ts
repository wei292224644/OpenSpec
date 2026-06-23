import * as fs from 'node:fs';
import path from 'path';
import {
  readConstitutionFile,
  parseConstitution,
  type ConstitutionClause,
} from '../../core/constitution/index.js';
import type { Waiver } from '../../core/change-metadata/index.js';
import { readChangeMetadata } from '../../utils/change-metadata.js';
import { loadChangeContext } from '../../core/artifact-graph/instruction-loader.js';
import { resolveCurrentPlanningHomeSync } from '../../core/planning-home.js';

export interface AnalyzeArtifactRef {
  id: string;
  path: string;
  exists: boolean;
}

export interface AnalyzeInstructions {
  changeName: string;
  constitutionPresent: boolean;
  clauses: ConstitutionClause[];
  waivers: Waiver[];
  artifacts: AnalyzeArtifactRef[];
}

export function buildAnalyzeInstructions(projectRoot: string, changeName: string): AnalyzeInstructions {
  const constitution = readConstitutionFile(projectRoot);
  const clauses = constitution ? parseConstitution(constitution) : [];
  const context = loadChangeContext(projectRoot, changeName);
  const metadata = readChangeMetadata(context.changeDir, projectRoot);
  const artifacts = context.graph.getAllArtifacts().map((a) => {
    const p = path.join(context.changeDir, a.generates);
    return { id: a.id, path: p, exists: fs.existsSync(p) };
  });
  return {
    changeName,
    constitutionPresent: constitution !== null,
    clauses,
    waivers: metadata?.waivers ?? [],
    artifacts,
  };
}

export async function analyzeInstructionsCommand(options: {
  change?: string;
  json?: boolean;
}): Promise<void> {
  if (!options.change) {
    throw new Error('instructions analyze requires --change <name>');
  }
  const planningHome = resolveCurrentPlanningHomeSync();
  const instructions = buildAnalyzeInstructions(planningHome.root, options.change);

  if (options.json) {
    console.log(JSON.stringify(instructions, null, 2));
    return;
  }

  console.log('<analyze>');
  console.log(`Change: ${instructions.changeName}`);
  console.log(`Constitution present: ${instructions.constitutionPresent}`);
  console.log(`Clauses: ${instructions.clauses.map((c) => `${c.id} (${c.level})`).join(', ') || 'none'}`);
  console.log(`Waivers: ${instructions.waivers.map((w) => w.principle).join(', ') || 'none'}`);
  console.log('</analyze>');
}
