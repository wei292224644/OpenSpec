# OPSX Constitution & Analyze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 OpenSpec 引入项目级 `openspec/constitution.md`、立法 skill `/opsx:constitution`、以及 pre-apply 只读审判 skill `/opsx:analyze`，使 plan 级原则可被独立核对、MUST 违反可阻塞（可记录豁免），且宪法内容运行时注入所有 artifact 流程（propose/design 尤其受益）。

**Architecture:** 宪法是项目级文件（非 change artifact），模板与撰写规则放在 `schemas/constitution/` 包内目录，经 `openspec instructions constitution --json` 暴露（与 change artifact 的 `apply` 特例同模式）。`readConstitutionFile()` 在 `generateInstructions()` 中与 `config.context` 并列注入。**采用"机械可核对"路线**：宪法条款由 `parseConstitution()` 解析成结构化数据、迁移候选由 `detectConfigMigrationHints()` 机械检测，分别经 `instructions analyze --json` 与 `instructions constitution --json` 暴露给 skill；skill **消费**这些结构化结果（不自己重新解析/分类），仅在无可避免处（judgment 判据评估）由 AI 判断。`waivers` 由 Zod 校验。每个模块都有明确调用方——不留只被测试引用的死代码。

**与现有架构同构（非新增范式）：** 本 plan 复刻项目里所有 workflow 的统一模式——**薄命令 + `instructions … --json` + 厚 skill**：代码做确定性计算并产出 JSON，markdown skill 消费 JSON、不自己推导。
- **通用 artifact 路径**：`instructions <artifact> --change <name> --json` → `loadChangeContext` → `generateInstructions` → `JSON.stringify`（`src/commands/workflow/instructions.ts`）；propose/onboard 等 skill 消费其 `context/rules/template/instruction/resolvedOutputPath/dependencies`。Task 6 的 constitution 注入即挂在这条 `generateInstructions` 上。
- **非 artifact 特例路径**：`apply` 不是 schema artifact，故 `src/cli/index.ts` 在 `instructions` action 里特判 `artifactId === 'apply'` → `applyInstructionsCommand`。**`constitution` 与 `analyze` 同样不是 artifact，照搬该特例**：Task 4/5 在同一个 if-else 链加分支，路由到 `constitutionInstructionsCommand` / `analyzeInstructionsCommand`。
- 区别仅在于：`apply` 当年无需"解析"，而本 plan 在命令函数内多了 `parseConstitution()` / `detectConfigMigrationHints()` 两个机械步骤——其位置（命令函数内、产 JSON 给 skill）与 `generateInstructions` 内读 config、拼 rules 完全对等。

**Tech Stack:** TypeScript (ESM)、Zod、Vitest、`yaml` 解析、现有 `src/core/templates/workflows/*` 模式、`schemas/spec-driven/` 参考

## Global Constraints

- 宪法载体：`openspec/constitution.md`（项目级，非 change artifact）
- 宪法范围：仅 plan 级（对照 proposal/design/specs/tasks），**不扫代码**
- 审判者：`/opsx:analyze`（独立 read-only，apply 前）
- 执法刚性：MUST 违反 → CRITICAL（**skill 层建议性阻塞**——靠 prompt 约束，与 `verify` 同，非代码 gate）；有 `.openspec.yaml` waiver → 降级 NOTE 并高声回显
- 注入方式：运行时注入（像 `context`，对所有 artifact 生效），拒绝静态级联
- 职责边界：`constitution.md` 只放 plan 级 MUST/SHOULD；`config.yaml` `context` 只放描述性背景；`config.yaml` `rules` 只放 artifact 战术提示；代码机械规则归 linter/CI
- 单一来源：条款解析与迁移分类**只在代码里做一次**，经 CLI 透出；skill 消费结果、不再并行实现一份
- 机械确定 vs AI 判断：解析条款结构、匹配 waiver、检测迁移候选 → 代码；judgment 判据评估 → AI（无可避免，与 verify 同模式）
- **不动**：`verify`（代码兑现 spec）、`archive`（纯归纳，不读代码、不验证宪法）
- 与 `/opsx:probe` 独立实现（本 plan 不含 probe）

---

## File Structure

