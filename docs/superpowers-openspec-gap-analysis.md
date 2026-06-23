# OpenSpec × Superpowers 深度差距分析

> 生成日期：2026-06-23
> 分析范围：OpenSpec `main` 分支工作流模板、核心逻辑、校验器、文档
> 对比对象：obra/Superpowers 方法论技能集

## 执行摘要

OpenSpec 是一个结构良好的 spec 驱动开发框架，artifact 脚手架、delta spec 合并、归档机制都已成型。但它的工作流模板和核心逻辑在**纪律性**上存在明显缺口：缺少“验证先于声称”、缺少 TDD、缺少计划先于代码的硬 gate、缺少系统化调试、缺少代码审查门、归档前也没有最终验证。这些缺口正好对应 Superpowers 的核心方法论。

本次分析把 OpenSpec 的每个工作流步骤拆开，逐条指出它现在做什么、缺什么、能对应 Superpowers 的哪个技能，并给出 `file:line` 证据。

---

## 1. 研究方法

1. 通读 OpenSpec 所有工作流模板：`src/core/templates/workflows/*.ts`。
2. 通读核心逻辑：`src/core/archive.ts`、`src/core/specs-apply.ts`、校验器、parser。
3. 通读文档：`docs/workflows.md`、`docs/commands.md`、`docs/concepts.md`。
4. 抓取 Superpowers 10 个核心 skill：`brainstorming`、`writing-plans`、`executing-plans`、`test-driven-development`、`systematic-debugging`、`verification-before-completion`、`requesting-code-review`、`receiving-code-review`、`using-superpowers`、`writing-skills`。
5. 逐条映射：OpenSpec 当前行为 → 缺失纪律 → Superpowers 理念 → 关键代码位置。

---

## 2. OpenSpec 当前工作流与缺口

### 2.1 Propose / Explore 阶段

#### 当前行为

- `/opsx:propose` 一次生成 proposal、specs、design、tasks 所有 artifacts（`src/core/templates/workflows/propose.ts:13-116`）。
- `/opsx:explore` 是完全自由的思考伙伴，没有固定步骤（`src/core/templates/workflows/explore.ts:13-288`）。
- `/opsx:new` 只搭骨架，不生成内容（`src/core/templates/workflows/new-change.ts:13-79`）。
- `/opsx:ff` 快进生成所有 artifacts（`src/core/templates/workflows/ff-change.ts:13-107`）。

#### 关键缺口

**A. 没有“计划先于代码”的硬 gate**

- `propose.ts:110` 的 guardrail 明确说："If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum." 这直接把速度置于严谨之上。
- `apply-change.ts:50-52` 只在 artifacts 缺失时 blocked，不检查设计是否自洽。
- 没有设计评审或 artifact 审阅步骤，生成 tasks 后直接进入实现。

**对应 Superpowers**：`writing-plans`（写计划时假设工程师零上下文、禁止占位符、要求精确路径）和 `brainstorming`（设计必须经用户逐 section 批准）。

**B. 没有 TDD / 测试先行提示**

- `propose.ts`、`ff-change.ts` 生成 tasks 时默认是普通 checkbox，没有“先写失败测试”的提示。
- `docs/workflows.md` 全篇只在 verify 里提到“检查测试是否存在”。

**对应 Superpowers**：`test-driven-development`（Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST）。

**C. 设计决策缺乏严谨性**

- `explore.ts:280-284` 说 "Don't force structure - Let patterns emerge naturally." 探索阶段自由是对的，但自由探索的结果直接进入 propose 时，没有结构化收敛。
- 没有“列出约束 → 生成备选方案 → 评估 → 决策”的强制流程。

**对应 Superpowers**：`brainstorming` 的强制设计流程和 `writing-plans` 的决策记录。

---

### 2.2 Apply 阶段（实现）

#### 当前行为

- `/opsx:apply` 读取 `tasks.md`，逐条执行未完成任务并勾选（`src/core/templates/workflows/apply-change.ts:13-164`）。
- 支持“fluid workflow”，不是 phase-locked。

#### 关键缺口

**A. 没有 RED-GREEN-REFACTOR 循环**

- `apply-change.ts:73-78` 的实现循环是：
  ```
  Show task → Make code changes → Mark complete → Continue
  ```
  没有“写失败测试 → 跑失败 → 写最小代码 → 跑通过 → 重构”。

**对应 Superpowers**：`test-driven-development`。

**B. 没有系统化调试方法**

- `apply-change.ts:80-84` 列出暂停条件（任务不清、设计问题、错误、用户打断），但遇到错误时只说 "report and wait for guidance"。
- 没有形成假设、最小化复现、逐变量测试、验证修复的流程。

