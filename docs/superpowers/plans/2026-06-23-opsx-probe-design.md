# OPSX Probe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 OpenSpec 新增可选的前置对齐 skill `/opsx:probe`——用"问题树 + grilling 交互"在 propose 之前把需求/范围/假设挖清楚，产出持久化的 `probe-report.md`；并改造 `/opsx:propose` 在检测到该报告时读取融合（无则软提示，不打动量）。

**Architecture:** probe 是**纯 skill**（与 `explore` 同构），不含核心代码、不新增 CLI `instructions` 命令、不新增 schema。它复用现有 `openspec status/instructions --json` 读取上下文，用 `openspec new change <name>` 落出 change 目录，并把报告写到 `openspec/changes/<name>/probe-report.md`。propose 的改动同样只在其 **skill/command 模板字符串**里加"检测并读取 probe-report"的指令——OpenSpec 把 skill 当 prompt，prompt 内容不做单元测试（与 explore/propose 现状一致），因此本 plan 的可测面是 **skill 注册（数量/名称）** 与 **整体构建**。

**与现有架构同构（非新增范式）：** 复刻 `constitution`/`analyze` 刚落地时的注册路径——**只动 `skill-templates.ts`（re-export）+ `skill-generation.ts`（skill 数组 + command 数组）+ 对应计数测试**。constitution/analyze **没有**改 `profiles.ts` 的 `ALL_WORKFLOWS`（其测试仍断言 11），probe **照此**：不进 `ALL_WORKFLOWS`、不改 `profiles.test.ts`，保持与已落地 opsx 扩展 skill 完全一致的注册面。

**Tech Stack:** TypeScript (ESM)、Vitest、现有 `src/core/templates/workflows/*` 模式（参考 `explore.ts`、`propose.ts`）

## Global Constraints

- probe 是**可选前置阶段**：`explore → probe → propose → apply → verify → archive`
- probe **不打动量**：propose 无 `probe-report.md` 时仅输出一行软提示，照常继续
- 产出 = `openspec/changes/<name>/probe-report.md`（持久化，跨会话/抗压缩）
- 交互 = grilling 风格：**一次一问**、**推荐答案须附证据**（代码库证据或显式标注假设）、**代码库优先**（能读则读不问）、**深度优先**、relentless 但尊重"够了/默认"
- 问题树 = 6 层导航地图（L1 范围 / L2 影响 / L3 设计 / L4 失败 / L5 成功 / L6 开放假设）；L1、L2 必覆盖，L3–L5 按复杂度，L6 始终输出
- 停止条件 = 无强制；问题自然耗尽或用户喊停
- 与 propose 融合的**核心约束**：L6 `[ASSUMED]` 开放假设必须**显式**进入 `proposal.md` 的 `## Open Assumptions`——AI 可假设，但不得藏假设
- **不引入**：brainstorming HARD-GATE、全局 TDD Iron Law、subagent 编排、SpecKit 完整阶段 ceremony（见 spec 第 9 节）
- 注册面与 constitution/analyze 一致：**不动** `profiles.ts` / `config.ts` 的 workflow 列表
- 与 `/opsx:constitution`、`/opsx:analyze` 独立实现（本 plan 仅 probe）

---

## File Structure

| 文件 | 职责 |
| --- | --- |
| `src/core/templates/workflows/probe.ts` | `/opsx:probe` skill + command 模板（grilling 规则、6 层树、报告结构、停止条件） |
| `src/core/templates/skill-templates.ts` | re-export `getProbeSkillTemplate` / `getOpsxProbeCommandTemplate` |
| `src/core/shared/skill-generation.ts` | 注册 `probe` 的 skill（dirName `openspec-probe`）与 command（id `probe`） |
| `src/core/templates/workflows/propose.ts` | skill + command 模板：检测 `probe-report.md`，软提示 / 读取融合 |
| `test/core/shared/skill-generation.test.ts` | skill 与 command 计数 13→14 + 名称/ID 断言 |

> 不新增：CLI `instructions` 命令（probe 无需 CLI 计算）、schema、core 模块。`probe-report.md` 是普通 markdown，由 skill 写、由 propose 读，无需 Zod/loader。

---

### Task 1: `/opsx:probe` workflow skill + 注册

**Files:**

- Create: `src/core/templates/workflows/probe.ts`
- Modify: `src/core/templates/skill-templates.ts`
- Modify: `src/core/shared/skill-generation.ts`
- Modify: `test/core/shared/skill-generation.test.ts`（skill 与 command 计数 13→14）

**Interfaces:**

- Consumes: 现有 `SkillTemplate` / `CommandTemplate` 类型（`./types.js`）；运行时 skill 调用 `openspec status --json`、`openspec instructions --json`、`openspec new change <name>`
- Produces:
  ```typescript
  export function getProbeSkillTemplate(): SkillTemplate
  export function getOpsxProbeCommandTemplate(): CommandTemplate
  ```
  注册条目：`{ template: getProbeSkillTemplate(), dirName: 'openspec-probe', workflowId: 'probe' }`、`{ template: getOpsxProbeCommandTemplate(), id: 'probe' }`

