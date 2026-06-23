import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getConstitutionSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-constitution',
    description: 'Draft or revise the project constitution (plan-level invariants). Use when establishing or updating openspec/constitution.md.',
    instructions: `Draft or revise the project constitution at openspec/constitution.md.

**Steps**

1. **Load template, rules, and migration hints**
   \`\`\`bash
   openspec status --json
   openspec instructions constitution --json
   \`\`\`
   Parse: template, writingRules, instruction, existingContent, configContext, configRules, migrationHints.

2. **Review migration hints (consume, do NOT re-classify)**
   For each entry in migrationHints, present its precomputed suggestion to the user:
   - [constitution] → confirm wording, then add as a clause in step 4
   - [linter] → recommend an ESLint rule / CI check, do NOT add to constitution
   - [keep] → leave in config.yaml context
   Ask the user to confirm or override each — the suggestion is a starting point, the user decides.

3. **Interactive grilling (one principle at a time)**
   For each principle ask:
   > "If someone violated this, what would analyze look at in proposal/design/specs to find it?"
   - Untestable goal → push for 判据 + [structure] or [judgment]
   - Code-only rule → redirect to linter/CI
   - Vague wording → rewrite with MUST/SHOULD or downgrade to config rules

4. **Write openspec/constitution.md**
   - Roman numeral ids + (MUST)/(SHOULD)
   - Each clause: ≥1 判据 with 正例/反例
   - One topic per clause
   - Light version stamp: \`> Version: X.Y · Last amended: YYYY-MM-DD\`

5. **Confirm**
   Summarize clauses. Remind: MUST violations are flagged CRITICAL by /opsx:analyze (advisory block) until fixed or waived in .openspec.yaml.`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxConstitutionCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Constitution',
    description: 'Draft or revise project constitution (plan-level invariants)',
    category: 'Workflow',
    tags: ['workflow', 'constitution', 'experimental'],
    content: `Run the constitution workflow to create or update openspec/constitution.md.

Follow the openspec-constitution skill. Start with:
\`\`\`bash
openspec instructions constitution --json
\`\`\``,
  };
}
