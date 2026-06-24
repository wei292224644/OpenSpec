# Apply TDD 纪律实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 `/opsx:apply` 的实现循环加入轻量 TDD 纪律——通过 `tddMode` 配置项控制强度（`strict` / `default` / `off`），经由 `openspec instructions apply --json` 暴露给 skill，skill 据此运行"写失败测试 → 确认 RED → 最小实现 → 绿"微循环，并把"任务完成"重定义为"其闭合的 scenario 测试绿"。

**Architecture:** 三层改动逐层堆叠——

1. **配置层**：`openspec/config.yaml` 新增 `tddMode: strict | default | off`，由 `src/core/project-config.ts` 的 `ProjectConfigSchema` 和 `readProjectConfig()` 解析（与现有 `schema`/`context`/`rules` 字段完全同模式）。
2. **数据管道层**：`generateApplyInstructions()` 读取 `projectConfig.tddMode`（默认 `"default"`），注入进 `ApplyInstructions` 返回对象（新增 `tddMode` 字段），`printApplyInstructionsText()` 文本端也显示该值。
3. **Skill 层**：`src/core/templates/workflows/apply-change.ts` 重写 step 6（TDD 微循环）与完成输出模板（打印真实测试结果替换凭空 "N/N ✓"），并在 guardrails 加入 TDD 相关项。Hash 奇偶校验测试随之更新。

**Tech Stack:** TypeScript (ESM)、Zod、Vitest（`pnpm test` / `pnpm exec vitest run <file>`）、`yaml` 解析、现有 `src/core/templates/workflows/*` 和 `src/commands/workflow/*` 模式

---

## 文件结构

| 文件 | 改动类型 | 职责 |
|------|---------|------|
| `src/core/project-config.ts` | 修改 | 新增 `tddMode` 字段到 `ProjectConfigSchema` 及 `readProjectConfig()` 解析逻辑 |
| `src/commands/workflow/shared.ts` | 修改 | `ApplyInstructions` 接口新增 `tddMode` 字段 |
| `src/commands/workflow/instructions.ts` | 修改 | `generateApplyInstructions()` 读取并传递 `tddMode`；`printApplyInstructionsText()` 显示之 |
| `src/core/templates/workflows/apply-change.ts` | 修改 | 重写 step 6 TDD 微循环、完成模板、guardrails |
| `test/core/project-config.test.ts` | 修改 | 新增 `tddMode` 解析的测试用例 |
| `test/commands/artifact-workflow.test.ts` | 修改 | 新增 `tddMode` 在 apply instructions JSON 中出现的端到端测试 |
| `test/core/templates/skill-templates-parity.test.ts` | 修改 | 新增 `tddMode` 语义断言；更新 hash（在实现后运行测试获得新 hash） |

---

## Task 1：`ProjectConfig` 新增 `tddMode` 字段

**Files:**
- Modify: `src/core/project-config.ts`
- Test: `test/core/project-config.test.ts`

- [ ] **Step 1: 写失败测试——`tddMode` 解析**

在 `test/core/project-config.test.ts` 的 `describe('readProjectConfig')` → `describe('resilient parsing')` 块末尾追加：

```typescript
describe('tddMode field', () => {
  it('should parse tddMode: strict', () => {
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.yaml'),
      'schema: spec-driven\ntddMode: strict\n'
    );

    const config = readProjectConfig(tempDir);

    expect(config?.tddMode).toBe('strict');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should parse tddMode: default', () => {
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.yaml'),
      'schema: spec-driven\ntddMode: default\n'
    );

    const config = readProjectConfig(tempDir);

    expect(config?.tddMode).toBe('default');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should parse tddMode: off', () => {
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.yaml'),
      'schema: spec-driven\ntddMode: off\n'
    );

    const config = readProjectConfig(tempDir);

    expect(config?.tddMode).toBe('off');
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should warn and omit tddMode when value is invalid', () => {
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.yaml'),
      'schema: spec-driven\ntddMode: aggressive\n'
    );

    const config = readProjectConfig(tempDir);

    expect(config?.tddMode).toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('tddMode')
    );
  });

  it('should be omitted (not present) when not set in config', () => {
    const configDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.yaml'),
      'schema: spec-driven\n'
    );

    const config = readProjectConfig(tempDir);

    expect('tddMode' in (config ?? {})).toBe(false);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

```bash
pnpm exec vitest run test/core/project-config.test.ts -t "tddMode"
```

Expected: FAIL with `TypeError: Cannot read properties of undefined` 或 `expect(received).toBe(expected)` — `tddMode` 字段不存在。

- [ ] **Step 3: 实现——`ProjectConfigSchema` 新增 `tddMode`**

在 `src/core/project-config.ts` 的 `ProjectConfigSchema` 内，`rules` 字段定义之后追加：

```typescript
// TDD discipline level for the apply phase
tddMode: z
  .enum(['strict', 'default', 'off'])
  .optional()
  .describe("TDD discipline level: 'strict' | 'default' | 'off'"),