> probe 是纯 prompt skill（与 `explore` 同构）。唯一的机械可测面 = 它被正确注册（计数 + 名称）。prompt 内容本身不做单元测试，与 `explore`/`propose` 现状一致。

- [ ] **Step 1: Write the failing test**

在 `test/core/shared/skill-generation.test.ts` 中，把两处计数 13 改为 14，并各加一条名称/ID 断言：

```typescript
// getSkillTemplates 块
it('should return all 14 skill templates', () => {
  const templates = getSkillTemplates();
  expect(templates).toHaveLength(14);
});
// 在现有 dirNames 断言旁追加：
expect(dirNames).toContain('openspec-probe');

// getCommandTemplates 块
it('should return all 14 command templates', () => {
  const templates = getCommandTemplates();
  expect(templates).toHaveLength(14);
});
// 在现有 ids 断言旁追加：
expect(ids).toContain('probe');
```

> 注意：文件里"13"出现在 skill 块与 command 块两处描述字符串 + 两处 `toHaveLength(13)`。四处都要改为 14（两处 `it(...)` 标题 + 两处断言）。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts`
Expected: FAIL — `expected length 13 to be 14` 且 `dirNames` 不含 `openspec-probe`

- [ ] **Step 3: Create `src/core/templates/workflows/probe.ts`**

```typescript
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
```

- [ ] **Step 4: Register in `skill-templates.ts`**

在 `src/core/templates/skill-templates.ts` 末尾（紧随 analyze 那行）追加：

```typescript
export { getProbeSkillTemplate, getOpsxProbeCommandTemplate } from './workflows/probe.js';
```

- [ ] **Step 5: Register in `skill-generation.ts`**

在 `src/core/shared/skill-generation.ts` 三处修改：

```typescript
// (a) import 块追加：
  getProbeSkillTemplate,
  getOpsxProbeCommandTemplate,

// (b) getSkillTemplates() 的 all 数组末尾追加：
    { template: getProbeSkillTemplate(), dirName: 'openspec-probe', workflowId: 'probe' },

// (c) getCommandTemplates() 的 all 数组末尾追加：
    { template: getOpsxProbeCommandTemplate(), id: 'probe' },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts`
Expected: PASS — 14 skills / 14 commands, names include `openspec-probe` / `probe`

- [ ] **Step 7: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/core/templates/workflows/probe.ts src/core/templates/skill-templates.ts src/core/shared/skill-generation.ts test/core/shared/skill-generation.test.ts
git commit -m "feat: add opsx probe workflow skill"
```

---

### Task 2: `/opsx:propose` 读取融合 probe-report.md

**Files:**

- Modify: `src/core/templates/workflows/propose.ts`（skill 与 command 两个模板字符串，平行修改）

**Interfaces:**

- Consumes: `openspec status --change <name> --json` 已返回的 `changeRoot`（用于定位 `<changeRoot>/probe-report.md`）
- Produces: 无新导出。propose 的 prompt 行为变化：检测报告 → 软提示（无）/ 读取融合（有）

> propose 是 skill prompt，内容改动不走单元测试（与现状一致）。本任务的验证 = 构建通过 + 既有 propose/skill 测试不破 + 人工核对两个模板字符串都改到。两个模板字符串**必须同步修改**（type-consistency：skill 与 command 行为一致）。

- [ ] **Step 1: 确认基线测试通过（无新失败）**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts`
Expected: PASS（Task 1 之后应为 14/14）

- [ ] **Step 2: 在 skill 模板里加"检测 probe-report"**

在 `getOpsxProposeSkillTemplate()` 的 step 2（`openspec new change`）与 step 3 之间插入一个新步骤；同时改写 step 2 使其在已有 change + 报告时不重复 scaffold。把现有 step 2 文本：

```
2. **Create the change directory**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   This creates a scaffolded change in the planning home resolved by the CLI with \`.openspec.yaml\`.
```

替换为：

```
2. **Create or reuse the change directory**
   \`\`\`bash
   openspec new change "<name>"
   \`\`\`
   This creates a scaffolded change in the planning home resolved by the CLI with \`.openspec.yaml\`.
   If the change already exists (e.g. \`/opsx:probe\` scaffolded it), reuse it instead of recreating.

2b. **Check for a probe report**
   Run \`openspec status --change "<name>" --json\` and look for \`<changeRoot>/probe-report.md\`.
   - **If absent**: print one line and continue (momentum is NOT affected):
     > No probe-report.md found. For deeper design alignment you can run \`/opsx:probe <name>\` first.
   - **If present**: read it fully. Treat its "Confirmed decisions" as explicit input for every artifact. You MUST copy each \`[ASSUMED]\` open assumption verbatim into proposal.md's \`## Open Assumptions\` section. Never silently absorb an assumption — assumptions stay visible to the user.
```