| 文件 | 职责 |
| --- | --- |
| `schemas/constitution/templates/constitution.md` | 宪法骨架模板（编号条款占位） |
| `schemas/constitution/writing-rules.yaml` | 撰写规则（MUST/判据/拒绝模糊/只收 plan 级） |
| `src/core/constitution/loader.ts` | 加载模板、撰写规则、现有 constitution.md |
| `src/core/constitution/parser.ts` | 解析条款编号/级别/判据类型（供 analyze CLI 与测试） |
| `src/core/constitution/migration.ts` | 检测 config.yaml 中应迁移的 plan 级铁律（供 constitution CLI 与测试） |
| `src/core/constitution/index.ts` | 模块导出（重导出 loader/parser/migration） |
| `src/core/change-metadata/schema.ts` | 扩展 `waivers` 字段 |
| `src/core/artifact-graph/instruction-loader.ts` | `generateInstructions` 注入 `constitution` |
| `src/commands/workflow/constitution-instructions.ts` | `openspec instructions constitution`（含 migrationHints） |
| `src/commands/workflow/analyze-instructions.ts` | `openspec instructions analyze`（解析条款 + waivers + artifact 清单） |
| `src/commands/workflow/instructions.ts` | 文本输出格式（constitution 分支） |
| `src/cli/index.ts` | CLI 路由 `constitution` / `analyze` 特例 |
| `src/core/templates/workflows/constitution.ts` | `/opsx:constitution` skill + command |
| `src/core/templates/workflows/analyze.ts` | `/opsx:analyze` skill + command |
| `src/core/templates/skill-templates.ts` | 重导出 |
| `src/core/shared/skill-generation.ts` | 注册 workflow `constitution`、`analyze` |
| `src/core/init.ts` / `src/core/init-constitution.ts` | 可选生成 constitution 骨架 |
| `test/core/change-metadata/schema.test.ts` | waivers schema 测试 |
| `test/core/constitution/loader.test.ts` | loader 测试 |
| `test/core/constitution/parser.test.ts` | parser 测试 |
| `test/core/constitution/migration.test.ts` | migration 测试 |
| `test/commands/constitution-instructions.test.ts` | constitution CLI 集成测试 |
| `test/commands/analyze-instructions.test.ts` | analyze CLI 集成测试 |
| `test/core/artifact-graph/instruction-loader.test.ts` | constitution 注入测试 |
| `test/core/shared/skill-generation.test.ts` | 更新模板数量断言（skill 与 command 同步） |

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
    principle: z.string().regex(/^[IVX]+$/u, {
      message: 'principle must be a constitution clause id in roman numerals (e.g. I, II, III)',
    }),
    reason: z.string().min(1),
  });

  // ChangeMetadataSchema 新增:
  waivers: z.array(WaiverSchema).optional()
  ```

> 编号制式统一为罗马数字，与 `constitution.md` 条款 id（`I/II/III`）、`parseConstitution().id` 一致——避免 `principle: 1` 通过校验却匹配不到任何条款的静默失配。校验失败会在 `readChangeMetadata` 抛错（与现有 `created`/`schema` 字段一致），属预期的 fail-loud。

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

  it('rejects non-roman principle format', () => {
    const result = ChangeMetadataSchema.safeParse({
      schema: 'spec-driven',
      waivers: [{ principle: '1', reason: 'test' }],
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
    .regex(/^[IVX]+$/u, {
      message: 'principle must be a constitution clause id in roman numerals (e.g. I, II, III)',
    }),
  reason: z.string().min(1),
}).strict();

export type Waiver = z.infer<typeof WaiverSchema>;

// ChangeMetadataSchema 内新增字段:
waivers: z.array(WaiverSchema).optional(),
```

> `src/core/change-metadata/index.ts` 已是 `export * from './schema.js'`，`WaiverSchema`/`Waiver` 自动带出，无需额外导出语句。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/change-metadata/schema.test.ts test/utils/change-metadata.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/change-metadata/schema.ts test/core/change-metadata/schema.test.ts
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