```

- [ ] **Step 4: 实现——`readProjectConfig()` 解析 `tddMode`**

在 `src/core/project-config.ts` 的 `readProjectConfig()` 内，`rules` 解析块（约 line 117–152）之后，在 `return Object.keys(config).length > 0 ...` 之前追加：

```typescript
// Parse tddMode field
if (raw.tddMode !== undefined) {
  const tddModeField = z.enum(['strict', 'default', 'off']);
  const tddResult = tddModeField.safeParse(raw.tddMode);
  if (tddResult.success) {
    config.tddMode = tddResult.data;
  } else {
    console.warn(
      `Invalid 'tddMode' in config (must be 'strict', 'default', or 'off'), ignoring`
    );
  }
}
```

- [ ] **Step 5: 运行测试确认 GREEN**

```bash
pnpm exec vitest run test/core/project-config.test.ts -t "tddMode"
```

Expected: PASS，5 条用例全绿，`consoleWarnSpy` 在无效值用例中被调用一次且含 `'tddMode'`。

- [ ] **Step 6: Commit**

```bash
git add src/core/project-config.ts test/core/project-config.test.ts
git commit -m "feat(config): add tddMode field to ProjectConfig schema"
```

---

## Task 2：`ApplyInstructions` 接口与数据管道

**Files:**
- Modify: `src/commands/workflow/shared.ts:25-40`（`ApplyInstructions` 接口）
- Modify: `src/commands/workflow/instructions.ts`（`generateApplyInstructions` + `printApplyInstructionsText`）
- Test: `test/commands/artifact-workflow.test.ts`（新增 `describe` 块）

- [ ] **Step 1: 写失败测试——`tddMode` 出现在 apply instructions JSON**

在 `test/commands/artifact-workflow.test.ts` 的 `describe('instructions apply command')` 块末尾追加（在最后一个 `it(...)` 之后，`describe` 闭合括号之前）：

```typescript
it('includes tddMode: strict in apply instructions JSON when set in config.yaml', async () => {
  await createTestChange('tdd-strict', ['proposal', 'design', 'specs', 'tasks']);
  await fs.mkdir(path.join(tempDir, 'openspec'), { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'openspec', 'config.yaml'),
    'schema: spec-driven\ntddMode: strict\n'
  );

  const result = await runCLI(
    ['instructions', 'apply', '--change', 'tdd-strict', '--json'],
    { cwd: tempDir }
  );

  expect(result.exitCode).toBe(0);
  const json = JSON.parse(result.stdout);
  expect(json.tddMode).toBe('strict');
});

it('defaults tddMode to "default" in apply instructions JSON when not set', async () => {
  await createTestChange('tdd-default', ['proposal', 'design', 'specs', 'tasks']);

  const result = await runCLI(
    ['instructions', 'apply', '--change', 'tdd-default', '--json'],
    { cwd: tempDir }
  );

  expect(result.exitCode).toBe(0);
  const json = JSON.parse(result.stdout);
  expect(json.tddMode).toBe('default');
});