**对应 Superpowers**：`systematic-debugging`（Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST）。

**C. 没有代码审查门**

- `apply-change.ts:145-153` 的 guardrails 只提 “Keep code changes minimal and scoped”，没有 review 步骤。
- `verify` 是 AI 自己做的启发式检查，不是独立 review。

**对应 Superpowers**：`requesting-code-review` 和 `receiving-code-review`。

**D. 没有预提交验证**

- `apply-change.ts:86-93` 完成时只展示“本 session 完成了哪些任务”，不要求跑测试、lint 或 build。
- 任务是否完成由 AI 自我断言，没有外部证据。

**对应 Superpowers**：`verification-before-completion`（Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE）。

---

### 2.3 Verify 阶段

#### 当前行为

- `/opsx:verify` 检查 Completeness、Correctness、Coherence 三个维度（`src/core/templates/workflows/verify-change.ts:13-177`）。
- 使用启发式搜索（关键词匹配）判断实现是否存在。
- 不阻塞 archive，只输出建议。

#### 关键缺口

**A. Verify 是可选的、事后的**

- `verify-change.ts:145-148`：即使有 CRITICAL issues，也只是建议 "Fix before archiving"，不会阻止 archive。
- `docs/workflows.md:277` 明确说 "Verify won't block archive"。

**对应 Superpowers**：`verification-before-completion` 要求 verify 是 gate，不是建议。

**B. Correctness 验证很弱**

- `verify-change.ts:79-86` 要求“搜索代码库找实现证据”，但明确接受低置信度："Use keyword search, file path analysis, reasonable inference - don't require perfect certainty."
- `verify-change.ts:89-94` 检查测试是否存在，但不运行测试。

**对应 Superpowers**：`test-driven-development` 和 `verification-before-completion` 都要求实际运行测试并看结果。

---

### 2.4 Archive 阶段

#### 当前行为

- `/opsx:archive` 检查 artifact 完成度、警告未完成任务、提供 spec sync、移动 change 文件夹（`src/core/templates/workflows/archive-change.ts:13-123`）。
- 核心合并逻辑在 `src/core/specs-apply.ts:102-347`。

#### 关键缺口

**A. 没有归档前验证 gate**

- `archive.ts:89-152` 的验证可被 `--no-validate` 跳过。
- `archive.ts:101` 说明 proposal 验证 "informative only (do not block archive)"。
- `archive.ts:179-194` 对未完成任务只弹警告，`--yes` 可完全绕过。

**对应 Superpowers**：`verification-before-completion`。

**B. 并行合并是已知损坏的**

- `openspec-parallel-merge-plan.md` 是整个项目的“认罪书”：两个并行 change 改同一条 requirement 时，后归档的会覆盖前一个，导致场景丢失。
- `src/core/specs-apply.ts:244-306` 的 `buildUpdatedSpec` 用 hash-map 替换 requirement block，没有 merge 语义。
- `bulk-archive-change.ts:75-78` 明确 “older first, newer overwrites”。

**对应 Superpowers**：`writing-plans`（merge 策略本身就该是计划的一部分）和 `verification-before-completion`（合并后必须验证没丢东西）。

**C. 合并后没有语义校验**

- `src/core/archive.ts:237-262` 归档后只对重建的 spec 做结构校验。
- `src/core/specs-apply.ts:434-446` 的 `applySpecs` 也只检查结构，不检查内容保真度。

**对应 Superpowers**：`verification-before-completion` 的 “Did we lose anything?” 检查。

---

### 2.5 核心逻辑缺口

#### A. 校验是结构性的，不是语义性的

- `src/core/validation/validator.ts:17-477` 检查 markdown 结构、SHALL/MUST 关键字、scenario 数量、delta section 是否存在。
- `src/core/validation/constants.ts:1-48` 的阈值全是字符数（MIN_WHY_SECTION_LENGTH=50，MAX_REQUIREMENT_TEXT_LENGTH=500），没有质量启发式。
- 不验证：requirements 是否自洽、scenarios 是否覆盖 requirement、design 是否可实现。

**对应 Superpowers**：`verification-before-completion` 的语义深度。

#### B. Change Parser 脆弱

- `src/core/parsers/change-parser.ts:84-148` 用简单 section 匹配解析 delta（`findSection(sections, 'ADDED Requirements')`），对 malformed deltas 没有容错。
- `src/core/parsers/requirement-blocks.ts:119-142` 的 `parseDeltaSpec` 按 `##` header 大小写分割，但对格式错误的 requirement block 处理不足。