- Consumes: 包内 `schemas/constitution/` 路径（复用现有 `getPackageSchemasDir()`，与其余 schema 解析同一来源）
- Produces:
  ```typescript
  export interface ConstitutionWritingRules { rules: string[]; }
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
import { parse as parseYaml } from 'yaml';
import { getPackageSchemasDir } from '../artifact-graph/resolver.js';

const CONSTITUTION_DIR = path.join(getPackageSchemasDir(), 'constitution');

export interface ConstitutionWritingRules { rules: string[]; }
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

`src/core/constitution/index.ts` 重导出 loader（后续 Task 3 追加 parser/migration）。

> 复用 `getPackageSchemasDir()`（`src/core/artifact-graph/resolver.ts`，叶子模块、无循环依赖）确保 schema 根目录解析与项目其余部分一致；src（vitest）与 dist（运行时）深度相同，两环境都能定位 `schemas/constitution/`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/constitution/loader.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add schemas/constitution/ src/core/constitution/ test/core/constitution/loader.test.ts
git commit -m "feat: add constitution template bundle and loader"
```

---

### Task 3: Constitution 条款解析器与迁移检测（机械核心）

**Files:**

- Create: `src/core/constitution/parser.ts`
- Create: `src/core/constitution/migration.ts`
- Modify: `src/core/constitution/index.ts`（重导出 parser/migration）
- Create: `test/core/constitution/parser.test.ts`
- Create: `test/core/constitution/migration.test.ts`

**Interfaces:**

- Consumes: constitution.md 文本、`ProjectConfig`
- Produces:
  ```typescript
  export interface ConstitutionCriterion {
    type: 'structure' | 'judgment';
    text: string;
  }
  export interface ConstitutionClause {
    id: string;            // 'I', 'II', ...（罗马数字，与 Waiver.principle 一致）
    title: string;
    level: 'MUST' | 'SHOULD';
    body: string;          // 标题与首条判据之间的散文
    criteria: ConstitutionCriterion[];
  }
  export function parseConstitution(content: string): ConstitutionClause[];

  export interface MigrationHint {
    source: 'context' | 'rules';
    artifactId?: string;          // source === 'rules' 时填
    text: string;                 // 命中的行/片段
    suggestion: 'constitution' | 'linter' | 'keep';
    reason: string;
  }
  export function detectConfigMigrationHints(config: ProjectConfig): MigrationHint[];
  ```

> 这两个函数是"机械核心"，**有明确调用方**：`parseConstitution` 被 Task 5 的 analyze CLI 调用，`detectConfigMigrationHints` 被 Task 4 的 constitution CLI 调用。不存在只被测试引用的死代码。

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
- 判据[structure]: design 含 Decisions 章节
- 判据[judgment]: 每处抽象能指向当前 change 的具体需求
`;

describe('parseConstitution', () => {
  it('parses numbered clauses with level and criteria', () => {
    const clauses = parseConstitution(SAMPLE);
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toMatchObject({ id: 'I', level: 'MUST', title: '产品行为语言' });
    expect(clauses[0].criteria[0].type).toBe('judgment');
    expect(clauses[1].level).toBe('SHOULD');
    expect(clauses[1].criteria).toHaveLength(2);
    expect(clauses[1].criteria.map((c) => c.type)).toEqual(['structure', 'judgment']);
  });

  it('returns empty array for content with no clauses', () => {
    expect(parseConstitution('# Project Constitution\n\nno clauses here')).toEqual([]);
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

  it('keeps pure descriptive background', () => {
    const hints = detectConfigMigrationHints({
      schema: 'spec-driven',
      context: 'Tech stack: TypeScript, Node, pnpm.',
    });
    expect(hints.every((h) => h.suggestion === 'keep')).toBe(true);
  });

  it('tags rules entries with their artifactId', () => {
    const hints = detectConfigMigrationHints({
      schema: 'spec-driven',
      rules: { specs: ['Requirements MUST be observable'] },
    });
    expect(hints.some((h) => h.source === 'rules' && h.artifactId === 'specs')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/constitution/parser.test.ts test/core/constitution/migration.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

`parser.ts` — 按条款标题分段，逐条收集判据：

```typescript
export interface ConstitutionCriterion { type: 'structure' | 'judgment'; text: string; }
export interface ConstitutionClause {
  id: string;
  title: string;
  level: 'MUST' | 'SHOULD';
  body: string;
  criteria: ConstitutionCriterion[];
}

