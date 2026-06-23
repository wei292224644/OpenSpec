import path from 'path';
import {
  loadConstitutionBundle,
  readConstitutionFile,
  detectConfigMigrationHints,
  type MigrationHint,
} from '../../core/constitution/index.js';
import { readProjectConfig } from '../../core/project-config.js';
import { resolveCurrentPlanningHomeSync } from '../../core/planning-home.js';

export interface ConstitutionInstructions {
  outputPath: string;
  resolvedOutputPath: string;
  instruction: string;
  template: string;
  writingRules: string[];
  existingContent?: string;
  configContext?: string;
  configRules?: Record<string, string[]>;
  migrationHints?: MigrationHint[];
}

export function buildConstitutionInstructions(projectRoot: string): ConstitutionInstructions {
  const bundle = loadConstitutionBundle();
  const config = readProjectConfig(projectRoot);
  const existingContent = readConstitutionFile(projectRoot) ?? undefined;
  const resolvedOutputPath = path.join(projectRoot, bundle.outputPath);
  const migrationHints = config ? detectConfigMigrationHints(config) : [];

  return {
    outputPath: bundle.outputPath,
    resolvedOutputPath,
    instruction: bundle.instruction,
    template: bundle.template,
    writingRules: bundle.writingRules.rules,
    ...(existingContent ? { existingContent } : {}),
    ...(config?.context?.trim() ? { configContext: config.context.trim() } : {}),
    ...(config?.rules ? { configRules: config.rules } : {}),
    ...(migrationHints.length > 0 ? { migrationHints } : {}),
  };
}

export async function constitutionInstructionsCommand(options: { json?: boolean }): Promise<void> {
  const planningHome = resolveCurrentPlanningHomeSync();
  const instructions = buildConstitutionInstructions(planningHome.root);

  if (options.json) {
    console.log(JSON.stringify(instructions, null, 2));
    return;
  }

  // Text mode (for human debugging)
  console.log('<constitution>');
  console.log(`Write to: ${instructions.resolvedOutputPath}`);
  console.log();
  if (instructions.migrationHints?.length) {
    console.log('<migration_hints>');
    for (const h of instructions.migrationHints) {
      console.log(`- [${h.suggestion}] (${h.source}${h.artifactId ? `:${h.artifactId}` : ''}) ${h.text}`);
    }
    console.log('</migration_hints>');
    console.log();
  }
  console.log('<writing_rules>');
  for (const rule of instructions.writingRules) console.log(`- ${rule}`);
  console.log('</writing_rules>');
  console.log();
  console.log('<instruction>');
  console.log(instructions.instruction);
  console.log('</instruction>');
  console.log();
  console.log('<template>');
  console.log(instructions.template.trim());
  console.log('</template>');
  console.log('</constitution>');
}