it('includes tddMode: off in apply instructions JSON when set in config.yaml', async () => {
  await createTestChange('tdd-off', ['proposal', 'design', 'specs', 'tasks']);
  await fs.mkdir(path.join(tempDir, 'openspec'), { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'openspec', 'config.yaml'),
    'schema: spec-driven\ntddMode: off\n'
  );

  const result = await runCLI(
    ['instructions', 'apply', '--change', 'tdd-off', '--json'],
    { cwd: tempDir }
  );

  expect(result.exitCode).toBe(0);
  const json = JSON.parse(result.stdout);
  expect(json.tddMode).toBe('off');
});
```

- [ ] **Step 2: 运行测试确认 RED**

```bash
pnpm run build && pnpm exec vitest run test/commands/artifact-workflow.test.ts -t "tddMode"
```

Expected: FAIL — `json.tddMode` 为 `undefined`，断言失败。

- [ ] **Step 3: 实现——`ApplyInstructions` 接口新增 `tddMode`**

打开 `src/commands/workflow/shared.ts`，在 `ApplyInstructions` 接口（约 line 25）的 `instruction: string;` 之后追加：

```typescript
/** TDD discipline level for this apply session. Defaults to 'default' if not in config. */
tddMode: 'strict' | 'default' | 'off';
```

- [ ] **Step 4: 实现——`generateApplyInstructions()` 读取并传递 `tddMode`**

打开 `src/commands/workflow/instructions.ts`：

**4a. 新增 import**（在现有 import 块末尾，`getChangeDir` import 之后）：

```typescript
import { readProjectConfig } from '../../core/project-config.js';
```

**4b. 在 `generateApplyInstructions()` 函数体内**，`const applyConfig = schema.apply;` 之后、`const requiredArtifactIds = ...` 之前，插入：

```typescript
// Read tddMode from project config (default: 'default')
const projectConfig = readProjectConfig(projectRoot);
const tddMode = projectConfig?.tddMode ?? 'default';
```

**4c. 在 `return { ... }` 语句内**，`instruction,` 之后追加：

```typescript
tddMode,
```

- [ ] **Step 5: 实现——`printApplyInstructionsText()` 显示 `tddMode`**

打开 `src/commands/workflow/instructions.ts` 的 `printApplyInstructionsText()` 函数：

在解构赋值中追加 `tddMode`：

```typescript
const { changeName, schemaName, initiative, contextFiles, progress, tasks, state, missingArtifacts, instruction, tddMode } = instructions;
```

在 `console.log(`Schema: ${schemaName}`);` 之后插入：

```typescript
console.log(`TDD Mode: ${tddMode}`);
```

- [ ] **Step 6: 运行测试确认 GREEN**

```bash
pnpm run build && pnpm exec vitest run test/commands/artifact-workflow.test.ts -t "tddMode"
```

Expected: PASS，3 条新用例全绿。

- [ ] **Step 7: 运行全量 artifact-workflow 测试确认无回归**

```bash
pnpm exec vitest run test/commands/artifact-workflow.test.ts
```

Expected: PASS，所有既有用例仍绿。

- [ ] **Step 8: Commit**

```bash
git add src/commands/workflow/shared.ts src/commands/workflow/instructions.ts test/commands/artifact-workflow.test.ts
git commit -m "feat(apply): thread tddMode through ApplyInstructions pipeline"
```

---

## Task 3：重写 Apply Skill 模板（TDD 微循环 + 真实完成输出）

**Files:**
- Modify: `src/core/templates/workflows/apply-change.ts`
- Modify: `test/core/templates/skill-templates-parity.test.ts`

- [ ] **Step 1: 写失败测试——语义断言（TDD 驱动模板改写）**

打开 `test/core/templates/skill-templates-parity.test.ts`，在最后一个 `describe` 块内或文件末尾追加一个新测试：

```typescript
describe('apply skill template TDD content', () => {
  it('skill template instructions mention tddMode', () => {
    const template = getApplyChangeSkillTemplate();
    expect(template.instructions).toContain('tddMode');
  });

  it('command template content mentions tddMode', () => {
    const template = getOpsxApplyCommandTemplate();
    expect(template.content).toContain('tddMode');
  });

  it('skill template instructions describe scenario-to-test mapping', () => {
    const template = getApplyChangeSkillTemplate();
    expect(template.instructions).toContain('scenario');
    expect(template.instructions).toContain('RED');
    expect(template.instructions).toContain('GREEN');
  });

  it('skill template completion output does not claim hardcoded task count', () => {
    const template = getApplyChangeSkillTemplate();
    // Must not contain the old fake "7/7 tasks complete ✓" pattern
    expect(template.instructions).not.toMatch(/\d\/\d tasks complete ✓/);
  });
});
```

- [ ] **Step 2: 运行测试确认 RED**

```bash
pnpm exec vitest run test/core/templates/skill-templates-parity.test.ts -t "apply skill template TDD"
```

Expected: FAIL — 现有 instructions 不含 `tddMode`、`RED`、`GREEN`；完成输出模板含 `7/7 tasks complete ✓`。

- [ ] **Step 3: 重写 `getApplyChangeSkillTemplate()` 的 `instructions` 字段**

打开 `src/core/templates/workflows/apply-change.ts`，找到 `getApplyChangeSkillTemplate()` 函数（line 9–165），替换 `instructions` 字段的全部内容（反引号内）为以下文本（保留其他字段 `name`/`description`/`license`/`compatibility`/`metadata` 不变）：

````typescript
instructions: `Implement tasks from an OpenSpec change with TDD discipline.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run \`openspec list --json\` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., \`/opsx:apply <other>\`).

2. **Check status to understand the schema**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used (e.g., "spec-driven")
   - \`planningHome\`, \`changeRoot\`, and \`actionContext\`: planning scope and edit constraints
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`

   This returns:
   - \`contextFiles\`: artifact ID -> array of concrete file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - \`tddMode\`: TDD discipline level — \`"strict"\` | \`"default"\` | \`"off"\`
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If \`state: "blocked"\` (missing artifacts): show message, suggest using openspec-continue-change
   - If \`state: "all_done"\`: congratulate, suggest archive
   - Otherwise: proceed to implementation

   **Workspace guard:** If status JSON reports \`actionContext.mode: "workspace-planning"\` and \`allowedEditRoots\` is empty, explain that full workspace apply is not supported in this slice. Treat linked repos and folders as read-only context, ask the user to select an affected area through an explicit implementation workflow, and STOP before editing files.

4. **Read context files**

   Read every file path listed under \`contextFiles\` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - TDD Mode: \`<tddMode>\`
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks with TDD discipline (loop until done or blocked)**

   **Interpret \`tddMode\`:**
   - \`"default"\`: closing tasks require their scenarios green; intermediate/non-scenario tasks need only code complete
   - \`"strict"\`: same as default, plus every delta scenario must be covered by a green test before the change is done
   - \`"off"\`: no test gates (document/spike projects)

   **Test runner detection (run once before the loop):**
   Check whether a test runner is available by looking for one of:
   - \`vitest.config.ts\` / \`vitest.config.js\`
   - \`jest.config.ts\` / \`jest.config.js\` / \`jest.config.mjs\`
   - \`mocha.opts\` / \`.mocharc.*\`
   - A \`"test"\` script in \`package.json\`
   If none found, announce: "No test runner detected — tddMode degraded to 'off'" and proceed without test gates for this session.

   **For each pending task:**

   1. **Map the task to scenarios**: Read the task description and the specs context files to identify which WHEN/THEN/AND scenarios this task advances.
   2. **Write failing tests** for any scenario that has no existing test yet:
      - Translate the scenario's WHEN/THEN/AND into a test assertion
      - Run the test and confirm it fails (RED) — do not proceed if it passes or errors with a setup problem
   3. **Write the minimal implementation** required to make the related tests pass
   4. **Run related tests**: confirm they are GREEN
   5. **(Optional) Refactor** while keeping all previously-green tests green
   6. **Mark task complete** using this rule:
      - **Closes a scenario** (this is the last task that implements scenario X): that scenario's tests MUST be GREEN before marking \`- [ ] → - [x]\`
      - **Partially advances a scenario** (more tasks remain that implement scenario X): mark done as soon as code is complete — tests may still be RED (legal WIP)
      - **Does not advance any scenario** (pure refactor / config / migration): no test gate — mark done when code is complete

   **"Closes a scenario" judgment:** After completing code changes, scan the remaining pending tasks. If no remaining task further implements scenario X, this task closes scenario X.

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - Test suite results (run the full test suite and report actual output)
   - **Change-level coverage gate** (depends on \`tddMode\`):
     - \`"default"\`: every scenario that **has** a test must be GREEN. Scenarios with **no** test → list them as a warning (does NOT block reporting all-done).
     - \`"strict"\`: **every** delta scenario must have a GREEN test. If any delta scenario lacks a test, or has a RED test → **STOP. Do NOT report all-done and do NOT suggest archive.** List the uncovered/red scenarios and ask the user to add tests or record a waiver. The \`no-test\` escape is closed in strict mode.
     - \`"off"\`: skip this gate entirely.
   - If all done (and the coverage gate above passes): suggest archive
   - If paused: explain why and wait for guidance

**Output During Implementation**

\`\`\`
## Implementing: <change-name> (schema: <schema-name>, tddMode: <tddMode>)

Working on task 3/7: <task description>
  Scenarios: <scenario names this task advances>
  Writing test for: <scenario name> → RED
  Implementing...
  Tests: GREEN
✓ Task complete

Working on task 4/7: <task description>
  (No scenario closed by this task — marking done on code complete)
✓ Task complete
\`\`\`

**Output On Completion**

\`\`\`
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**TDD Mode:** <tddMode>
**Progress:** N/M tasks complete

### Completed This Session
- [x] Task 1
- [x] Task 2
...

### Test Results
<paste actual test runner output here>

All tasks complete! Ready to archive this change.
\`\`\`

**Output On Pause (Issue Encountered)**

\`\`\`
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**TDD Mode:** <tddMode>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
\`\`\`

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- Read \`tddMode\` from apply instructions JSON before the loop; respect it throughout
- Test runner detection: degrade to \`tddMode: "off"\` if no runner found, announce it
- For tasks that close a scenario: do NOT mark \`- [x]\` until that scenario's tests are GREEN
- For tasks that partially advance a scenario: RED tests are legal — mark done when code is complete
- For tasks with no scenario: no test required — mark done when code is complete
- Change-level gate (\`default\`): a covered scenario may not stay RED at close; uncovered scenarios warn but do not block
- Change-level gate (\`strict\`): every delta scenario must have a GREEN test — if any is missing or RED, STOP, do not report all-done, do not suggest archive; \`no-test\` escape requires a recorded waiver
- Completion output MUST include actual test runner output, not a hardcoded claim
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Pause on errors, blockers, or unclear requirements — do not guess
- Use contextFiles from CLI output, do not assume specific file names

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts — not phase-locked, work fluidly`,
````

