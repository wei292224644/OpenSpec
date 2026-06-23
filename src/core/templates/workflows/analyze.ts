import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getAnalyzeChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-analyze-change',
    description: 'Pre-apply read-only analysis: constitution alignment + artifact consistency. Use after propose, before apply.',
    instructions: `Analyze a change against the project constitution and artifact consistency. READ-ONLY — do not modify any files.

**Authority**: Constitution is non-negotiable during analyze. On MUST violations, adjust the plan — do NOT reinterpret or delete clauses. Constitution changes require /opsx:constitution separately.

**Input**: Change name (kebab-case). If omitted, prompt via openspec list --json.

**Steps**

1. **Load structured context**
   \`\`\`bash
   openspec instructions analyze --change "<name>" --json
   \`\`\`
   You receive: constitutionPresent, clauses[] (id/title/level/criteria), waivers[] (principle/reason), artifacts[] (id/path/exists).
   If constitutionPresent is false → report WARNING: no constitution, skip the Constitution Alignment pass.

2. **Read artifact contents** for each artifacts[].path where exists is true.

3. **Pass: Constitution Alignment** — iterate clauses[] (already parsed; do not re-parse):
   - structure 判据: check artifact structure mechanically against the criterion
   - judgment 判据: evaluate itemized yes/no per requirement (anchor to ### Requirement: IDs)
   - MUST violation + no matching waiver → CRITICAL with evidence: file + requirement ID + criterion
   - MUST violation + waiver where principle === clause.id → NOTE: "⚠ Waived <id> — reason: <reason>"
   - judgment without concrete evidence → downgrade to WARNING (never CRITICAL)

4. **Pass: Coverage / Ambiguity / Consistency** (SpecKit-style, artifacts only)
   - Requirement → task mapping gaps
   - Duplicate or conflicting requirements
   - proposal Capabilities vs specs files
   - design Decisions vs specs scope

5. **Report**
   | ID | Category | Severity | Location | Evidence | Recommendation |
   Advisory-block apply if any CRITICAL unless user explicitly accepts risk (still list CRITICALs).

**Do NOT**: read implementation code, modify constitution, modify artifacts, or conflate with verify.`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxAnalyzeCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Analyze',
    description: 'Pre-apply read-only constitution alignment and artifact consistency check',
    category: 'Workflow',
    tags: ['workflow', 'analyze', 'experimental'],
    content: `Analyze a change against the project constitution before implementation.

Follow the openspec-analyze-change skill. Start with:
\`\`\`bash
openspec instructions analyze --change "<name>" --json
\`\`\``,
  };
}