- [ ] **Step 3: 在 Artifact Creation Guidelines 里加"开放假设必须可见"**

在 `getOpsxProposeSkillTemplate()` 的 `**Artifact Creation Guidelines**` 列表末尾追加一条：

```
- If a probe-report.md exists, proposal.md MUST contain a \`## Open Assumptions\` section listing every \`[ASSUMED]\` item from the report. Carrying assumptions forward visibly is required — do not drop or silently resolve them.
```

- [ ] **Step 4: 在 command 模板里做同样两处修改**

在 `getOpsxProposeCommandTemplate()` 中对应位置（step 2 / Artifact Creation Guidelines）应用与 Step 2、Step 3 完全相同的文本（command 与 skill 模板平行，必须一致）。

- [ ] **Step 5: Typecheck + 全量测试**

Run: `pnpm exec tsc --noEmit && pnpm exec vitest run`
Expected: no type errors；全绿（propose 改的是模板字符串，不应影响任何断言）

- [ ] **Step 6: 人工核对**

确认 `propose.ts` 中 **skill 与 command 两个模板**都包含字符串 `probe-report.md` 与 `## Open Assumptions`：

Run: `grep -c "probe-report.md" src/core/templates/workflows/propose.ts`
Expected: ≥ 2（skill + command 各一次以上）

Run: `grep -c "Open Assumptions" src/core/templates/workflows/propose.ts`
Expected: ≥ 2

- [ ] **Step 7: Commit**

```bash
git add src/core/templates/workflows/propose.ts
git commit -m "feat: propose reads probe-report.md (soft hint + assumption carry-through)"
```

---

### Task 3: 构建与回归验证

**Files:**

- 无改动（验证任务）

- [ ] **Step 1: 全量构建**

Run: `pnpm build`
Expected: 成功，无 TS 错误

- [ ] **Step 2: 全量测试**

Run: `pnpm exec vitest run`
Expected: 全绿（重点确认 `test/core/shared/skill-generation.test.ts` 14/14、`test/core/profiles.test.ts` 仍 11——probe 未进 ALL_WORKFLOWS，符合设计）

- [ ] **Step 3: 冒烟核对生成产物（可选）**

若仓库装了本地构建的 CLI，可生成 skill 文件确认 probe 出现：
Run: `node bin/openspec.js update` 后检查生成目录含 `openspec-probe`（具体路径以项目 delivery 配置为准）。
若无该流程则跳过——Step 1/2 已覆盖。

- [ ] **Step 4: Commit（若有未提交的产物/锁文件）**

```bash
git status
# 仅当存在应纳入的改动时：
git add -A && git commit -m "chore: verify opsx probe build"
```

---

## Self-Review

**1. Spec coverage**（对照 `2026-06-23-opsx-probe-design.md`）：
- §3 定位（explore→probe→propose）→ skill 描述 + command 文案 ✓
- §4 grilling 五条规则（一次一问 / 推荐附证据 / 代码库优先 / 深度优先 / relentless）→ Task 1 skill step 3 ✓
- §5 6 层树 + 覆盖规则 → Task 1 skill step 4 ✓
- §6 probe-report.md 结构 → Task 1 skill「structure」块 ✓
- §7 与 propose 集成（软提示 / 读取融合 / L6 假设进 proposal）→ Task 2 ✓
- §8 停止条件 → Task 1 skill「Stopping condition」✓
- §10 实现范围（probe.ts + 改 propose.ts；schema 可选未做）→ Task 1/2 ✓（schema 标记为可选，未纳入，符合"可选"）

**2. Placeholder scan**：无 TBD/TODO；所有 skill/command 内容、测试断言、编辑文本均为完整内容。`probe-report.md` 的 schema 在 spec 中即标"可选"，本 plan 明确不做（非占位，是范围决定）。

**3. Type consistency**：`getProbeSkillTemplate` / `getOpsxProbeCommandTemplate` 命名贯穿 probe.ts、skill-templates.ts re-export、skill-generation.ts import 与两个数组、测试名称（`openspec-probe` / `probe`）一致；返回类型 `SkillTemplate` / `CommandTemplate` 与现有 workflow 模块一致。propose 的 skill 与 command 两个模板字符串同步修改（Step 4 显式要求）。

> 一致性确认：probe **不进** `ALL_WORKFLOWS`（`profiles.test.ts` 仍断言 11），与 constitution/analyze 落地方式一致——本 plan 不改 `profiles.ts` / `profiles.test.ts`，避免与既有断言冲突。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-23-opsx-probe-design.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 每个 Task 派新 subagent，task 间审查，迭代快

**2. Inline Execution** — 本会话内按 executing-plans 批量执行，带检查点

**Which approach?**
