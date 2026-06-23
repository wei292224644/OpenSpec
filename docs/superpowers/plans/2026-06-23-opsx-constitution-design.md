# OPSX Constitution & Analyze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 OpenSpec 引入项目级 `openspec/constitution.md`、立法 skill `/opsx:constitution`、以及 pre-apply 只读审判 skill `/opsx:analyze`，使 plan 级原则可被独立核对、MUST 违反可阻塞（可记录豁免），且宪法内容运行时注入 propose/design 流程。

**Architecture:** 宪法是项目级文件（非 change artifact），模板与撰写规则放在 `schemas/constitution/` 包内目录，经 `openspec instructions constitution --json` 暴露（与 change artifact 的 `apply` 特例同模式）。`readConstitution()` 在 `generateInstructions()` 中与 `config.context` 并列注入。analyze 与 verify 一样以厚 skill 模板实现 read-only 报告；豁免存 `.openspec.yaml` 的 `waivers` 字段，由 Zod 校验。

**Tech Stack:** TypeScript (ESM)、Zod、Vitest、`yaml` 解析、现有 `src/core/templates/workflows/`* 模式、`schemas/spec-driven/` 参考

## Global Constraints

- 宪法载体：`openspec/constitution.md`（项目级，非 change artifact）
- 宪法范围：仅 plan 级（对照 proposal/design/specs/tasks），**不扫代码**
- 审判者：`/opsx:analyze`（独立 read-only，apply 前）
- 执法刚性：MUST 违反 → CRITICAL 阻塞；有 `.openspec.yaml` waiver → 降级 NOTE 并高声回显
- 注入方式：运行时注入（像 `context`），拒绝静态级联
- 职责边界：`constitution.md` 只放 plan 级 MUST/SHOULD；`config.yaml` `context` 只放描述性背景；`config.yaml` `rules` 只放 artifact 战术提示；代码机械规则归 linter/CI
- **不动**：`verify`（代码兑现 spec）、`archive`（纯归纳，不读代码、不验证宪法）
- 与 `/opsx:probe` 独立实现（本 plan 不含 probe）

---

## File Structure


| 文件                                                    | 职责                                        |
| ----------------------------------------------------- | ----------------------------------------- |
| `schemas/constitution/templates/constitution.md`      | 宪法骨架模板（编号条款占位）                            |
| `schemas/constitution/writing-rules.yaml`             | 撰写规则（MUST/判据/拒绝模糊/只收 plan 级）              |
| `src/core/constitution/loader.ts`                     | 加载模板、撰写规则、现有 constitution.md              |
| `src/core/constitution/parser.ts`                     | 解析条款编号/级别/判据类型（供 analyze skill 与测试）       |
| `src/core/constitution/migration.ts`                  | 检测 config.yaml 中应迁移的 plan 级铁律             |
| `src/core/constitution/index.ts`                      | 模块导出                                      |
| `src/core/change-metadata/schema.ts`                  | 扩展 `waivers` 字段                           |
| `src/core/project-config.ts`                          | 新增 `readConstitution()`                   |
| `src/core/artifact-graph/instruction-loader.ts`       | `generateInstructions` 注入 `constitution`  |
| `src/commands/workflow/constitution-instructions.ts`  | `openspec instructions constitution` 命令实现 |
| `src/commands/workflow/instructions.ts`               | 文本输出格式（constitution 分支）                   |
| `src/cli/index.ts`                                    | CLI 路由 `constitution` 特例                  |
| `src/core/templates/workflows/constitution.ts`        | `/opsx:constitution` skill + command      |
| `src/core/templates/workflows/analyze.ts`             | `/opsx:analyze` skill + command           |
| `src/core/templates/skill-templates.ts`               | 重导出                                       |
| `src/core/shared/skill-generation.ts`                 | 注册 workflow `constitution`、`analyze`      |
| `src/core/init.ts`                                    | 可选生成 constitution 骨架                      |
| `test/core/change-metadata/schema.test.ts`            | waivers schema 测试                         |
| `test/core/constitution/*.test.ts`                    | loader/parser/migration 测试                |
| `test/commands/constitution-instructions.test.ts`     | CLI 集成测试                                  |
| `test/core/artifact-graph/instruction-loader.test.ts` | constitution 注入测试                         |
| `test/core/shared/skill-generation.test.ts`           | 更新模板数量断言                                  |


