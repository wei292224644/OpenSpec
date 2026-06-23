# `/opsx:probe` 设计文档

> 生成日期：2026-06-23
> 来源：多 agent 深度分析（grilling × SpecKit × Superpowers）+ 苏格拉底式用户决策对话
> 状态：已批准，待实现

---

## 1. 问题陈述

OpenSpec 的核心价值是"轻量、delta、动量优先"。`propose.ts:110` 明确写着 _"prefer making reasonable decisions to keep momentum"_——这是有意识的设计选择，不是历史债务。

但这个选择带来了一个结构性缺陷：**AI 在不够清楚的情况下会自行假设，而这些假设被藏进 artifacts 里，用户看不到**。结果是：proposal.md 看起来完整，但其中隐藏着未经验证的猜测；当这些猜测在实现阶段暴露时，已经付出了大量成本。

根因不是 OpenSpec 不问问题（`propose.ts` 已有 `AskUserQuestion` 调用），而是两点：
1. 动量原则压制了深度——AI 宁可假设也不停下来问
2. 大多数模型思考深度不够——即使 AI "想深"，它也会遗漏重要分支

架构需要补上模型深度的不足，而不是依赖模型自己想全。

---

## 2. 设计决策（来自用户确认）

| 决策点 | 结论 | 理由 |
|--------|------|------|
| "保持动量"原则 | **保留**，这是 OpenSpec 特性 | 不是错误，是差异化卖点 |
| 补什么缺口 | **前置深度（A）** | 架构弥补模型深度不足，优先于事后约束 |
| probe 产出形式 | **probe-report.md**（持久化文件） | 跨会话可用；对话结论不随上下文压缩消失 |
| 问题结构 | **6 层树**作为导航地图 | 给 AI 一张地图，而不是一张表格 |
| 交互风格 | **grilling 风格** | 比固定问卷更深——relentless、depth-first、codebase-first |
| 停止条件 | **无强制**，问题自然耗尽 | "如果真的没有问题，就不会再产生问题了" |
| 与 propose 的关系 | **软提示 + 读取融合** | 不打动量，但假设必须留痕 |

**明确不引入的机制：**
- brainstorming HARD-GATE（与流体工作流根本冲突）
- 全局 TDD Iron Law（拖慢迭代，对 AI 生成代码不现实）
- subagent 编排（OpenSpec 作为跨工具框架不能假设宿主能力）
- 完整 SpecKit 阶段 ceremony（violation of "轻量"核心价值）

---

## 3. probe 的定位

```
explore（发散，找形状）
    ↓
probe（收敛，定决策）    ←── /opsx:probe（可选，用户主动调用）
    ↓
propose（落 artifacts）
    ↓
apply → verify → archive
```

probe 是 OpenSpec 工作流中**可选的前置对齐阶段**。它的存在理由：用架构（问题树 + grilling 交互）弥补模型在设计前无法自然达到的思考深度。

---

## 4. 交互模型：grilling 风格

probe 不是一张问卷，而是一场对话。交互规则：

### 4.1 一次一问
每次只提出一个问题，等待用户回答后再继续。连续抛出多个问题会让用户 overwhelming，且无法根据上一个答案调整下一个问题的方向。

### 4.2 推荐答案必须附证据
每个问题都给出 AI 的推荐答案。推荐答案必须来自以下之一：
- **代码库证据**：读了 `openspec status --json`、现有 specs、或相关业务代码后得出的结论
- **显式标注假设**：如果没有代码证据，必须标注"基于通用假设，未经查证"

不允许凭空断言强推荐（反例：explore.ts:223 的 "SQLite. Not even close." 是反模式）。

### 4.3 代码库优先
如果一个问题可以通过读现有 artifacts 或代码回答，**先读，不问**。probe 的提问只针对代码库无法回答的歧义。

优先读取顺序：
1. `openspec status --json`（了解现有 change 状态和 artifacts）
2. `openspec instructions --json`（了解 schema 约束）
3. 现有 specs（`openspec/specs/`）
4. 相关业务代码

### 4.4 深度优先遍历
沿着一个分支深挖，直到该分支清晰，再转向下一个。不要在一个问题还模糊的时候就跳到另一个分支。

当用户回答模糊时，继续追问：
- "你说'差不多'，我理解为 X，对吗？"
- "这个决定对 Y 有影响——Y 的处理方式你希望是...？"

### 4.5 relentless，但尊重用户
不放过真正的歧义，但当用户明确说"默认"/"不知道"/"随你"时，记录为开放假设并继续。用户随时可以说"够了，开始"来结束 probe。

---

## 5. 问题树（6 层导航地图）

树是 AI 的导航地图，不是强制检查清单。AI 根据对话动态决定遍历顺序和深度。

