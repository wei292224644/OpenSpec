# Superpowers 深度分析报告

> 生成日期：2026-06-23
> 分析对象：[`obra/Superpowers`](https://github.com/obra/Superpowers) —— 面向 AI 编码助手的软件开发方法论技能集
> 分析目的：理解其纪律体系、核心技能、工作流与 OpenSpec 的互补关系

---

## 1. 执行摘要

**Superpowers** 是一套为 AI 编码助手（Claude Code、Cursor、Copilot CLI、Gemini 等）设计的**软件开发方法论**，以可组合技能（composable skills）和初始指令（initial instructions）的形式存在。它不是简单的 prompt 集合，而是一套**纪律框架**：

- **设计先于实现**：`brainstorming` 强制在写代码前完成设计并获用户批准（HARD-GATE）。
- **计划必须可执行**：`writing-plans` 要求计划假设执行者是“零上下文、品味差、不爱测试的初级工程师”。
- **TDD 铁律**：`test-driven-development` 规定“没有先失败的测试就不能写生产代码”。
- **根因优先**：`systematic-debugging` 规定“没有根因调查就不能修复”。
- **证据优先**：`verification-before-completion` 规定“没有最新验证证据就不能声称完成”。
- **代码审查门**：`requesting-code-review` / `receiving-code-review` 把 review 内嵌到每个任务后。
- **子代理驱动**：`subagent-driven-development` 用隔离子代理执行每个任务，并逐任务 review。

Superpowers 的核心价值是**把工程纪律从“建议”变成“硬性规则”**。这与 OpenSpec 当前“轻量、快速、低 ceremony”形成鲜明对比，正好补上 OpenSpec 在 TDD、验证 gate、代码审查、调试方法上的缺口。

---

## 2. 项目概览

| 属性 | 内容 |
|---|---|
| 仓库 | [`obra/Superpowers`](https://github.com/obra/Superpowers) |
| 定位 | AI 编码助手的软件开发方法论 |
| 许可证 | MIT |
| 支持平台 | Claude Code、Cursor、GitHub Copilot CLI、Gemini CLI、OpenCode、Pi、Kimi 等 |
| 插件形式 | `.claude-plugin`、`.cursor-plugin`、`.codex-plugin`、`.kimi-plugin`、`.opencode`、`.pi` |
| 核心交付 | `skills/` 目录下的 Markdown 技能文件 |
| 治理文件 | `CLAUDE.md`、`AGENTS.md`、`GEMINI.md` |

仓库结构：

```
skills/                           # 核心技能
  brainstorming/
  writing-plans/
  executing-plans/
  subagent-driven-development/
  dispatching-parallel-agents/
  test-driven-development/
  systematic-debugging/
  verification-before-completion/
  requesting-code-review/
  receiving-code-review/
  using-git-worktrees/
  finishing-a-development-branch/
  using-superpowers/
  writing-skills/
docs/                           # 平台集成与方法论文档
assets/                         # 品牌资源
scripts/                        # 辅助脚本
tests/                          # 技能测试
```

来源：[`api.github.com/repos/obra/Superpowers/contents`](https://api.github.com/repos/obra/Superpowers/contents)

---

## 3. 核心技能全景

| 技能 | 类型 | 核心 Iron Law / 原则 | 一句话作用 |
|---|---|---|---|
| `brainstorming` | 流程 | **HARD-GATE**：用户批准设计前不得实施 | 把想法变成设计规格 |
| `writing-plans` | 流程 | 计划必须零上下文可执行，无占位符 | 把规格变成可执行计划 |
| `executing-plans` | 流程 | 执行前必须批判性审阅计划 | 按计划逐步执行 |
| `subagent-driven-development` | 流程 | 每个任务用新子代理 + 逐任务 review | 子代理执行与 review |
| `dispatching-parallel-agents` | 流程 | 每个独立问题域一个子代理 | 并行调查独立失败 |
| `test-driven-development` | 纪律 | **Iron Law：NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST** | 先写失败测试 |
| `systematic-debugging` | 纪律 | **Iron Law：NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST** | 系统化调试 |
| `verification-before-completion` | 纪律 | **Iron Law：NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE** | 验证后才能声称完成 |
| `requesting-code-review` | 协作 | 每个任务/功能/合并前必须 review | 派发 reviewer subagent |
| `receiving-code-review` | 协作 | 先验证再实现，技术性评估而非表演赞同 | 处理 review 反馈 |
| `using-git-worktrees` | 工具 | 优先原生隔离，回退 git worktree | 工作区隔离 |
| `finishing-a-development-branch` | 工具 | 先验证测试，再呈现选项 | 分支收尾 |
| `using-superpowers` | 元 | 1% 可能适用就必须调用相关 skill | 技能调度协议 |
| `writing-skills` | 元 | **Iron Law：NO SKILL WITHOUT A FAILING TEST FIRST** | 用 TDD 写技能 |

---

## 4. 跨技能核心原则

### 4.1 证据先于主张（Evidence over Claims）

`verification-before-completion` 是这一原则的最高体现：

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

任何“完成”、“通过”、“好了”的说法，在运行验证命令之前都是不允许的。这与 OpenSpec 当前 `verify-change.ts:145-148` “只输出建议、不阻塞 archive”形成直接对比。

### 4.2 先失败后通过（Red-Green-Refactor）

`test-driven-development` 的 Iron Law：

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

并且强调：

- 如果先写了代码，**必须删除**，从头开始。
- 不允许“保留作为参考”、“边写测试边适配”等变通。
- 测试必须先失败，且失败原因正确（不是 typo）。

### 4.3 根因先于修复

`systematic-debugging` 的 Iron Law：

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

四阶段：

1. Root Cause Investigation（根因调查）
2. Pattern Analysis（模式分析）
3. Hypothesis and Testing（假设与验证）
4. Implementation（修复实现）

关键红线：

- “先临时修一下，以后再调查” → 禁止。
- “再试一次修复” → 2 次以上失败必须停止。
- 3 次以上修复失败 → 质疑架构，而不是继续 patch。

### 4.4 设计先于代码

`brainstorming` 的 HARD-GATE：

```markdown
<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it.
</HARD-GATE>
```

这条规则适用于“每一个项目”，包括 todo list、单函数工具、配置变更。Superpowers 明确反对“这个太简单，不需要设计”。

### 4.5 计划必须可执行

`writing-plans` 假设执行者：

- 是熟练开发者，但**几乎不了解工具集和问题域**。
- **品味可疑**。
- **不爱测试**。

因此计划必须：

- 每个任务 2-5 分钟。
- 每个任务包含 Files、Interfaces、具体步骤、实际命令/代码。
- 无占位符（无 TBD、无 “implement later”）。
- 输出到 `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`。

### 4.6 子代理隔离与 review

`subagent-driven-development` 的核心公式：

```
Fresh subagent per task + task review (spec + quality) + broad final review = high quality, fast iteration
```

- 每个任务派新的 implementer subagent，不继承 session 历史。
- 每个任务完成后必须 review。
- 使用 ledger（`.superpowers/sdd/progress.md`）记录进度，重启时优先读 ledger 而不是依赖记忆。

### 4.7 技能即 TDD

`writing-skills` 把技能编写本身当作 TDD：

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

- RED：在子代理上运行压力场景，**不带 skill**，记录失败行为。
- GREEN：写最小 skill，针对观察到的合理化借口（rationalizations）。
- REFACTOR：关闭 loopholes，重新测试直到防弹。

---

## 5. 核心技能深度解析

### 5.1 `brainstorming`：设计批准门

`brainstorming` 是 Superpowers 的入口。它的 9 步检查清单：

1. Explore project context
2. Offer visual companion just-in-time
3. Ask clarifying questions（一次一个）
4. Propose 2-3 approaches（带 trade-offs）
5. Present design（分段，每段获批准）
6. Write design doc 到 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
7. Spec self-review
8. User reviews written spec
9. Transition to `writing-plans`

关键约束：

- **One question at a time**
- **Multiple choice preferred**
- **YAGNI ruthlessly**
- **设计批准后才能进入 writing-plans**

### 5.2 `writing-plans`：可执行计划

输出结构要求：

- Goal（一句话）
- Architecture（2-3 句）
- Tech Stack
- Global Constraints（来自 spec 的原文）
- Tasks：每个任务含 Files、Interfaces、具体 checkbox 步骤

每个任务粒度：2-5 分钟。示例步骤：

1. Write failing test
2. Run to verify failure
3. Minimal implementation
4. Run to verify pass
5. Commit

### 5.3 `executing-plans` vs `subagent-driven-development`

| 维度 | `executing-plans` | `subagent-driven-development` |
|---|---|---|
| 适用场景 | 无 subagent 支持或简单任务 | 有 subagent 支持 |
| 执行方式 | 当前 agent 逐步执行 | 每个任务派新子代理 |
| Review | 每个任务或自然检查点 review | 每个任务后必须 review |
| 上下文管理 | 依赖当前 session | 通过 ledger 和 task brief 隔离 |

两者共同规则：

- 开始前宣布使用哪个 skill。
- 批判性审阅计划，发现问题先提。
- 遇到 blocker 必须停下求助，不猜测。
- 完成时使用 `finishing-a-development-branch`。

### 5.4 `test-driven-development`：TDD 铁律

TDD 循环详细到每一步都有验证：

```
RED    → Verify RED (must fail correctly)
GREEN  → Verify GREEN (all tests pass, output pristine)
REFACTOR → Verify still GREEN
```

并且明确列出“Red Flags - STOP and Start Over”：

- Code before test
- Test after implementation
- Test passes immediately
- “I already manually tested it”
- “Tests after achieve the same purpose”
- “TDD is dogmatic, I'm being pragmatic”

### 5.5 `verification-before-completion`：完成门

五步 gate 函数：

```
1. IDENTIFY: 什么命令能证明这个主张？
2. RUN: 执行完整命令（全新、完整）
3. READ: 读取完整输出、退出码、失败数
4. VERIFY: 输出是否确认主张？
   - NO → 用证据说明实际状态
   - YES → 用证据说出主张
5. ONLY THEN: 作出主张
```

“跳过任何一步 = 撒谎，不是验证。”

### 5.6 `requesting-code-review` / `receiving-code-review`

`requesting-code-review`：

- 强制场景：subagent-driven 每个任务后、完成主要功能后、合并前。
- Reviewer 只能获得精心构造的上下文，**不能获得 session 历史**。
- 发现 Critical 立即修复，Important 在继续前修复，Minor 记录到最终 review。

`receiving-code-review`：

- 收到反馈后六步：Read → Understand → Verify → Evaluate → Respond → Implement。
- **禁止表演式赞同**：不能说 “You're absolutely right!”、“Great point!”、“Thanks!”。
- 必须验证反馈是否适合当前代码库，必要时 push back。

### 5.7 `using-git-worktrees`：隔离工作区

三步原则：

1. **Detect existing isolation first**：先检查是否已在 worktree/submodule 中。
2. **Prefer native tools**：优先使用平台原生 worktree 工具（如 Claude Code 的 `EnterWorktree`）。
3. **Fall back to git**：没有原生工具才用 `git worktree add`。

强调不要与 harness 对抗，项目本地目录必须被 `.gitignore` 忽略。

### 5.8 `finishing-a-development-branch`：分支收尾

流程：

1. 先验证测试通过，否则停止。
2. 检测环境（是否在 worktree、base branch 等）。
3. 呈现结构化选项：本地合并 / 推送并创建 PR / 保持分支 / 丢弃。
4. 执行选择。
5. 仅对“合并”和“丢弃”清理 worktree；PR 分支保留 worktree 以便迭代。

---

## 6. Superpowers 工作流全貌

```
想法
  ↓
[brainstorming]  → 设计规格（需用户批准）
  ↓
[writing-plans]  → 可执行计划
  ↓
[using-git-worktrees] → 隔离工作区
  ↓
[executing-plans] 或 [subagent-driven-development]
  ↓ 每个任务
[test-driven-development]  → 红绿重构
  ↓
[requesting-code-review]   → 任务 review
  ↓
[verification-before-completion] → 验证完成
  ↓
[finishing-a-development-branch] → 合并/PR/清理
```

此外：

- 调试时调用 `systematic-debugging`。
- 多个独立失败时调用 `dispatching-parallel-agents`。
- 任何行动前调用 `using-superpowers` 检查是否应调用其他 skill。
- 写/改 skill 时调用 `writing-skills`。

---

## 7. 优点深度分析

### 7.1 把纪律变成可执行规则

Superpowers 最大贡献是把工程最佳实践从“建议”变成“技能”，通过 Iron Law 和 HARD-GATE 强制模型遵守。模型很难再 rationalize “这次例外”。

### 7.2 覆盖软件工程全生命周期

从设计（brainstorming）到计划（writing-plans）到执行（subagent-driven-development）到测试（TDD）到调试（systematic-debugging）到验证（verification-before-completion）到 review 到收尾，形成闭环。

### 7.3 强调证据与可验证性

`verification-before-completion` 和 TDD 的“watch it fail”都把“证据”放在“主张”前面。这对防止 AI 幻觉和自我确认偏见非常有效。

### 7.4 子代理架构提高质量

`subagent-driven-development` 通过隔离上下文、逐任务 review，避免单一会话中的上下文污染和累积错误。ledger 机制还解决了中断恢复问题。

### 7.5 技能编写本身受 TDD 约束

`writing-skills` 让技能质量可被验证，而不是“写的越长越好”。通过压力场景测试，确保技能在高压下仍被遵守。

### 7.6 多平台、可组合

Superpowers 以插件形式支持多个 agent 平台，且技能之间可组合。用户可以选择性启用，不需要一次性接受整个方法论。

---

## 8. 缺点与失效模式

### 8.1 启动成本高

完整工作流需要多次用户批准（设计规格、计划、每个任务前的选择），对小型改动或快速迭代会显得笨重。

### 8.2 对简单任务过度设计

虽然 `brainstorming` 声称“即使 todo list 也要设计”，但很多时候用户确实只需要快速改一行配置。强制设计可能导致“work about work”。

### 8.3 依赖 subagent 支持

`subagent-driven-development` 需要运行时支持子代理。在不支持或支持有限的平台（某些 IDE 扩展、简单 CLI），无法完全发挥其优势。

### 8.4 Iron Law 可能僵化

TDD 和 verification-before-completion 的严格性在某些场景下可能适得其反：

- 探索性原型：先写测试会扼杀快速试错。
- 配置/脚本：测试收益低，成本高。
- 已有无测试遗留代码：强制“先删代码”不现实。

Superpowers 自己也承认有例外（需人类伙伴批准），但默认措辞极其强硬。

### 8.5 用户疲劳

多次批准、多次 review、每个任务后验证，可能导致用户感到疲惫，尤其当 AI 能力足够强、本可一次性完成时。

### 8.6 学习曲线陡峭

技能数量多、相互依赖，新用户需要理解：

- 何时调用哪个 skill。
- skill 之间的调用顺序。
- 如何处理 blocker、review 反馈、worktree 清理。

这比 OpenSpec 的“几个 slash 命令”复杂得多。

### 8.7 对代码库规模大的项目效率存疑

每个任务 fresh subagent、每个任务后 review、频繁的测试运行，在大型代码库中可能带来显著延迟。

---

## 9. Superpowers vs OpenSpec 对比

| 维度 | Superpowers | OpenSpec |
|---|---|---|
| **核心思想** | 完整方法论 + 强制纪律 | 轻量 delta spec + 动量优先 |
| **设计门** | 硬 gate（HARD-GATE） | 无明确 gate，`propose.ts:110` 倾向保持动量 |
| **TDD** | Iron Law | 文档几乎不谈，apply 循环不强制 |
| **调试** | 系统化四阶段 | 仅暂停等待用户指导 |
| **验证** | Iron Law，阻塞完成 | `verify` 不阻塞 archive |
| **代码审查** | 每个任务/功能/合并前 review | 无 review 步骤 |
| **工作区隔离** | git worktree / 子代理隔离 | 无内置隔离 |
| **子代理** | 核心工作方式 | 未使用 |
| **输出产物** | design doc、plan、tasks、ledger、review 报告 | proposal、design、tasks、delta specs |
| **仪式级别** | 高 | 低 |
| **最佳场景** | 复杂功能、团队治理、高质量要求 | 快速迭代、小改动、已有项目增量 |
| **主要风险** | 过重、官僚化、用户疲劳 | 纪律不足、archive 前验证弱、并行合并问题 |

---

## 10. 对 OpenSpec 的启示

### 10.1 应该直接引入的纪律

1. **设计批准 gate**
   - 在 `/opsx:propose` 生成 design.md 后，增加用户确认步骤。
   - `/opsx:probe` 也可以作为设计前对齐工具，但probe 结果应被用户确认后才能进入 propose。

2. **TDD 提示**
   - 在 `tasks.md` 模板中加入“先写失败测试”步骤。
   - 在 `/opsx:apply` 中提示 red-green-refactor。

3. **验证 gate**
   - 把 `/opsx:verify` 从“建议”升级为“完成前必须运行”。
   - 在 `/opsx:archive` 前要求测试/构建通过。

4. **调试方法**
   - 给 `/opsx:apply` 增加错误处理协议：复现 → 最小化 → 假设 → 验证 → 修复。

5. **代码 review**
   - 在关键任务或 feature 完成后，提示派发 reviewer subagent。

### 10.2 需要适配后引入

1. **子代理驱动**
   - OpenSpec 的 `/opsx:apply` 可以支持可选的 subagent 模式：每个 task 派一个 implementer，完成后 review。
   - 但不作为默认，因为不是所有平台都支持 subagent。

2. **worktree 隔离**
   - 在支持 worktree 的平台上，可以在 `/opsx:apply` 前提示创建隔离工作区。
   - OpenSpec 已有 changes 目录，可结合分支或 worktree 实现隔离。

3. **计划粒度**
   - Superpowers 要求任务 2-5 分钟，对大型功能来说太细。
   - OpenSpec 可以保持较大任务粒度，但要求每个任务有明确的验证命令。

### 10.3 不应该照搬

1. **完整工作流 ceremonies**
   - OpenSpec 用户选择它是因为轻量。不应把 Superpowers 的 9 步 brainstorming 作为默认。

2. **无条件 Iron Law**
   - “先删代码”在维护遗留代码时不现实。应作为默认提示，保留人类覆盖权。

3. **每个任务都 review**
   - 对小改动可以跳过，或只在 feature 完成后 review。

### 10.4 对 `/opsx:probe` 的定位建议

`/opsx:probe` 可以融合 Superpowers 的设计前 gate 和 Matt Pocock grilling 的交互风格：

- 用 grilling 的方式一次一问、带推荐答案、代码库优先。
- 用 Superpowers 的纪律要求产出结构化产物：`probe-report.md`。
- 在 probe 结束后，必须获得用户明确批准才能流向 `/opsx:propose` 或 `/opsx:apply`。
- probe 报告应检查现有 artifacts 是否满足 Superpowers 式质量标准（无占位符、有独立可测 scenario、有成功标准）。

---

## 11. 结论

Superpowers 是 AI 辅助软件开发中最**系统化、最纪律化**的方法论之一。它通过 Iron Law、HARD-GATE 和子代理架构，把工程最佳实践变成模型必须遵守的规则。

对 OpenSpec 来说，Superpowers 的价值不是“替代现有工作流”，而是**提供一套可选的纪律层**：

- **短期**：在 `/opsx:probe`、`/opsx:apply`、`/opsx:archive` 中加入 TDD、验证、review 提示。
- **中期**：引入可选的 constitution/设计批准门、subagent 执行模式、worktree 隔离。
- **长期**：让 OpenSpec 既能保持轻量优势，又能在需要时切换为 Superpowers 式高纪律模式。

如果把 OpenSpec 比作“敏捷脚本”，Superpowers 就是“重型工程手册”。两者结合，可以让 OpenSpec 在简单改动上快，在复杂改动上稳。

---

## 12. 来源

- [`obra/Superpowers` 仓库](https://github.com/obra/Superpowers)
- [`skills/brainstorming/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/brainstorming/SKILL.md)
- [`skills/writing-plans/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/writing-plans/SKILL.md)
- [`skills/executing-plans/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/executing-plans/SKILL.md)
- [`skills/subagent-driven-development/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/subagent-driven-development/SKILL.md)
- [`skills/dispatching-parallel-agents/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md)
- [`skills/test-driven-development/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/test-driven-development/SKILL.md)
- [`skills/systematic-debugging/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/systematic-debugging/SKILL.md)
- [`skills/verification-before-completion/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/verification-before-completion/SKILL.md)
- [`skills/requesting-code-review/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/requesting-code-review/SKILL.md)
- [`skills/receiving-code-review/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/receiving-code-review/SKILL.md)
- [`skills/using-git-worktrees/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/using-git-worktrees/SKILL.md)
- [`skills/finishing-a-development-branch/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/finishing-a-development-branch/SKILL.md)
- [`skills/using-superpowers/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/using-superpowers/SKILL.md)
- [`skills/writing-skills/SKILL.md`](https://github.com/obra/Superpowers/blob/main/skills/writing-skills/SKILL.md)
- [`README.md`](https://github.com/obra/Superpowers/blob/main/README.md)
- [`AGENTS.md`](https://github.com/obra/Superpowers/blob/main/AGENTS.md)