---

### Task 1: ChangeMetadata waivers 字段

**Files:**

- Modify: `src/core/change-metadata/schema.ts`
- Create: `test/core/change-metadata/schema.test.ts`
- Test: `test/utils/change-metadata.test.ts`（追加 round-trip 用例）

**Interfaces:**

- Consumes: 现有 `ChangeMetadataSchema`
- Produces:
  ```typescript
  export const WaiverSchema = z.object({
    principle: z.string().regex(/^(?:[IVX]+|\d+)$/u, {
      message: 'principle must be a constitution clause id (e.g. I, II, III)',
    }),
    reason: z.string().min(1),
  });

  // ChangeMetadataSchema 新增:
  waivers: z.array(WaiverSchema).optional()
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// test/core/change-metadata/schema.test.ts
import { describe, it, expect } from 'vitest';
import { ChangeMetadataSchema } from '../../../src/core/change-metadata/schema.js';

describe('ChangeMetadataSchema waivers', () => {
  it('accepts optional waivers with principle and reason', () => {
    const result = ChangeMetadataSchema.safeParse({
      schema: 'spec-driven',
      waivers: [
        { principle: 'I', reason: 'Internal scaffolding with no user-visible behavior' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects waiver without reason', () => {
    const result = ChangeMetadataSchema.safeParse({
      schema: 'spec-driven',
      waivers: [{ principle: 'I' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid principle format', () => {
    const result = ChangeMetadataSchema.safeParse({
      schema: 'spec-driven',
      waivers: [{ principle: 'article-1', reason: 'test' }],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/change-metadata/schema.test.ts -v`
Expected: FAIL — `waivers` unknown or parse rejects valid input

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/core/change-metadata/schema.ts — 在 InitiativeLinkSchema 之后添加
export const WaiverSchema = z.object({
  principle: z
    .string()
    .regex(/^(?:[IVX]+|\d+)$/u, {
      message: 'principle must be a constitution clause id (e.g. I, II, III)',
    }),
  reason: z.string().min(1),
}).strict();

export type Waiver = z.infer<typeof WaiverSchema>;

// ChangeMetadataSchema 内新增字段:
waivers: z.array(WaiverSchema).optional(),
```

同时在 `src/core/change-metadata/index.ts` 导出 `WaiverSchema` 与 `Waiver` 类型。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/change-metadata/schema.test.ts test/utils/change-metadata.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/change-metadata/schema.ts src/core/change-metadata/index.ts test/core/change-metadata/schema.test.ts
git commit -m "feat: add waivers field to change metadata schema"
```

---

### Task 2: Constitution 模板与 loader 模块

**Files:**

- Create: `schemas/constitution/templates/constitution.md`
- Create: `schemas/constitution/writing-rules.yaml`
- Create: `src/core/constitution/loader.ts`
- Create: `src/core/constitution/index.ts`
- Create: `test/core/constitution/loader.test.ts`

**Interfaces:**