```
L1: 范围与意图（Scope）          ← 必须覆盖
├── 这个 change 解决什么问题？为什么现在做？
├── 明确不包含什么？（anti-scope）
└── 受益方是谁/什么系统？

L2: 影响面（Impact）             ← 必须覆盖
├── 触碰哪些现有 spec？会修改还是新增？
├── 触碰哪些现有代码模块？
├── 有什么东西依赖于我们要改的部分？（下游）
└── 这个 change 依赖哪些前提条件？（上游）

L3: 设计决策（Design）           ← 按复杂度
├── 有哪 2-3 种实现方案？各自的权衡？
├── 推荐哪个方案？理由？（须附代码证据）
├── 关键接口/数据结构会如何变化？
└── 与现有架构模式是否一致？如不一致，为什么？

L4: 边界与失败（Failure）        ← 按复杂度
├── 什么情况下这个 change 会失败？
├── 失败时系统状态是什么？可恢复吗？
├── 有没有安全/性能/并发隐患？
└── 边界条件是什么？（最小/最大/空输入）

L5: 成功标准（Success）          ← 按复杂度
├── "完成"的可度量定义是什么？
├── 什么测试能证明它正确工作？
└── 什么信号能告诉我们做错了？

L6: 开放假设（Open）             ← 始终输出
├── AI 对现有代码做了哪些假设（未经查证）？
├── AI 对项目约定做了哪些假设？
└── 哪些问题是 AI 不知道、自行猜测的？[NEEDS CLARIFICATION]
```

**覆盖规则：**
- L1、L2：任何 change 都必须覆盖
- L3、L4、L5：根据 change 复杂度，简单改动可快速过
- L6：始终输出，即使其他层很快就清晰了

---

## 6. probe-report.md 结构

```markdown
# Probe Report: <change-name>

> 生成时间：<timestamp>
> probe 会话摘要：<N 个问题，M 个决策，K 个开放假设>

## 已确认的决策

### 范围与意图
- **问题**：...
- **AI 推荐**：...（证据：<文件:行号 或 "通用假设">）
- **用户确认**：...

### 影响面
...（同格式）

### 设计决策
...（同格式）

### 成功标准
...（同格式）

## 开放假设 [NEEDS CLARIFICATION]

以下内容是 AI 在无法确认的情况下做出的假设，将被显式带入 artifacts：

- [ ] `[ASSUMED]` <假设内容> — 影响：<哪个 artifact 的哪个部分>
- [ ] `[ASSUMED]` ...

## 建议的下一步

- [ ] 运行 `/opsx:propose <change-name>` 生成 artifacts
- [ ] 或运行 `/opsx:continue <change-name>` 更新现有 artifacts
```

---

## 7. 与 `/opsx:propose` 的集成

### 7.1 无 probe-report.md 时（软提示）

propose 在开始前输出一行：

```
未检测到 probe-report.md。如需更深度的设计对齐，可先运行 /opsx:probe <change-name>。
```

然后照常继续，动量不受影响。

### 7.2 有 probe-report.md 时（读取融合）

propose 必须：
1. 读取 probe-report.md 的所有已确认决策，作为生成 artifacts 的显式输入
2. 将 L6 的 `[ASSUMED]` 开放假设**显式写入** proposal.md 的 `## Open Assumptions` 区块
3. 不允许把开放假设默默消化掉——假设必须对用户可见

这条是核心约束：**AI 可以假设，但不能把假设藏起来。**

---

## 8. 停止条件

probe 没有强制的结束条件。它结束的方式有两种：

1. **自然耗尽**：AI 发现 L1-L6 已经没有真正歧义的问题需要问了
2. **用户主动结束**：用户说"够了"/"开始实现"/"就这样"

当 probe 结束时，AI 立即生成 probe-report.md 并提示下一步。

> _"如果真的没有问题，就不会再产生问题了。"_

---

## 9. 不在本设计范围内的内容

以下是在苏格拉底对话中**明确排除**的内容，后续 change 可以评估：

| 排除项 | 原因 |
|--------|------|
| brainstorming HARD-GATE | 与 OpenSpec 流体工作流根本冲突 |
| 全局 TDD Iron Law | 拖慢迭代；对 AI 生成/遗留代码不现实 |
| subagent 编排 | 跨工具框架不能假设宿主能力 |
| SpecKit 完整阶段命令 | 违背"轻量"核心价值 |
| verification-before-completion 作为 archive 硬阻塞 | 可单独评估，不属于本 change 范围 |
| domain-modeling / CONTEXT.md | 长期价值但偏离薄命令哲学 |

---

## 10. 实现范围

本设计对应的实现工作：

1. **新增 `src/core/templates/workflows/probe.ts`**
   - `/opsx:probe` skill template
   - OPSX: Probe command template

2. **修改 `src/core/templates/workflows/propose.ts`**
   - 读取 probe-report.md 逻辑
   - 无 probe-report 时的软提示
   - 有 probe-report 时 L6 假设进入 artifacts

3. **新增 probe-report.md schema**（可选）
   - 在 `src/core/schemas/` 添加 probe-report schema 定义

---

## 参考分析

- `docs/mattpocock-grilling-analysis.md`：grilling 交互模型来源
- `docs/speckit-analysis.md`：`[NEEDS CLARIFICATION]` 机制和模板约束
- `docs/superpowers-analysis.md`：verification 机制和 Iron Law 纪律
- `docs/superpowers-openspec-gap-analysis.md`：OpenSpec 当前缺口代码证据
