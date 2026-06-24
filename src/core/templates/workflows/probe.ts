/**
 * Skill Template Workflow Modules
 *
 * /opsx:probe — optional pre-propose alignment via a question-tree + grilling
 * interaction, producing a persistent probe-report.md.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getProbeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-probe',
    description: 'Probe a change before proposing: depth-first grilling over a 6-layer question tree, producing probe-report.md. Use when the user wants to align deeply on scope, design, and assumptions before generating artifacts.',
    instructions: `Probe a change before \`/opsx:propose\` — converge on decisions and surface hidden assumptions.

probe is an OPTIONAL pre-propose alignment phase. Its job: use architecture (a question tree + grilling interaction) to reach a thinking depth the model would not reach on its own, then persist the result so it survives context compaction.

**Input**: A change name (kebab-case) OR a description of what to build. Derive a kebab-case name if only a description is given.

**Steps**

1. **Read the codebase FIRST (do not ask what you can read)**
   Before any question, gather context:
   \`\`\`bash
   openspec status --json
   openspec instructions --json
   \`\`\`
   Also read existing specs under \`openspec/specs/\` and any relevant source.
   If a project constitution exists (\`openspec/constitution.md\`), read it — do NOT ask about anything it already governs.

2. **Scaffold the change shell**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   The report will be written into this change directory (\`openspec/changes/<name>/probe-report.md\`).
   If the change already exists, proceed (you will update its report).

3. **Grill — one question at a time**
   Walk the 6-layer question tree (below) depth-first. Rules:
   - **One question per turn.** Wait for the answer before the next question.
   - **Every question carries your recommended answer**, and the recommendation MUST cite evidence:
     - codebase evidence (e.g. \`status --json\`, a spec, a source file:line), OR
     - an explicit assumption flag: "(based on a general assumption, unverified)".
     - Never assert a strong recommendation from thin air.
   - **Codebase-first**: if a question can be answered by reading, read instead of asking.
   - **Depth-first**: drill one branch until clear, then move to the next. When an answer is vague, follow up ("you said 'roughly' — I read that as X, correct?").
   - **Relentless but respectful**: don't let real ambiguity slide; but when the user says "default"/"don't know"/"your call", record it as an open assumption and move on. The user can say "enough, start" at any time.

4. **Question tree (navigation map, not a checklist)**
   AI decides traversal order and depth from the conversation.
   - **L1 Scope** (always cover): what problem, why now? what is explicitly out of scope? who/what benefits?
   - **L2 Impact** (always cover): which existing specs are touched (modify/add)? which code modules? what depends on what we change (downstream)? what does this change depend on (upstream)?
   - **L3 Design** (by complexity): 2–3 implementation options + trade-offs? recommended option + reason (cite evidence)? key interfaces/data-structure changes? consistent with existing patterns — if not, why?
   - **L4 Failure** (by complexity): how can this change fail? state on failure, recoverable? security/perf/concurrency risks? boundary conditions (min/max/empty)?
   - **L5 Success** (by complexity): measurable definition of "done"? what test proves it works? what signal tells us we got it wrong?
   - **L6 Open assumptions** (ALWAYS output): which assumptions did AI make about existing code (unverified)? about project conventions? what did AI guess because it didn't know? Mark each \`[NEEDS CLARIFICATION]\`.

   Coverage: L1 & L2 mandatory; L3–L5 scale with complexity (simple changes pass fast); L6 always produced even if the rest resolved quickly.

5. **Write \`openspec/changes/<name>/probe-report.md\`** when probe ends (see structure below). Then suggest the next step.

**Stopping condition**
No forced end. probe ends when (a) L1–L6 has no remaining genuine ambiguity, or (b) the user says "enough"/"start". "If there really are no problems, no more will surface."

**probe-report.md structure**

\`\`\`markdown
# Probe Report: <change-name>

> Generated: <timestamp>
> Summary: <N questions, M decisions, K open assumptions>

## Confirmed decisions

### Scope & intent
- **Question**: ...
- **AI recommendation**: ... (evidence: <file:line | "general assumption">)
- **User confirmation**: ...

### Impact
...(same format)

### Design
...(same format)

### Success criteria
...(same format)

## Open assumptions [NEEDS CLARIFICATION]

These are assumptions AI made without confirmation; they will be carried explicitly into artifacts:

- [ ] \`[ASSUMED]\` <assumption> — affects: <which artifact / section>
- [ ] \`[ASSUMED]\` ...

## Suggested next step

- [ ] Run \`/opsx:propose <change-name>\` to generate artifacts (it will read this report)
\`\`\`

**Output (on finish)**
\`\`\`
## Probe complete: <change-name>

Asked N questions · confirmed M decisions · K open assumptions
Report: openspec/changes/<name>/probe-report.md

Next: run /opsx:propose <name> — it will read this report and carry the open
assumptions into proposal.md.
\`\`\`

**Guardrails**
- Read before you ask; only ask what the codebase cannot answer
- One question per turn, each with an evidence-backed recommendation
- L1 & L2 always covered; L6 always output
- Never bury an assumption — every guess becomes an \`[ASSUMED]\` line
- Respect "enough/start"; record remaining items as open assumptions and finish`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxProbeCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Probe',
    description: 'Probe a change before proposing — grilling over a 6-layer question tree (Experimental)',
    category: 'Workflow',
    tags: ['workflow', 'planning', 'experimental'],
    content: `Probe a change before \`/opsx:propose\`: depth-first grilling over a 6-layer question tree, producing \`openspec/changes/<name>/probe-report.md\`.

Follow the openspec-probe skill. Start by reading context:
\`\`\`bash
openspec status --json
openspec instructions --json
\`\`\`

**Input**: A change name (kebab-case) after \`/opsx:probe\`, OR a description to derive one from.`,
  };
}