**对应 Superpowers**：`systematic-debugging` 的韧性（parser 失败时应有明确诊断）。

#### C. 没有 base fingerprint

- `openspec-parallel-merge-plan.md:31-33` 提出在 change 创建或验证时把当前 requirement body 写入 `changes/<id>/meta.json`，但目前未实现。
- `src/core/specs-apply.ts:102-105` 的 `buildUpdatedSpec` 只接收 `update` 和 `changeName`，没有 base fingerprint 参数。

**对应 Superpowers**：`using-git-worktrees` / `writing-plans` 的隔离与版本记忆。

---

### 2.6 文档缺口

#### A. Workflows 文档完全不谈测试

- `docs/workflows.md:1-453` 只在 verify 小节提到测试，没有“写测试”步骤。

**对应 Superpowers**：`test-driven-development`。

#### B. Commands 文档弱化了 Verify

- `docs/commands.md:318-383` 把 `/opsx:verify` 描述成“验证实现是否符合 artifacts”，但例子只是启发式检查，且 archive 不依赖它。

**对应 Superpowers**：`verification-before-completion`。

#### C. Concepts 文档把“简单”等同于“轻量”

- `docs/concepts.md:9-14` 提出 "easy not complex — lightweight setup, minimal ceremony"。
- `docs/concepts.md:299-313` 说 "OpenSpec aims to avoid bureaucracy. Use the lightest level that still makes the change verifiable." 但没有定义什么叫“可验证”。

**对应 Superpowers**：`using-superpowers` 的高度——框架默认优化速度，而非正确性。

---

### 2.7 测试覆盖缺口

#### A. 测试验证结构，不验证行为

- `test/core/archive.test.ts:1-870` 全面测试归档机制（移动目录、spec 更新、delta 应用），但没有测试并行 change 是否保留所有场景。
- `test/core/validation.test.ts:1-680` 测试 schema 校验，但没有测试合并后 spec 的语义正确性。
- `test/cli-e2e/basic.test.ts:1-206` 的 E2E 测试只检查 CLI 输出格式。

**对应 Superpowers**：`test-driven-development` 对框架自身的要求。

---

## 3. Superpowers 核心技能速览

| Skill | 一句话总结 | 关键 Iron Law / HARD-GATE |
|---|---|---|
| `brainstorming` | 实现前必须经过自然对话形成完整设计 | 设计批准前不得实施 |
| `writing-plans` | 写计划时假设工程师零上下文、品味可疑 | 禁止占位符；精确路径；每步 2-5 分钟 |
| `executing-plans` | 加载计划、批判性审阅、执行、报告 | 遇到 blocker 必须停下求助 |
| `test-driven-development` | 先写失败测试，再写代码，再重构 | NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST |
| `systematic-debugging` | 找到根因再修复 | NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST |
| `verification-before-completion` | 没有新鲜证据就不能声称完成 | NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE |
| `requesting-code-review` | 尽早、频繁派发 reviewer subagent | 不得因“简单”跳过 review |
| `receiving-code-review` | 技术性评估反馈，不表演赞同 | VERIFY → EVALUATE → RESPOND → IMPLEMENT |
| `using-superpowers` | 统筹何时调用其他 skill | 1% 可能适用就必须调用 |
| `writing-skills` | 写 skill 本身就是 TDD | NO SKILL WITHOUT A FAILING TEST FIRST |

---

## 4. 缺口 → Superpowers 映射表

| OpenSpec 步骤 | 当前行为 | 缺失纪律 | Superpowers 理念 | 关键位置 |
|---|---|---|---|---|
| **Propose/Explore** | 一次生成 artifacts，保持动量 | 没有计划先于代码 gate；设计决策不严谨 | `brainstorming`, `writing-plans` | `propose.ts:110`, `apply-change.ts:50-52` |
| **Apply** | 直接实现 task | 没有 TDD/RED-GREEN-REFACTOR | `test-driven-development` | `apply-change.ts:73-78`, `onboard.ts:404-410` |
| **Apply（错误）** | 报错后等待用户指导 | 没有系统化调试协议 | `systematic-debugging` | `apply-change.ts:80-84`, `apply-change.ts:151` |
| **Apply（完成）** | 勾选 task 后继续 | 没有 code review，没有预提交验证 | `requesting-code-review`, `receiving-code-review`, `verification-before-completion` | `apply-change.ts:145-153` |
| **Verify** | 事后启发式检查 | 可选、不阻塞、不运行测试 | `verification-before-completion` | `verify-change.ts:145-148`, `docs/workflows.md:277` |
| **Archive** | 移动文件夹、合并 specs | 没有归档前 gate；并行合并会丢数据 | `verification-before-completion`, `writing-plans` | `archive.ts:89-152`, `specs-apply.ts:244-306`, `openspec-parallel-merge-plan.md` |
| **核心校验** | 结构检查 | 无语义一致性校验 | `verification-before-completion` | `validator.ts:17-477`, `validation/constants.ts:1-48` |
| **核心 Parser** | 简单 section 匹配 | 无容错、无 base fingerprint | `systematic-debugging`, `using-git-worktrees` | `change-parser.ts:84-148`, `requirement-blocks.ts:119-142` |
| **文档** | “简单不复杂” | 没有测试方法论 | `test-driven-development`, `using-superpowers` | `docs/concepts.md:9-14`, `docs/workflows.md:1-453` |
| **测试** | 结构测试 | 无并行合并行为测试 | `test-driven-development` | `test/core/archive.test.ts`, `test/core/validation.test.ts` |

