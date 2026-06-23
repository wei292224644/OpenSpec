# Matt Pocock `grilling` 深度分析报告

> 生成日期：2026-06-23
> 分析对象：[`mattpocock/skills`](https://github.com/mattpocock/skills) 中的 `grilling` / `grill-me` / `grill-with-docs` 技能链
> 分析目的：理解其交互机制、优势、缺陷，并判断哪些元素可融入 OpenSpec `/opsx:probe`

---

## 1. 执行摘要

`grilling` 是 Matt Pocock 技能库中**最核心、最被推崇**的交互模式。它把 AI 从“执行者”翻转成“提问者”：在用户写代码之前，先对用户计划进行 relentless（ relentless ）拷问，逐条梳理设计树的每个分支，直到双方达成共享理解。

其设计哲学非常明确：

- **人对齐优先于代码生成**：最大的工程失败不是代码写错，而是“我以为你懂我要什么”。
- **单点推进**：一次只问一个问题，避免信息爆炸。
- **推荐答案**：每个问题都给出 AI 的推荐选项，降低用户认知负担。
- **代码库优先**：如果问题可以通过查代码得到答案，就去查代码，而不是问用户。
- **文档 inline**：在 `grill-with-docs` 变体中，边问边写 `CONTEXT.md` 和 ADR，把对话结果沉淀为项目语言。

对 OpenSpec 的启示：`grilling` 提供了 `/opsx:probe` 所需的**苏格拉底式交互骨架**，但它缺少 Superpowers 的**硬 gate** 和**验证纪律**。两者融合时，应保留 grilling 的“单问题 + 推荐答案 + 代码库优先”，并补上 Superpowers 的“证据先行、设计批准才能实施”。

---

## 2. 研究对象与范围

| 技能 | 路径 | 类型 | 作用 |
|---|---|---|---|
| `grilling` | [`skills/productivity/grilling/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md) | Model-invoked | 可复用的拷问循环本体 |
| `grill-me` | [`skills/productivity/grill-me/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md) | User-invoked | 非代码场景的入口，调用 `/grilling` |
| `grill-with-docs` | [`skills/engineering/grill-with-docs/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md) | User-invoked | 工程场景入口，调用 `/grilling` + `/domain-modeling` |
| `domain-modeling` | [`skills/engineering/domain-modeling/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md) | Model-invoked | 维护 `CONTEXT.md`、ADR、统一语言 |

**注意**：`grilling` 虽然被标记为 `productivity`，但它不是普通效率工具，而是**前置对齐协议**。

---

## 3. 原始技能文本

### 3.1 `grilling`（核心循环）

```markdown
---
name: grilling
description: Interview the user relentlessly about a plan or design. Use when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases.
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a question can be answered by exploring the codebase, explore the codebase instead.
```

### 3.2 `grill-me`（非代码入口）

```markdown
---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

Run a `/grilling` session.
```

### 3.3 `grill-with-docs`（工程入口）

```markdown
---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
---

Run a `/grilling` session, using the `/domain-modeling` skill.
```

### 3.4 `domain-modeling`（文档沉淀纪律）

```markdown
---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. ...

## During the session

### Challenge against the glossary
When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately.

### Sharpen fuzzy language
When the user uses vague or overloaded terms, propose a precise canonical term.

### Discuss concrete scenarios
When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code
When the user states how something works, check whether the code agrees. If you find a contradiction, surface it.

### Update CONTEXT.md inline
When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen.

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing more.

### Offer ADRs sparingly
Only offer to create an ADR when all three are true:
1. Hard to reverse
2. Surprising without context
3. The result of a real trade-off
```

---

## 4. 工作机制拆解

### 4.1 调用链：三层包装

```
用户输入 /grill-me 或 /grill-with-docs
        ↓
User-invoked skill（仅一行转发指令）
        ↓
Model-invoked skill：/grilling（核心循环）
        ↓
可选：/domain-modeling（边问边写文档）
```

这种分层设计很关键：

- **用户入口极薄**：`grill-me` 和 `grill-with-docs` 都只有两行说明，真正复杂度下沉到可复用 skill。
- **可组合**：`grill-with-docs` 通过组合 `/grilling` + `/domain-modeling` 实现差异化，而不重写核心逻辑。
- **可扩展**：未来可以出现 `grill-with-tests`、`grill-with-security` 等变体，都复用 `/grilling`。

### 4.2 问题策略：深度优先遍历设计树

`grilling` 的核心隐喻是 **walk down each branch of the design tree**。这意味着：

- **深度优先**：先追问一个分支到叶子，而不是广度优先地罗列所有问题。
- **依赖顺序**：`resolving dependencies between decisions one-by-one` —— 决策 A 会影响决策 B，因此先敲定 A，再问 B。
- ** relentless **：不放过模糊点，直到达成 shared understanding。

举例：如果用户说“我要加一个登录页”， grilling 会沿着如下树展开：

```
登录页
├── 认证方式
│   ├── 邮箱+密码？
│   ├── 第三方 OAuth？（影响用户模型）
│   └── 是否需要 MFA？（影响 UI 和 后端）
├── 错误提示
│   ├── 密码错误如何显示？
│   ├── 账户锁定策略？
│   └── 是否暴露“用户是否存在”？
└── 登录后跳转
    ├── 默认回到原页面？
    ├── 是否有 onboarding 流程？
    └── 是否需要记住登录状态？
```

### 4.3 推荐答案：降低用户阻力

每个问题都附带 `recommended answer`。这不是让 AI 替用户决策，而是：

1. **提供默认选项**，减少用户从零思考的负担。
2. **暴露 AI 的假设**，让用户有东西可反驳。
3. **加速收敛**：用户可以说“对，就按这个”、“不是，应该是 X”、“为什么推荐这个？”。

这是一种**有锚定的协商**，比开放式问题更高效。

### 4.4 代码库优先原则

`If a question can be answered by exploring the codebase, explore the codebase instead.`

这条规则非常重要：

- **避免让用户复述已有信息**：如果代码里已经体现了某个设计，AI 应该自己读，而不是问。
- **强制 grounding**：问题和推荐答案都必须与代码实际状态一致。
- **减少幻觉**：AI 不会凭空假设项目约定。

对 OpenSpec 的意义： `/opsx:probe` 必须先把 `openspec/specs/`、`openspec/changes/`、代码库读完，再开始提问。

### 4.5 `domain-modeling` 的文档沉淀

`grill-with-docs` 把 grilling 升级为**可沉淀的对话**：

- `CONTEXT.md`：实时更新的项目 glossary，只放领域术语，不放实现细节。
- ADR：只在“难逆转、出人意料、有真实权衡”时创建。
- **术语挑战**：用户说“account”，AI 会问“是 Customer 还是 User？”
- **代码交叉验证**：如果用户描述的规则和代码矛盾，立即指出。

这让 grilling 不只产生“对话记录”，而是产生**项目资产**。

---

## 5. 优点深度分析

### 5.1 直击 AI 编码最大失败模式：误对齐

Matt Pocock 在 README 中引用《The Pragmatic Programmer》：

> “No-one knows exactly what they want.”

`grilling` 的设计假设是：用户最初的需求总是模糊的，AI 直接执行必然做错。通过前置拷问，把模糊需求转化为明确设计。

### 5.2 单问题节奏避免认知过载

多问题同时抛出会让用户“bewildering”。一次一个问题的设计：

- 给用户时间思考每个分支。
- 让 AI 能根据用户回答动态调整下一个问题。
- 形成真正的对话，而不是问卷。

### 5.3 推荐答案提供可反驳的锚点

没有推荐答案的苏格拉底式提问容易空洞。推荐答案让对话有抓手：用户不需要从零发明答案，只需要确认、修正或拒绝。

### 5.4 与代码库联动，减少重复提问

“代码库优先”让 AI 成为**有上下文的提问者**，而不是每次从零开始的面试官。这对已有代码库的功能迭代尤其重要。

### 5.5 文档沉淀把对话变成资产

`grill-with-docs` 的 `CONTEXT.md` 机制是长期收益：

- 后续 AI session 可以直接读 glossary，减少术语澄清成本。
- 新成员可以通过 glossary 快速理解项目语言。
- ADR 记录真实决策，避免未来重复讨论。

### 5.6 技能组合而非单体

`grilling` 本身只有 8 行指令，却能支撑多个入口。这种**小 skill 组合**的设计：

- 容易理解、容易修改。
- 不强制用户接受整个方法论，可以按需取用。
- 与 OpenSpec 的“薄命令 + 厚模板”哲学一致。

---

## 6. 缺点与失效模式

### 6.1 没有硬性停止条件

`until we reach a shared understanding` 是一个模糊目标。可能导致：

- **过度拷问**：对简单改动也问 20 个问题，造成“work about work”。
- **用户疲劳**：用户可能因不耐烦而敷衍回答，反而降低质量。
- **AI 无法判断何时停止**：完全依赖模型对“共享理解”的推断，可能过早或过晚结束。

### 6.2 没有与实施验证连接

`grilling` 只负责“想清楚”，不保证“做正确”。它缺少：

- 设计批准后不得实施的 gate。
- 每个答案是否被后续代码遵守的验证。
- TDD、测试运行、代码审查等执行纪律。

也就是说，它解决了 OpenSpec `propose.ts:110` 提到的“保持动量”问题，但没有解决“动量方向是否正确”的问题。

### 6.3 推荐答案可能变成引导性偏见

虽然推荐答案降低了认知负担，但也可能：

- **让用户默认接受 AI 的偏好**，即使不符合业务实际。
- **限制思考空间**：用户看到推荐后，可能不再考虑其他方案。
- **放大模型偏见**：如果 AI 的推荐基于训练数据中的常见模式，可能不适用于当前项目。

### 6.4 对高度探索性任务可能不适用

如果用户本身也不知道要做什么（例如早期产品探索）， grilling 的“拷问计划”假设存在一个可拷问的计划。此时：

- 用户无法给出明确答案。
- 问题会循环在“我也不知道”上。
- 更适合先进行自由式头脑风暴（如 OpenSpec `/opsx:explore`），再进入 grilling。

### 6.5 文档纪律依赖 `/domain-modeling` 组合

单独的 `/grilling` 不会写文档。只有用户主动调用 `/grill-with-docs` 才会沉淀 glossary 和 ADR。如果用户不知道这个变体，就会丢失长期收益。

### 6.6 对代码库规模大的项目效率存疑

“代码库优先”意味着每个可回答的问题都要先搜索代码。对大型代码库：

- 搜索成本可能很高。
- AI 可能找到过时的实现，给出错误推荐。
- 需要与代码索引、RAG 等机制配合。

---

## 7. 与相关方法的对比

| 维度 | `grilling` | 苏格拉底式提问 | Rubber Duck | 结构化头脑风暴（Superpowers） |
|---|---|---|---|---|
| **发起方** | AI 问用户 | AI 问用户 | 用户自言自语 | AI 引导，但有固定阶段 |
| **节奏** | 一次一问 | 可以连续多问 | 无结构 | 分阶段，可能有硬 gate |
| **推荐答案** | 有 | 通常无 | 无 | 有时有 |
| **代码库联动** | 强（代码库优先） | 弱 | 无 | 中 |
| **文档沉淀** | `grill-with-docs` 支持 | 无 | 无 | 有（设计 doc、ADR） |
| **实施验证** | 无 | 无 | 无 | 强（TDD、verify gate） |
| **最佳场景** | 已有初步计划，需要细化 | 通用教学 | 个人梳理思路 | 从 0 到 1 的系统设计 |

**关键结论**：

- `grilling` 是**轻量级对齐协议**，比 Superpowers 更灵活、更对话化。
- Superpowers 是**重型设计流程**，更适合架构级决策。
- 两者可以互补：`grilling` 负责挖掘细节，Superpowers 负责保证纪律。

---

## 8. 对 OpenSpec `/opsx:probe` 的借鉴

### 8.1 应该直接借用

1. **单问题节奏**：`/opsx:probe` 每次只问一个关键问题，等待用户回答。
2. **推荐答案**：每个问题给出 AI 的推荐选项，并说明理由。
3. **代码库优先**：在提问前，先读 `openspec/specs/`、`openspec/changes/`、相关代码；能查代码回答的问题不问用户。
4. **深度优先遍历**：沿着设计树的分支逐层下探，而不是广度罗列。
5. **术语挑战**：当用户用词与现有 spec/代码不一致时，立即指出并要求澄清。

### 8.2 需要适配

1. **输出 artifact**： grilling 本身不产出文档，但 `/opsx:probe` 应该产出 `probe-report.md`，记录问题、用户回答、推荐答案、代码证据。
2. **与 OpenSpec artifact 流程集成**：probe 的结果可以更新 `proposal.md`、`design.md` 或生成新的 tasks，而不是仅停留在对话层。
3. **停止条件**：定义清晰的退出条件，例如：
   - 用户主动说“够了，开始实现”。
   - 所有关键分支（范围、边界、错误处理、依赖）都已解决。
   - 连续两个问题用户回答“无/默认”时，自动收敛。

### 8.3 应该拒绝

1. **不要变成无限面试**：对简单改动，probe 应该能快速收敛，不能为了深度而深度。
2. **不要让推荐答案主导设计**：推荐答案只是锚点，最终决策必须显式来自用户。
3. **不要替代 verify**：probe 是设计前的对齐工具，不是实现后的验证工具。

### 8.4 与 Superpowers 的融合建议

`/opsx:probe` 可以定位为：

> **Superpowers 设计纪律的轻量化入口 + grilling 对话风格的执行者**

即：

- 用 `grilling` 的方式提问（单问题、推荐答案、代码库优先）。
- 用 Superpowers 的 discipline 结束（设计批准、 evidence-based、流向 `/opsx:propose` 或 `/opsx:apply`）。

---

## 9. 结论

`grilling` 是 Matt Pocock 技能库中最有工程价值的部分之一。它不是简单的“AI 多问你几句”，而是一套**对齐协议**：

- 通过单问题节奏避免认知过载。
- 通过推荐答案提供可反驳的锚点。
- 通过代码库优先保证 grounded。
- 通过 `domain-modeling` 把对话沉淀为项目语言。

但它也有明显边界：它不负责实施纪律、不保证设计被遵守、没有硬 gate。因此，把它融入 OpenSpec 时，不应原样搬运，而应：

1. 保留其核心交互风格。
2. 补上 Superpowers 的验证和 gate 纪律。
3. 将其输出绑定到 OpenSpec 的 artifact 流程（`probe-report.md` → `design.md` / `tasks.md`）。

`/opsx:probe` 如果做到这一点，就能成为 OpenSpec 工作流中“设计前深度对齐”的关键环节。

---

## 10. 附录 A：子 agent 深度补充

本附录汇总了专门派去阅读 `mattpocock/skills` 仓库的子 agent 的额外发现，重点补充了相关技能生态、`writing-great-skills` 中提到的设计原则，以及更细粒度的集成建议。

### 10.1 相关技能生态

`grilling` 不是孤立技能，它与同一仓库中的多个技能形成组合：

| 技能 | 路径 | 与 grilling 的关系 |
|---|---|---|
| `domain-modeling` | `skills/engineering/domain-modeling/SKILL.md` | 被 `grill-with-docs` 调用，负责边问边写 `CONTEXT.md` 和 ADR |
| `to-prd` | `skills/engineering/to-prd/SKILL.md` | 可在 grilling 结束后把共享理解沉淀为 PRD |
| `prototype` | `skills/engineering/prototype/SKILL.md` | 在 grilling 过程中或结束后构建可丢弃原型验证决策 |
| `tdd` | `skills/engineering/tdd/SKILL.md` | 设计固化后进入 TDD 实现 |
| `diagnosing-bugs` | `skills/engineering/diagnosing-bugs/SKILL.md` | 与 grilling 共享“一次只处理一件事”的哲学 |
| `handoff` | `skills/productivity/handoff/SKILL.md` | 长 grilling 会话后可生成交接文档 |
| `teach` | `skills/productivity/teach/SKILL.md` | 同样使用多轮状态化工作区，但用于知识传授 |
| `improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture/SKILL.md` | 扫描代码库后“grill through whichever one you pick” |
| `writing-great-skills` | `skills/productivity/writing-great-skills/SKILL.md` | 定义了“premature completion”、“leading words”等概念，可用于诊断 grilling 的缺陷 |

### 10.2 `writing-great-skills` 视角下的 grilling

`writing-great-skills` 强调一个技能必须避免 **premature completion（过早结束）**。`grilling` 的终止条件 “until we reach a shared understanding” 正好是一个**无法被直接检查**的目标，因此天然带有 premature completion 风险：

- AI 可能在并未真正对齐时自认为已经“共享理解”。
- 用户可能因为不耐烦而敷衍回答，导致 AI 误判。
- 没有明确的深度限制或停止信号。

这进一步说明：把 `grilling` 原样搬到 OpenSpec 是不够的，必须给它加上可检查的停止条件和产物约束。

### 10.3 更细粒度的失效模式

1. **无完成标准**：“shared understanding” 无法被验证。
2. **无深度限制/退出条件**：可能导致会话过长，用户疲劳。
3. **“复合问题”风险**：即使一次一问，问题本身可能包含两个子问题。
4. **假设用户随时在线**：不适合异步或批处理工作流。
5. **未处理“我不知道”**：用户无法回答时，AI 没有明确策略。
6. **代码库探索过宽**：如果 AI 把“探索代码库”理解得太宽，会读大量无关文件。
7. **推荐答案的引导性偏见**：可能把用户推向 AI 的默认偏好。
8. **核心技能无持久产物**：只有 `grill-with-docs` 才会写文档；`grilling` 本身只产生临时对话。

### 10.4 对 `/opsx:probe` 的 borrow / adapt / reject

| 类别 | 具体做法 |
|---|---|
| **Borrow（直接借用）** | 一次一问；每个问题带推荐答案；深度优先遍历设计树； relentless 的措辞；代码库优先；核心引擎与用户入口分离 |
| **Adapt（需要适配）** | 定义可检查的完成条件；增加深度限制或显式停止信号；处理用户“我不知道”的情况；产出持久产物 `probe-report.md`；在提问前先绘制 probe map；把问题映射到 OpenSpec 的 spec/design/tasks 结构 |
| **Reject（不应照搬）** | 仅产生临时对话；无结构地乱问；不支持批量/异步模式；像 `grill-me` 那样只有一行转发的薄入口 |

---

## 11. 来源

- [`mattpocock/skills` 仓库](https://github.com/mattpocock/skills)
- [`skills/productivity/grilling/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md)
- [`skills/productivity/grill-me/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md)
- [`skills/engineering/grill-with-docs/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md)
- [`skills/engineering/domain-modeling/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md)
- [`skills/productivity/writing-great-skills/SKILL.md`](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md)
- [`README.md`](https://github.com/mattpocock/skills/blob/main/README.md)