- [ ] **Step 4: 单独改写 `getOpsxApplyCommandTemplate()` 的 `content` 字段**

> ⚠️ **不要直接复用 Step 3 的 skill 文本。** command 模板与 skill 模板**故意不同**：command 面向斜杠命令场景，用 `/opsx:continue`、`/opsx:archive`、`/opsx:apply add-auth` 这类斜杠引用；skill 用 skill 名（如 `openspec-continue-change`）。两者要的是**同一套 TDD 逻辑**，不是逐字相同。照抄 skill 文本会让 command 去叫 skill 名、丢掉斜杠命令的参数示例与归档提示，是内容退化。

找到 `getOpsxApplyCommandTemplate()` 函数（line 167–322），用下面的文本替换 `content` 字段（`content:` 反引号内的全部内容），保留其他字段 `name`/`description`/`category`/`tags` 不变。下面文本已对 command 场景做差异化处理（粗体标出的是与 Step 3 skill 文本的有意差异）：

````typescript
content: `Implement tasks from an OpenSpec change with TDD discipline.

**Input**: Optionally specify a change name (e.g., \`/opsx:apply add-auth\`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run \`openspec list --json\` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., \`/opsx:apply <other>\`).

2. **Check status to understand the schema**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used (e.g., "spec-driven")
   - \`planningHome\`, \`changeRoot\`, and \`actionContext\`: planning scope and edit constraints
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`

   This returns:
   - \`contextFiles\`: artifact ID -> array of concrete file paths (varies by schema)
   - \`tddMode\`: TDD discipline level — \`"strict"\` | \`"default"\` | \`"off"\`
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If \`state: "blocked"\` (missing artifacts): show message, suggest using \`/opsx:continue\`
   - If \`state: "all_done"\`: congratulate, suggest archive
   - Otherwise: proceed to implementation

   **Workspace guard:** If status JSON reports \`actionContext.mode: "workspace-planning"\` and \`allowedEditRoots\` is empty, explain that full workspace apply is not supported in this slice. Treat linked repos and folders as read-only context, ask the user to select an affected area through an explicit implementation workflow, and STOP before editing files.

4. **Read context files**

   Read every file path listed under \`contextFiles\` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - TDD Mode: \`<tddMode>\`
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks with TDD discipline (loop until done or blocked)**

   **Interpret \`tddMode\`:**
   - \`"default"\`: closing tasks require their scenarios green; intermediate/non-scenario tasks need only code complete
   - \`"strict"\`: same as default, plus every delta scenario must be covered by a green test before the change is done
   - \`"off"\`: no test gates (document/spike projects)

   **Test runner detection (run once before the loop):**
   Check whether a test runner is available by looking for one of:
   - \`vitest.config.ts\` / \`vitest.config.js\`
   - \`jest.config.ts\` / \`jest.config.js\` / \`jest.config.mjs\`
   - \`mocha.opts\` / \`.mocharc.*\`
   - A \`"test"\` script in \`package.json\`
   If none found, announce: "No test runner detected — tddMode degraded to 'off'" and proceed without test gates for this session.

   **For each pending task:**

   1. **Map the task to scenarios**: Read the task description and the specs context files to identify which WHEN/THEN/AND scenarios this task advances.
   2. **Write failing tests** for any scenario that has no existing test yet:
      - Translate the scenario's WHEN/THEN/AND into a test assertion
      - Run the test and confirm it fails (RED) — do not proceed if it passes or errors with a setup problem
   3. **Write the minimal implementation** required to make the related tests pass
   4. **Run related tests**: confirm they are GREEN
   5. **(Optional) Refactor** while keeping all previously-green tests green
   6. **Mark task complete** using this rule:
      - **Closes a scenario** (this is the last task that implements scenario X): that scenario's tests MUST be GREEN before marking \`- [ ] → - [x]\`
      - **Partially advances a scenario** (more tasks remain that implement scenario X): mark done as soon as code is complete — tests may still be RED (legal WIP)
      - **Does not advance any scenario** (pure refactor / config / migration): no test gate — mark done when code is complete

   **"Closes a scenario" judgment:** After completing code changes, scan the remaining pending tasks. If no remaining task further implements scenario X, this task closes scenario X.

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - Test suite results (run the full test suite and report actual output)
   - **Change-level coverage gate** (depends on \`tddMode\`):
     - \`"default"\`: every scenario that **has** a test must be GREEN. Scenarios with **no** test → list them as a warning (does NOT block reporting all-done).
     - \`"strict"\`: **every** delta scenario must have a GREEN test. If any delta scenario lacks a test, or has a RED test → **STOP. Do NOT report all-done and do NOT suggest archive.** List the uncovered/red scenarios and ask the user to add tests or record a waiver.
     - \`"off"\`: skip this gate entirely.
   - If all done (and the coverage gate passes): suggest archive with \`/opsx:archive\`
   - If paused: explain why and wait for guidance

**Output During Implementation**

\`\`\`
## Implementing: <change-name> (schema: <schema-name>, tddMode: <tddMode>)

Working on task 3/7: <task description>
  Scenarios: <scenario names this task advances>
  Writing test for: <scenario name> → RED
  Implementing...
  Tests: GREEN
✓ Task complete

Working on task 4/7: <task description>
  (No scenario closed by this task — marking done on code complete)
✓ Task complete
\`\`\`

**Output On Completion**

\`\`\`
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**TDD Mode:** <tddMode>
**Progress:** N/M tasks complete

### Completed This Session
- [x] Task 1
- [x] Task 2
...

### Test Results
<paste actual test runner output here>

All tasks complete! You can archive this change with \`/opsx:archive\`.
\`\`\`

**Output On Pause (Issue Encountered)**

\`\`\`
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**TDD Mode:** <tddMode>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
\`\`\`

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- Read \`tddMode\` from apply instructions JSON before the loop; respect it throughout
- Test runner detection: degrade to \`tddMode: "off"\` if no runner found, announce it
- For tasks that close a scenario: do NOT mark \`- [x]\` until that scenario's tests are GREEN
- For tasks that partially advance a scenario: RED tests are legal — mark done when code is complete
- For tasks with no scenario: no test required — mark done when code is complete
- Change-level gate (\`default\`): a covered scenario may not stay RED at close; uncovered scenarios warn but do not block
- Change-level gate (\`strict\`): every delta scenario must have a GREEN test — if any is missing or RED, STOP, do not report all-done, do not suggest archive
- Completion output MUST include actual test runner output, not a hardcoded claim
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Pause on errors, blockers, or unclear requirements — do not guess
- Use contextFiles from CLI output, do not assume specific file names

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts — not phase-locked, work fluidly`,
````