const HEADING = /^##\s+([IVX]+)\.\s+(.+?)\s+\((MUST|SHOULD)\)\s*$/u;
const CRITERION = /^-\s*判据\[(structure|judgment)\]:\s*(.+)$/u;

export function parseConstitution(content: string): ConstitutionClause[] {
  const lines = content.split('\n');
  const clauses: ConstitutionClause[] = [];
  let current: ConstitutionClause | null = null;
  const bodyLines: string[] = [];

  const flushBody = () => {
    if (current) current.body = bodyLines.join('\n').trim();
    bodyLines.length = 0;
  };

  for (const line of lines) {
    const h = HEADING.exec(line);
    if (h) {
      flushBody();
      current = { id: h[1], title: h[2], level: h[3] as 'MUST' | 'SHOULD', body: '', criteria: [] };
      clauses.push(current);
      continue;
    }
    if (!current) continue;
    const c = CRITERION.exec(line.trim());
    if (c) {
      current.criteria.push({ type: c[1] as 'structure' | 'judgment', text: c[2].trim() });
    } else if (current.criteria.length === 0) {
      bodyLines.push(line);
    }
  }
  flushBody();
  return clauses;
}
```

`migration.ts` — 逐行/逐条启发式分类：

```typescript
import type { ProjectConfig } from '../project-config.js';

export interface MigrationHint {
  source: 'context' | 'rules';
  artifactId?: string;
  text: string;
  suggestion: 'constitution' | 'linter' | 'keep';
  reason: string;
}

const NORMATIVE = /\b(MUST NOT|MUST|SHALL|SHOULD NOT|SHOULD)\b/;
const CODE_MECHANICAL = /(path\.join|console\.log|eslint|lint\b|coverage|no-console|hardcode)/i;

function classify(text: string): Pick<MigrationHint, 'suggestion' | 'reason'> {
  if (CODE_MECHANICAL.test(text)) {
    return { suggestion: 'linter', reason: 'Code-mechanical rule — belongs in linter/CI, not constitution' };
  }
  if (NORMATIVE.test(text)) {
    return { suggestion: 'constitution', reason: 'Plan-level normative language — candidate constitution clause' };
  }
  return { suggestion: 'keep', reason: 'Descriptive background — leave in config.yaml context' };
}