---

## 5. 推荐接入策略

### 5.1 短期（本次修改即可做）

1. **新增 `/opsx:probe`**
   - 融合 `brainstorming` 的结构化问题树 + `grilling` 的苏格拉底式交互 + `verification-before-completion` 的证据意识。
   - 输出 `probe-report.md`，每个结论附带代码库证据。
   - 结束时可流向 `/opsx:propose` 或更新现有 change artifacts。

2. **给 `/opsx:apply` 注入 TDD 和调试提示**
   - 在每个 task 里提示：如果涉及行为变化，先写/更新测试，看失败，再写代码，再看通过。
   - 遇到错误时提示进入四阶段调试：复现 → 模式分析 → 假设验证 → 修复。
   - 不作为硬 gate，作为默认提示。

3. **给 `/opsx:archive` 加 pre-archive verification 提示**
   - 归档前检查：未完成任务、未跑测试、未解决 delta 冲突。
   - 高亮风险，但不强制阻塞（避免破坏现有工作流）。

### 5.2 中期（下一个 change）

1. **把 `verification-before-completion` 做成 gate**
   - archive 必须确认测试通过、lint 干净、tasks 完成。
   - apply 阶段每个 task 完成后要求运行对应测试。

2. **引入 base fingerprint 和 change sync**
   - 实现 `openspec-parallel-merge-plan.md` 的 Phase 0：在 change 元数据里记录 base requirement fingerprint。
   - archive 时检测主 spec 是否已漂移，漂移则 abort 或提示 sync。

3. **加入 code review subagent 模板**
   - 在 apply 阶段每个 task 完成后或 feature 完成后，派发独立 reviewer subagent。

### 5.3 长期（架构级）

1. **scenario-level delta 粒度**
   - 把 delta 从 requirement 级细化到 scenario 级，解决并行合并覆盖问题。

2. **结构化 spec graph**
   - 给 requirement/scenario 分配稳定 UUID，构建 AST-based IR，支持 operational transform 或 CRDT 式合并。

3. **Superpowers bootstrap 式 skill 自动调用**
   - 在 OpenSpec 的 agent instruction 里注入类似 `using-superpowers` 的 bootstrap，让模型在相关场景自动调用 `test-driven-development`、`systematic-debugging` 等 skill。

---

## 6. 关键证据文件清单

- `src/core/templates/workflows/propose.ts:13-116`
- `src/core/templates/workflows/explore.ts:13-288`
- `src/core/templates/workflows/apply-change.ts:13-164`
- `src/core/templates/workflows/verify-change.ts:13-177`
- `src/core/templates/workflows/archive-change.ts:13-123`
- `src/core/archive.ts:50-339`
- `src/core/specs-apply.ts:102-494`
- `src/core/validation/validator.ts:17-477`
- `src/core/parsers/change-parser.ts:84-148`
- `src/core/parsers/requirement-blocks.ts:119-142`
- `docs/workflows.md:1-453`
- `docs/commands.md:318-383`
- `docs/concepts.md:9-14`, `:299-313`
- `openspec-parallel-merge-plan.md`

---

## 7. 结论

OpenSpec 最缺的不是功能，而是**纪律**：

- 设计时不深挖（缺 `brainstorming` + `grilling`）。
- 实现时不写测试（缺 `test-driven-development`）。
- 出错时乱猜（缺 `systematic-debugging`）。
- 完成时不验证（缺 `verification-before-completion`）。
- 归档时不守门（缺 `verification-before-completion` + merge 策略）。

本次修改如果聚焦在 **新增 `/opsx:probe`**、**给 `/opsx:apply` 加 TDD/调试提示**、**给 `/opsx:archive` 加 pre-archive verification 提示**，就能以较小改动范围补上最严重的三个缺口。