**与 Step 3 skill 文本的有意差异（务必保留）：**
- Input 行带斜杠命令示例 `(e.g., \`/opsx:apply add-auth\`)`
- blocked 状态 suggest \`/opsx:continue\`（skill 用 \`openspec-continue-change\`）
- Step 3 的 contextFiles 注释用简短的 `(varies by schema)`（skill 用长版枚举）
- 完成输出用 "archive this change with \`/opsx:archive\`"（skill 用 "Ready to archive this change."）

- [ ] **Step 5: 运行语义断言测试确认 GREEN**

```bash
pnpm exec vitest run test/core/templates/skill-templates-parity.test.ts -t "apply skill template TDD"
```

Expected: PASS — 4 条语义断言全绿。

- [ ] **Step 6: 运行 hash 奇偶校验测试，获取新 hash**

```bash
pnpm exec vitest run test/core/templates/skill-templates-parity.test.ts
```

Expected: FAIL — `preserves all template function payloads exactly` 与 `preserves generated skill file content exactly` 测试失败，错误信息中含有新 hash 值（格式如 `received: { getApplyChangeSkillTemplate: '<new-hash>', ... }`）。

**记录输出中出现的新 hash 值。**

- [ ] **Step 7: 更新 `EXPECTED_FUNCTION_HASHES` 和 `EXPECTED_GENERATED_SKILL_CONTENT_HASHES`**

在 `test/core/templates/skill-templates-parity.test.ts` 中：
- 找到 `EXPECTED_FUNCTION_HASHES` 对象（约 line 32–56），更新 `getApplyChangeSkillTemplate` 和 `getOpsxApplyCommandTemplate` 两条的 hash 为 Step 6 输出的新值。
- 找到 `EXPECTED_GENERATED_SKILL_CONTENT_HASHES` 对象（约 line 58–70），更新 `'openspec-apply-change'` 条的 hash。

- [ ] **Step 8: 运行 hash 奇偶校验测试确认 GREEN**

```bash
pnpm exec vitest run test/core/templates/skill-templates-parity.test.ts
```

Expected: PASS — 所有测试（语义断言 + hash 奇偶校验）全绿。

- [ ] **Step 9: 运行全量测试套件确认无回归**

```bash
pnpm run build && pnpm test
```

Expected: PASS — 全部测试绿。

- [ ] **Step 10: Commit**

```bash
git add src/core/templates/workflows/apply-change.ts test/core/templates/skill-templates-parity.test.ts
git commit -m "feat(apply): rewrite step 6 with TDD micro-cycle and real test output"
```

---

## Self-Review

### Spec 覆盖核查

| 设计决策点（spec 第 3 节）| 计划覆盖情况 |
|---|---|
| 落点：apply 的 step 6 实现循环 | Task 3 重写 step 6 ✓ |
| 轻 TDD 默认，schema 可调 | Task 1 `tddMode` 字段，Task 2 数据管道 ✓ |
| "任务 done" 重定义：测试存在且绿 | Task 3 step 6 规则："closes a scenario → GREEN 才 -[x]" ✓ |
| 不假装 test-first 时序 | Task 3 guardrails 明确不要求时序 ✓ |
| 降级：无测试运行器则退 off | Task 3 "Test runner detection" 段落 ✓ |
| 完成模板打印真实测试结果 | Task 3 completion output 含 "paste actual test runner output" ✓ |
| scenario ↔ task 多对多（闭合判定） | Task 3 "Closes a scenario judgment" 段落 ✓ |
| change 级兜底门（strict） | Task 3 step 7 "tddMode: strict" 收尾检查 ✓ |

### Placeholder 扫描

全计划无 "TBD" / "TODO" / "implement later"。每个 Step 含具体代码或命令。

### 类型一致性核查

- `tddMode` 类型在 `ProjectConfigSchema`（Zod `enum`）、`ProjectConfig`（TypeScript 推断）、`ApplyInstructions`（手写联合类型）三处均为 `'strict' | 'default' | 'off'`，互相一致。
- `printApplyInstructionsText()` 解构时新增 `tddMode` 与接口同步，不会产生类型错误。

---

## 执行选项

计划已保存至 `docs/superpowers/plans/2026-06-24-opsx-apply-tdd.md`。两种执行方式：

**1. Subagent-Driven（推荐）** — 每个 Task 派一个新子 agent，Tasks 间审核，快速迭代

**2. Inline Execution** — 在当前会话用 executing-plans 执行，含检查点