export function detectConfigMigrationHints(config: ProjectConfig): MigrationHint[] {
  const hints: MigrationHint[] = [];
  for (const line of (config.context ?? '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    hints.push({ source: 'context', text: line, ...classify(line) });
  }
  for (const [artifactId, rules] of Object.entries(config.rules ?? {})) {
    for (const rule of rules) {
      hints.push({ source: 'rules', artifactId, text: rule, ...classify(rule) });
    }
  }
  return hints;
}
```

`index.ts` 追加 `export * from './parser.js';` 与 `export * from './migration.js';`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/constitution/ -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/constitution/parser.ts src/core/constitution/migration.ts src/core/constitution/index.ts test/core/constitution/parser.test.ts test/core/constitution/migration.test.ts
git commit -m "feat: add constitution parser and config migration detection"
```

---

### Task 4: `openspec instructions constitution` CLI（含 migrationHints）

**Files:**

- Create: `src/commands/workflow/constitution-instructions.ts`
- Modify: `src/commands/workflow/instructions.ts`（导出类型若需）
- Modify: `src/cli/index.ts:484-491`
- Create: `test/commands/constitution-instructions.test.ts`

**Interfaces:**

- Consumes: `loadConstitutionBundle()`, `readConstitutionFile()`, `readProjectConfig()`, `detectConfigMigrationHints()`
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
    migrationHints?: MigrationHint[];   // 机械检测结果，供 skill 消费
  }
  export async function constitutionInstructionsCommand(options: { json?: boolean }): Promise<void>;
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
      'schema: spec-driven\ncontext: |\n  Tech stack: TypeScript\n  Requirements MUST be observable\n'
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

  it('outputs JSON with template, writing rules, and migration hints', async () => {
    const { constitutionInstructionsCommand } = await import(
      '../../src/commands/workflow/constitution-instructions.js'
    );
    await constitutionInstructionsCommand({ json: true });
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.template).toContain('Project Constitution');
    expect(parsed.writingRules.length).toBeGreaterThan(0);
    expect(parsed.resolvedOutputPath).toContain('openspec/constitution.md');
    expect(parsed.configContext).toContain('TypeScript');
    expect(parsed.migrationHints.some((h: { suggestion: string }) => h.suggestion === 'constitution')).toBe(true);
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

  // 文本模式（供人工调试）
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
```

`src/cli/index.ts` — 在 `apply` 特例旁添加（analyze 分支由 Task 5 补）：

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
git commit -m "feat: add openspec instructions constitution command with migration hints"
```

---

### Task 5: `openspec instructions analyze` CLI（解析条款 + waivers + artifact 清单）

**Files:**

- Create: `src/commands/workflow/analyze-instructions.ts`
- Modify: `src/cli/index.ts`（`instructions` action 加 `analyze` 分支）
- Create: `test/commands/analyze-instructions.test.ts`

**Interfaces:**

- Consumes: `readConstitutionFile()`, `parseConstitution()`, `readChangeMetadata()`（取 `waivers`）, `loadChangeContext()`（取 artifact 清单）
- Produces:
  ```typescript
  export interface AnalyzeArtifactRef { id: string; path: string; exists: boolean; }
  export interface AnalyzeInstructions {
    changeName: string;
    constitutionPresent: boolean;
    clauses: ConstitutionClause[];
    waivers: Waiver[];
    artifacts: AnalyzeArtifactRef[];
  }
  export async function analyzeInstructionsCommand(
    options: { change?: string; json?: boolean }
  ): Promise<void>;
  ```

> analyze skill 拿到的是**已解析的条款 + 已校验的 waivers + artifact 路径清单**——确定输入。AI 只需读 artifact 内容、对每条 judgment 判据做评估；条款是否齐全、哪条是 MUST、哪条 waiver 对应哪条款，全由代码先嚼好。

- [ ] **Step 1: Write the failing test**

```typescript
// test/commands/analyze-instructions.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('analyzeInstructionsCommand', () => {
  let tempDir: string;
  let stdout: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-analyze-instr-'));
    const openspecDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecDir, { recursive: true });
    fs.writeFileSync(path.join(openspecDir, 'config.yaml'), 'schema: spec-driven\n');
    fs.writeFileSync(
      path.join(openspecDir, 'constitution.md'),
      '## I. 产品行为语言 (MUST)\nspec MUST ...\n- 判据[judgment]: 每条 requirement 是可观察结果\n'
    );
    const changeDir = path.join(openspecDir, 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, '.openspec.yaml'),
      'schema: spec-driven\nwaivers:\n  - principle: I\n    reason: internal scaffolding\n'
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

  it('outputs parsed clauses and waivers', async () => {
    const { analyzeInstructionsCommand } = await import(
      '../../src/commands/workflow/analyze-instructions.js'
    );
    await analyzeInstructionsCommand({ change: 'demo', json: true });
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.constitutionPresent).toBe(true);
    expect(parsed.clauses[0]).toMatchObject({ id: 'I', level: 'MUST' });
    expect(parsed.waivers[0]).toMatchObject({ principle: 'I' });
    expect(Array.isArray(parsed.artifacts)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/commands/analyze-instructions.test.ts -v`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

`src/commands/workflow/analyze-instructions.ts`:

```typescript
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

export interface AnalyzeArtifactRef { id: string; path: string; exists: boolean; }
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
```

`src/cli/index.ts` — `instructions` action 追加分支：

```typescript
import { analyzeInstructionsCommand } from '../commands/workflow/analyze-instructions.js';

// ...else if 链中:
} else if (artifactId === 'analyze') {
  await analyzeInstructionsCommand({ change: options.change, json: options.json });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/commands/analyze-instructions.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/workflow/analyze-instructions.ts src/cli/index.ts test/commands/analyze-instructions.test.ts
git commit -m "feat: add openspec instructions analyze command"
```

---

### Task 6: 宪法运行时注入 artifact instructions

**Files:**

- Modify: `src/core/artifact-graph/instruction-loader.ts:71-104,318-340`
- Modify: `src/commands/workflow/instructions.ts:107-168`（`printInstructionsText` 输出 `<constitution>` 块）
- Modify: `test/core/artifact-graph/instruction-loader.test.ts`

**Interfaces:**

- Consumes: `readConstitutionFile(projectRoot)`
- Produces: `ArtifactInstructions` 新增可选字段 `constitution?: string`

> 与 `config.context` 一致，注入对**所有** artifact 生效（proposal/design/specs/tasks…）。propose/design 是主要受益者；其余 artifact 拿到宪法亦无害。

- [ ] **Step 1: Write the failing test**

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

### Task 7: `/opsx:constitution` workflow skill

**Files:**

- Create: `src/core/templates/workflows/constitution.ts`
- Modify: `src/core/templates/skill-templates.ts`
- Modify: `src/core/shared/skill-generation.ts`（注册 `constitution` 的 skill 与 command）
- Modify: `test/core/shared/skill-generation.test.ts`（skill 与 command 计数同步 11→12）

**Interfaces:**

- Consumes: `openspec instructions constitution --json`（template/writingRules/existingContent/configContext/configRules/**migrationHints**）
- Produces: `getConstitutionSkillTemplate()`, `getOpsxConstitutionCommandTemplate()`

> skill **消费** CLI 给出的 `migrationHints`（机械检测结果）：逐条向用户展示 `[constitution]/[linter]/[keep]` 建议并请其确认，**不再自己重新分类**——单一来源。

- [ ] **Step 1: Write the failing test**

```typescript
// skill 计数 11 → 12
it('should return all 12 skill templates', () => {
  expect(getSkillTemplates()).toHaveLength(12);
});
expect(dirNames).toContain('openspec-constitution');

// command 计数 11 → 12
it('should return all 12 command templates', () => {
  expect(getCommandTemplates()).toHaveLength(12);
});
expect(ids).toContain('constitution');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts -v`
Expected: FAIL — length 11

- [ ] **Step 3: Write minimal implementation**

```typescript
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
```

注册到 `skill-templates.ts` 与 `skill-generation.ts`（`getSkillTemplates` 与 `getCommandTemplates` 各加一条，`workflowId`/`id: 'constitution'`）。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/templates/workflows/constitution.ts src/core/templates/skill-templates.ts src/core/shared/skill-generation.ts test/core/shared/skill-generation.test.ts
git commit -m "feat: add opsx constitution workflow skill"
```

---

### Task 8: `/opsx:analyze` workflow skill

**Files:**

- Create: `src/core/templates/workflows/analyze.ts`
- Modify: `src/core/templates/skill-templates.ts`
- Modify: `src/core/shared/skill-generation.ts`
- Modify: `test/core/shared/skill-generation.test.ts`（skill 与 command 计数同步 12→13）

**Interfaces:**

- Consumes: `openspec instructions analyze --change <name> --json`（clauses/waivers/artifacts）、artifact 文件内容
- Produces: `getAnalyzeChangeSkillTemplate()`, `getOpsxAnalyzeCommandTemplate()`

> 条款、waivers、artifact 清单由 CLI 嚼好给出；skill 只读 artifact 内容 + 对每条 judgment 判据做 AI 评估，并按 `principle ↔ clause.id` 匹配 waiver。

- [ ] **Step 1: Write the failing test**

```typescript
// skill 计数 12 → 13
it('should return all 13 skill templates', () => {
  expect(getSkillTemplates()).toHaveLength(13);
});
expect(dirNames).toContain('openspec-analyze-change');

// command 计数 12 → 13
it('should return all 13 command templates', () => {
  expect(getCommandTemplates()).toHaveLength(13);
});
expect(ids).toContain('analyze');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts -v`
Expected: FAIL — length 12

- [ ] **Step 3: Write minimal implementation**

```typescript
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
```

Command template: `OPSX: Analyze` / `/opsx:analyze`（`getOpsxAnalyzeCommandTemplate()`，`id: 'analyze'`）。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run test/core/shared/skill-generation.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/templates/workflows/analyze.ts src/core/templates/skill-templates.ts src/core/shared/skill-generation.ts test/core/shared/skill-generation.test.ts
git commit -m "feat: add opsx analyze pre-apply workflow skill"
```

---

### Task 9: `openspec init` 可选 constitution 骨架

**Files:**

- Create: `src/core/init-constitution.ts`
- Modify: `src/core/init.ts`（`createConfig` 附近调用 `createConstitutionSkeletonIfMissing`）
- Create: `test/core/init-constitution.test.ts`

**Interfaces:**

- Consumes: `loadConstitutionBundle()`
- Produces: init 时在交互模式或 `--force` 下生成 `openspec/constitution.md` 骨架；门控（交互/`--force`）在 `init.ts` 调用方决定，helper 只负责"缺则写、有则跳"

- [ ] **Step 1: Write the failing test**

```typescript
// test/core/init-constitution.test.ts
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

```typescript
// src/core/init-constitution.ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadConstitutionBundle } from './constitution/index.js';
import { FileSystemUtils } from '../utils/file-system.js';

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

### Task 10: 构建验证（无代码改动）

**Files:**

- Verify only: 不修改 `verify-change.ts`、`archive-change.ts`

**Interfaces:**

- Consumes: 全部前述任务
- Produces: 绿色测试套件 + `pnpm run build` 通过

> skill/command 计数测试已在 Task 7（→12）与 Task 8（→13）随各自任务更新，本任务不再改测试，仅做端到端验证。

- [ ] **Step 1: 全量测试**

Run: `pnpm test`
Expected: PASS（含 skill 与 command 各 13 个的断言）

- [ ] **Step 2: 构建**

Run: `pnpm run build`
Expected: PASS（`schemas/constitution/` 随包发布，已在 `package.json` `files` 的 `schemas` 条目内；`build.js` 只跑 tsc，schemas 在运行时从包根直接读，无需复制）

- [ ] **Step 3: 手动冒烟**

```bash
node bin/openspec.js instructions constitution --json | head -20
node bin/openspec.js instructions analyze --change <某 change> --json | head -20
```

Expected: 前者含 `template`/`writingRules`/`migrationHints`；后者含 `clauses`/`waivers`/`artifacts`

---

## Self-Review

### Spec coverage（§9 实现范围）

| 需求 | 任务 |
| --- | --- |
| schema/template 层 constitution artifact | Task 2, 4 |
| 条款解析 + 迁移检测（机械核心） | Task 3 |
| `constitution.ts` workflow | Task 7 |
| `analyze.ts` workflow + analyze CLI | Task 5, 8 |
| project-config 读取 + 注入 | Task 6 |
| ChangeMetadataSchema waivers | Task 1 |
| init 可选骨架 | Task 9 |
| 迁移辅助（机械检测 + skill 消费确认） | Task 3, 4, 7 |
| verify/archive 不动 | 明确排除，无任务 |

### Placeholder scan

无 TBD/TODO/"similar to Task N"/无代码步骤。

### Type consistency

- `Waiver.principle`（罗马）↔ `ConstitutionClause.id`（罗马）↔ analyze skill `waivers[].principle` 匹配条款
- `ConstitutionClause` ↔ `parseConstitution()` ↔ `AnalyzeInstructions.clauses` ↔ analyze skill
- `MigrationHint` ↔ `detectConfigMigrationHints()` ↔ `ConstitutionInstructions.migrationHints` ↔ constitution skill
- `ArtifactInstructions.constitution` ↔ `printInstructionsText` / 全 artifact 注入

### 死代码检查

- `parseConstitution` → 调用方 Task 5 analyze CLI ✓
- `detectConfigMigrationHints` → 调用方 Task 4 constitution CLI ✓
- 无"仅被测试引用"的函数。

### 已知边界（非 gap）

- judgment 判据评估由 AI 执行（与 verify 同模式，无可避免）；structure 判据评估亦由 AI 对照 artifact 完成——CLI 只保证"条款/waiver/artifact 清单确定"，不替 AI 下结论。
- "MUST 违反阻塞 apply" 是 **skill 层建议性约束**（与 verify 同），非代码 gate。
- 传递性论证（code ⊨ constitution）依赖一个**假设**：analyze 须主动确认每条 plan 级原则确实体现在 artifacts 里；SHOULD 原则若未固化为具体 spec requirement，verify 不保证抓到代码漂移。
- migration 的 `classify()` 是启发式**预筛**，最终归类由用户在 constitution skill 里确认（人机协同），不追求 100% 准确。
- probe 集成属独立 change，本 plan 不实现。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-opsx-constitution-design.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