- Consumes: 包内 `schemas/constitution/` 路径（通过 `getPackageSchemasDir()` 旁路或 `path.join(packageRoot, 'schemas', 'constitution')`）
- Produces:
  ```typescript
  export interface ConstitutionWritingRules {
    rules: string[];
  }

  export interface ConstitutionBundle {
    template: string;
    writingRules: ConstitutionWritingRules;
    outputPath: string;           // 'openspec/constitution.md'
    instruction: string;          // 合成自 writing-rules，供 CLI JSON
  }

  export function loadConstitutionBundle(): ConstitutionBundle;
  export function readConstitutionFile(projectRoot: string): string | null;
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// test/core/constitution/loader.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadConstitutionBundle,
  readConstitutionFile,
} from '../../../src/core/constitution/loader.js';

describe('constitution loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-constitution-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loadConstitutionBundle returns template and writing rules', () => {
    const bundle = loadConstitutionBundle();
    expect(bundle.template).toContain('Project Constitution');
    expect(bundle.outputPath).toBe('openspec/constitution.md');
    expect(bundle.writingRules.rules.length).toBeGreaterThan(0);
    expect(bundle.writingRules.rules.some((r) => r.includes('MUST'))).toBe(true);
  });

  it('readConstitutionFile returns null when missing', () => {
    expect(readConstitutionFile(tempDir)).toBeNull();
  });

  it('readConstitutionFile returns content when present', () => {
    const dir = path.join(tempDir, 'openspec');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'constitution.md'), '# Project Constitution: test\n');
    expect(readConstitutionFile(tempDir)).toContain('Project Constitution');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/constitution/loader.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

`schemas/constitution/templates/constitution.md`:

```markdown
# Project Constitution: <project-name>

> Version: 1.0 · Last amended: YYYY-MM-DD

## I. <Principle Title> (MUST)

<One plan-level principle using MUST/MUST NOT/SHOULD keywords.>

- 判据[structure]: <measurable structural check against artifacts>
  正例: <good example>
  反例: <bad example>

## II. <Principle Title> (SHOULD)

<Second principle — one topic per clause.>

- 判据[judgment]: <yes/no question per requirement or design section>
  正例: <good example>
  反例: <bad example>
```

`schemas/constitution/writing-rules.yaml`:

```yaml
rules:
  - "Each clause MUST have Roman numeral id + title + level (MUST) or (SHOULD)"
  - "Use normative keywords MUST, MUST NOT, SHOULD — reject vague 'should try' or 'prefer'"
  - "Each clause MUST have at least one 判据 with type [structure] or [judgment]"
  - "judgment criteria MUST be itemized yes/no questions, not blanket labels"
  - "One principle per clause — do not combine unrelated rules"
  - "Only plan-level principles — rules requiring code inspection belong in linter/CI"
  - "structure criteria are checked by parsing artifact structure; judgment by reading artifact content"
instruction: |
  Draft or revise openspec/constitution.md as the project's plan-level invariant.
  Guide the user through grilling: for each principle ask what analyze would look at
  in proposal/design/specs to detect a violation. Reject untestable wording.
```

`src/core/constitution/loader.ts`:

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const CONSTITUTION_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', 'schemas', 'constitution'
);

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
```

`src/core/constitution/index.ts` 重导出 loader 与后续 parser/migration。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/constitution/loader.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add schemas/constitution/ src/core/constitution/ test/core/constitution/loader.test.ts
git commit -m "feat: add constitution template bundle and loader"
```

---

### Task 3: `openspec instructions constitution` CLI

**Files:**

- Create: `src/commands/workflow/constitution-instructions.ts`
- Modify: `src/commands/workflow/instructions.ts`（导出类型若需）
- Modify: `src/cli/index.ts:484-491`
- Create: `test/commands/constitution-instructions.test.ts`

**Interfaces:**

- Consumes: `loadConstitutionBundle()`, `readConstitutionFile()`, `readProjectConfig()`
- Produces:
  ```typescript
  export interface ConstitutionInstructions {
    outputPath: string;
    resolvedOutputPath: string;
    instruction: string;
    template: string;
    writingRules: string[];
    existingContent?: string;
    configContext?: string;
    configRules?: Record<string, string[]>;
  }

  export async function constitutionInstructionsCommand(
    options: { json?: boolean }
  ): Promise<void>;
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// test/commands/constitution-instructions.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('constitutionInstructionsCommand', () => {
  let tempDir: string;
  let stdout: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-const-instr-'));
    const openspecDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecDir, { recursive: true });
    fs.writeFileSync(
      path.join(openspecDir, 'config.yaml'),
      'schema: spec-driven\ncontext: |\n  Tech stack: TypeScript\n'
    );
    stdout = '';
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      stdout += args.map(String).join(' ') + '\n';
    });
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('outputs JSON with template and writing rules', async () => {
    const { constitutionInstructionsCommand } = await import(
      '../../src/commands/workflow/constitution-instructions.js'
    );
    await constitutionInstructionsCommand({ json: true });
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.template).toContain('Project Constitution');
    expect(parsed.writingRules.length).toBeGreaterThan(0);
    expect(parsed.resolvedOutputPath).toContain('openspec/constitution.md');
    expect(parsed.configContext).toContain('TypeScript');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/commands/constitution-instructions.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

`src/commands/workflow/constitution-instructions.ts`:

```typescript
import path from 'path';
import {
  loadConstitutionBundle,
  readConstitutionFile,
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
}

export function buildConstitutionInstructions(projectRoot: string): ConstitutionInstructions {
  const bundle = loadConstitutionBundle();
  const config = readProjectConfig(projectRoot);
  const existingContent = readConstitutionFile(projectRoot) ?? undefined;
  const resolvedOutputPath = path.join(projectRoot, bundle.outputPath);

  return {
    outputPath: bundle.outputPath,
    resolvedOutputPath,
    instruction: bundle.instruction,
    template: bundle.template,
    writingRules: bundle.writingRules.rules,
    ...(existingContent ? { existingContent } : {}),
    ...(config?.context?.trim() ? { configContext: config.context.trim() } : {}),
    ...(config?.rules ? { configRules: config.rules } : {}),
  };
}

export async function constitutionInstructionsCommand(options: {
  json?: boolean;
}): Promise<void> {
  const planningHome = resolveCurrentPlanningHomeSync();
  const instructions = buildConstitutionInstructions(planningHome.root);

  if (options.json) {
    console.log(JSON.stringify(instructions, null, 2));
    return;
  }

  // 文本模式（供人工调试）
  console.log('<constitution>');
  console.log(`Write to: ${instructions.resolvedOutputPath}`);
  console.log();
  if (instructions.existingContent) {
    console.log('<existing_content>');
    console.log(instructions.existingContent);
    console.log('</existing_content>');
    console.log();
  }
  console.log('<writing_rules>');
  for (const rule of instructions.writingRules) {
    console.log(`- ${rule}`);
  }
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
```

`src/cli/index.ts` — 在 `apply` 特例旁添加：

```typescript
import { constitutionInstructionsCommand } from '../commands/workflow/constitution-instructions.js';

// action 内:
if (artifactId === 'apply') {
  await applyInstructionsCommand(options);
} else if (artifactId === 'constitution') {
  await constitutionInstructionsCommand({ json: options.json });
} else {
  await instructionsCommand(artifactId, options);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/commands/constitution-instructions.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/workflow/constitution-instructions.ts src/cli/index.ts test/commands/constitution-instructions.test.ts
git commit -m "feat: add openspec instructions constitution command"
```

---

### Task 4: 宪法运行时注入 artifact instructions

**Files:**

- Modify: `src/core/project-config.ts`（`readConstitution` 薄封装，可选）
- Modify: `src/core/artifact-graph/instruction-loader.ts:71-104,318-340`
- Modify: `src/commands/workflow/instructions.ts:107-168`（`printInstructionsText` 输出 `<constitution>` 块）
- Modify: `test/core/artifact-graph/instruction-loader.test.ts`

**Interfaces:**

- Consumes: `readConstitutionFile(projectRoot)`
- Produces: `ArtifactInstructions` 新增可选字段 `constitution?: string`

- [ ] **Step 1: Write the failing test**

在 `test/core/artifact-graph/instruction-loader.test.ts` 追加：

```typescript
it('includes constitution content when openspec/constitution.md exists', () => {
  const constitutionPath = path.join(tempDir, 'openspec', 'constitution.md');
  fs.mkdirSync(path.dirname(constitutionPath), { recursive: true });
  fs.writeFileSync(constitutionPath, '## I. Test Principle (MUST)\n');

  const context = loadChangeContext(tempDir, 'test-change');
  const instructions = generateInstructions(context, 'proposal', tempDir);

  expect(instructions.constitution).toContain('I. Test Principle');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/artifact-graph/instruction-loader.test.ts -t "includes constitution" -v`
Expected: FAIL — `instructions.constitution` undefined

- [ ] **Step 3: Write minimal implementation**

`instruction-loader.ts`:

```typescript
import { readConstitutionFile } from '../constitution/index.js';

// ArtifactInstructions 接口新增:
/** Project constitution (plan-level invariants — constraints for AI, not in output) */
constitution: string | undefined;

// generateInstructions 内，configRules 之后:
const constitutionContent = readConstitutionFile(effectiveProjectRoot)?.trim() || undefined;

return {
  // ...existing fields
  constitution: constitutionContent,
};
```

`printInstructionsText` 在 `<project_context>` 之后插入：

```typescript
if (constitution) {
  console.log('<constitution>');
  console.log('<!-- Plan-level invariants. Do NOT include in artifact output. -->');
  console.log(constitution);
  console.log('</constitution>');
  console.log();
}
```

解构 `printInstructionsText` 参数时加入 `constitution`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/artifact-graph/instruction-loader.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/artifact-graph/instruction-loader.ts src/commands/workflow/instructions.ts test/core/artifact-graph/instruction-loader.test.ts
git commit -m "feat: inject constitution into artifact instructions"
```

---

### Task 5: Constitution 条款解析器与迁移检测

**Files:**

- Create: `src/core/constitution/parser.ts`
- Create: `src/core/constitution/migration.ts`
- Create: `test/core/constitution/parser.test.ts`
- Create: `test/core/constitution/migration.test.ts`

**Interfaces:**

- Consumes: constitution.md 文本、`ProjectConfig`
- Produces:
  ```typescript
  export interface ConstitutionClause {
    id: string;           // 'I', 'II', ...
    title: string;
    level: 'MUST' | 'SHOULD';
    body: string;
    criteria: Array<{ type: 'structure' | 'judgment'; text: string }>;
  }

  export function parseConstitution(content: string): ConstitutionClause[];

  export interface MigrationHint {
    source: 'context' | 'rules';
    artifactId?: string;
    text: string;
    suggestion: 'constitution' | 'linter' | 'keep';
    reason: string;
  }

  export function detectConfigMigrationHints(config: ProjectConfig): MigrationHint[];
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// test/core/constitution/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseConstitution } from '../../../src/core/constitution/parser.js';

const SAMPLE = `
## I. 产品行为语言 (MUST)
spec MUST use product behavior language.
- 判据[judgment]: 每条 requirement 是可观察结果而非实现
  正例: "用户提交后看到确认"
  反例: "调用 saveToDb()"

## II. 简单优先 (SHOULD)
design SHOULD stay minimal.
- 判据[judgment]: 每处抽象能指向当前 change 的具体需求
`;

describe('parseConstitution', () => {
  it('parses numbered clauses with level and criteria', () => {
    const clauses = parseConstitution(SAMPLE);
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toMatchObject({ id: 'I', level: 'MUST', title: '产品行为语言' });
    expect(clauses[0].criteria[0].type).toBe('judgment');
    expect(clauses[1].level).toBe('SHOULD');
  });
});
```

```typescript
// test/core/constitution/migration.test.ts
import { describe, it, expect } from 'vitest';
import { detectConfigMigrationHints } from '../../../src/core/constitution/migration.js';

describe('detectConfigMigrationHints', () => {
  it('suggests constitution for plan-level MUST language in context', () => {
    const hints = detectConfigMigrationHints({
      schema: 'spec-driven',
      context: 'Requirements MUST describe observable user behavior.',
    });
    expect(hints.some((h) => h.suggestion === 'constitution')).toBe(true);
  });

  it('suggests linter for code-mechanical rules', () => {
    const hints = detectConfigMigrationHints({
      schema: 'spec-driven',
      context: 'Always use path.join(), never hardcode slashes.',
    });
    expect(hints.some((h) => h.suggestion === 'linter')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/constitution/parser.test.ts test/core/constitution/migration.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`parser.ts` — 用正则分段 `^## ([IVX]+)\.\s+(.+?)\s+\((MUST|SHOULD)\)`，判据行匹配 `判据\[(structure|judgment)\]:`。

`migration.ts` — 启发式：

- 含 `MUST`/`MUST NOT`/`SHALL` → `suggestion: 'constitution'`
- 含 `path.join`/`eslint`/`console.log`/`linter` → `suggestion: 'linter'`
- 纯技术栈描述（`TypeScript`/`pnpm`/`Node`）→ `suggestion: 'keep'`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/constitution/ -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/constitution/parser.ts src/core/constitution/migration.ts src/core/constitution/index.ts test/core/constitution/
git commit -m "feat: add constitution parser and config migration hints"
```

---

### Task 6: `/opsx:constitution` workflow skill

**Files:**

- Create: `src/core/templates/workflows/constitution.ts`
- Modify: `src/core/templates/skill-templates.ts`
- Modify: `test/core/shared/skill-generation.test.ts`（数量 11→12）

**Interfaces:**

- Consumes: `buildConstitutionInstructions()`, `detectConfigMigrationHints()`, `parseConstitution()`
- Produces: `getConstitutionSkillTemplate()`, `getOpsxConstitutionCommandTemplate()`

- [ ] **Step 1: Write the failing test**

在 `skill-generation.test.ts` 更新：

```typescript
it('should return all 12 skill templates', () => {
  const templates = getSkillTemplates();
  expect(templates).toHaveLength(12);
});

// getSkillTemplates includes:
expect(dirNames).toContain('openspec-constitution');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts -t "12 skill" -v`
Expected: FAIL — length 11

- [ ] **Step 3: Write minimal implementation**

`constitution.ts` skill 核心步骤（完整写入文件）：

```typescript
export function getConstitutionSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-constitution',
    description: 'Draft or revise the project constitution (plan-level invariants). Use when establishing or updating openspec/constitution.md.',
    instructions: `Draft or revise the project constitution at openspec/constitution.md.

**Steps**

1. **Load template and rules**
   \`\`\`bash
   openspec status --json
   openspec instructions constitution --json
   \`\`\`
   Parse: template, writingRules, instruction, existingContent, configContext, configRules.

2. **Migration hints (first run or when config has normative rules)**
   If configContext or configRules contain MUST-language or code-mechanical rules,
   classify each hint:
   - plan-level MUST → propose as constitution clause
   - code-mechanical → suggest ESLint/CI, do NOT add to constitution
   - descriptive background → leave in config.yaml context

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
   Summarize clauses. Remind: MUST violations block apply until fixed or waived in .openspec.yaml.`,
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
```

注册到 `skill-templates.ts` 与 `skill-generation.ts`（`workflowId: 'constitution'`）。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/templates/workflows/constitution.ts src/core/templates/skill-templates.ts src/core/shared/skill-generation.ts test/core/shared/skill-generation.test.ts
git commit -m "feat: add opsx constitution workflow skill"
```

---

### Task 7: `/opsx:analyze` workflow skill

**Files:**

- Create: `src/core/templates/workflows/analyze.ts`
- Modify: `src/core/templates/skill-templates.ts`
- Modify: `src/core/shared/skill-generation.ts`
- Modify: `test/core/shared/skill-generation.test.ts`（12→13）

**Interfaces:**

- Consumes: `parseConstitution()`, change metadata `waivers`, `openspec status --json`, artifact files
- Produces: `getAnalyzeSkillTemplate()`, `getOpsxAnalyzeCommandTemplate()`

- [ ] **Step 1: Write the failing test**

```typescript
it('should return all 13 skill templates', () => {
  expect(getSkillTemplates()).toHaveLength(13);
});
expect(dirNames).toContain('openspec-analyze-change');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts -t "13 skill" -v`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`analyze.ts` — skill 须包含 spec 第 6-7 节全部要点：

```typescript
export function getAnalyzeChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-analyze-change',
    description: 'Pre-apply read-only analysis: constitution alignment + artifact consistency. Use after propose, before apply.',
    instructions: `Analyze a change against the project constitution and artifact consistency. READ-ONLY — do not modify any files.

**Authority**: Constitution is non-negotiable during analyze. On MUST violations, adjust the plan — do NOT reinterpret or delete clauses. Constitution changes require /opsx:constitution separately.

**Input**: Change name (kebab-case). If omitted, prompt via openspec list --json.

**Steps**

1. **Load context**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Read openspec/constitution.md (if missing, report WARNING: no constitution — skip Constitution Alignment pass).
   Read openspec/changes/<name>/.openspec.yaml for waivers[].

2. **Load artifacts** (proposal, design, specs/**/*.md, tasks.md — whatever exists per status)

3. **Pass: Constitution Alignment**
   For each MUST/SHOULD clause in constitution:
   - structure 判据: parse artifact structure mechanically
   - judgment 判据: evaluate itemized yes/no per requirement (anchor to ### Requirement: IDs)
   - MUST violation + no waiver → CRITICAL with evidence: file + requirement ID + criterion
   - MUST violation + matching waiver (principle: <id>) → NOTE: "⚠ Waived <id> — reason: ..."
   - judgment without concrete evidence → downgrade to WARNING (never CRITICAL)

4. **Pass: Coverage / Ambiguity / Consistency** (SpecKit-style, artifacts only)
   - Requirement → task mapping gaps
   - Duplicate or conflicting requirements
   - proposal Capabilities vs specs files
   - design Decisions vs specs scope

5. **Report**
   | ID | Category | Severity | Location | Evidence | Recommendation |
   Block apply if any CRITICAL unless user explicitly accepts risk (still list CRITICALs).

**Do NOT**: read implementation code, modify constitution, modify artifacts, or conflate with verify.`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}
```

Command template: `OPSX: Analyze` / `/opsx:analyze`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/templates/workflows/analyze.ts src/core/templates/skill-templates.ts src/core/shared/skill-generation.ts test/core/shared/skill-generation.test.ts
git commit -m "feat: add opsx analyze pre-apply workflow skill"
```

---

### Task 8: `openspec init` 可选 constitution 骨架

**Files:**

- Modify: `src/core/init.ts`（`createConfig` 附近新增 `createConstitutionSkeleton`）
- Create: `test/core/init-constitution.test.ts`（或扩展现有 init 测试）

**Interfaces:**

- Consumes: `loadConstitutionBundle()`
- Produces: init 时在交互模式下询问是否生成 `openspec/constitution.md` 骨架；非交互无 `--force` 时跳过（与 config 同策略）

- [ ] **Step 1: Write the failing test**

```typescript
// test/core/init-constitution.test.ts — 测试 createConstitutionSkeleton 辅助函数
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createConstitutionSkeletonIfMissing } from '../../src/core/init-constitution.js';

describe('createConstitutionSkeletonIfMissing', () => {
  let tempDir: string;
  beforeEach(() => { tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-init-const-')); });
  afterEach(() => { fs.rmSync(tempDir, { recursive: true, force: true }); });

  it('writes skeleton when file missing', () => {
    const openspecPath = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecPath, { recursive: true });
    const result = createConstitutionSkeletonIfMissing(tempDir);
    expect(result).toBe('created');
    expect(fs.existsSync(path.join(openspecPath, 'constitution.md'))).toBe(true);
  });

  it('does not overwrite existing constitution', () => {
    const openspecPath = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecPath, { recursive: true });
    fs.writeFileSync(path.join(openspecPath, 'constitution.md'), 'existing');
    const result = createConstitutionSkeletonIfMissing(tempDir);
    expect(result).toBe('exists');
    expect(fs.readFileSync(path.join(openspecPath, 'constitution.md'), 'utf-8')).toBe('existing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/init-constitution.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

抽取 `src/core/init-constitution.ts`（保持 init.ts 精简）：

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadConstitutionBundle } from './constitution/index.js';
import { FileSystemUtils } from '../utils/file-system.js';

export function createConstitutionSkeletonIfMissing(
  projectPath: string
): 'created' | 'exists' | 'skipped' {
  const target = path.join(projectPath, 'openspec', 'constitution.md');
  if (fs.existsSync(target)) return 'exists';
  const bundle = loadConstitutionBundle();
  const projectName = path.basename(projectPath);
  const content = bundle.template
    .replace('<project-name>', projectName)
    .replace('YYYY-MM-DD', new Date().toISOString().slice(0, 10));
  FileSystemUtils.writeFileSync(target, content);
  return 'created';
}
```

在 `init.ts` `createConfig` 之后调用（仅 `canPromptInteractively()` 或 `--force` 时）；`displaySuccessMessage` 回显 constitution 状态。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/init-constitution.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/init-constitution.ts src/core/init.ts test/core/init-constitution.test.ts
git commit -m "feat: optional constitution skeleton on openspec init"
```

---

### Task 9: 构建验证与文档交叉引用

**Files:**

- Modify: `test/core/shared/skill-generation.test.ts`（command templates 数量）
- Verify: 不修改 `verify-change.ts`、`archive-change.ts`

**Interfaces:**

- Consumes: 全部前述任务
- Produces: 绿色测试套件 + `pnpm run build` 通过

- [ ] **Step 1: 更新 command template 计数测试**

```typescript
it('should return all 13 command templates', () => {
  expect(getCommandTemplates()).toHaveLength(13);
});
expect(ids).toContain('constitution');
expect(ids).toContain('analyze');
```

- [ ] **Step 2: 全量测试**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: 构建**

Run: `pnpm run build`
Expected: PASS（`schemas/constitution/` 随包发布，已在 `package.json` `files` 的 `schemas` 条目内）

- [ ] **Step 4: 手动冒烟**

```bash
pnpm run build
node bin/openspec.js instructions constitution --json | head -20
```

Expected: JSON 含 `template`、`writingRules`、`resolvedOutputPath`

- [ ] **Step 5: Commit**

```bash
git add test/core/shared/skill-generation.test.ts
git commit -m "test: update skill generation counts for constitution and analyze"
```

---

## Self-Review

### Spec coverage（§9 实现范围）


| 需求                                      | 任务        |
| --------------------------------------- | --------- |
| schema/template 层 constitution artifact | Task 2, 3 |
| `constitution.ts` workflow              | Task 6    |
| `analyze.ts` workflow                   | Task 7    |
| project-config 读取 + 注入                  | Task 4    |
| ChangeMetadataSchema waivers            | Task 1    |
| init 可选骨架                               | Task 8    |
| 迁移辅助                                    | Task 5, 6 |
| verify/archive 不动                       | 明确排除，无任务  |


### Placeholder scan

无 TBD/TODO/“similar to Task N”/无代码步骤。

### Type consistency

- `Waiver.principle` ↔ analyze skill `waivers[].principle` ↔ `parseConstitution().id`
- `ConstitutionInstructions` ↔ constitution skill CLI 步骤
- `ArtifactInstructions.constitution` ↔ `printInstructionsText` / propose 注入

### 已知边界（非 gap）

- analyze 的 judgment 核对由 AI 执行（与 verify 同模式）；机械部分仅 waivers 解析与 structure 判据辅助
- probe 集成（读 constitution 跳过重复提问）属独立 change，本 plan 不实现

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-opsx-constitution-design.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?