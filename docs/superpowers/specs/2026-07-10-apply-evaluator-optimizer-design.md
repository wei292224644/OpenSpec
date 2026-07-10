# apply 引入 Evaluator-Optimizer 式独立 Review 门

> 生成日期：2026-07-10
> 来源：讨论"apply 没用上 host 工具(Claude Code/Cursor)自带的多 agent 能力"引出
> 状态：**已过一轮设计讨论，用户判断当前价值不大，先记录，暂不进入 writing-plans/实现**
> 关联：[opsx-apply-tdd-design](./2026-06-23-opsx-apply-tdd-design.md)（本设计是其 step 6 循环上叠加的一层，不改动 TDD 核心逻辑）

---

## 0. 一句话定位

给 apply 的"任务完成"前加一道可选的独立 Review 门：实现（generator）和评审（evaluator）用两个隔离上下文跑，而不是同一个 agent 自证自己写的代码没问题。落地形式是 Evaluator-Optimizer 模式（Anthropic《Building Effective Agents》命名的既有 pattern），不是自研机制。

---

## 1. 问题陈述

**现状**（`src/core/templates/workflows/apply-change.ts` 第113–134行）：单 agent 顺序跑完 write test → impl → green → mark complete → commit，全程同一个上下文。是否"实现取巧"（针对测试硬编码、断言测实现细节而非公开行为、擅自扩权）完全靠这同一个 agent 的自觉，没有独立视角挑刺。

**为什么这不只是"不够优雅"，是结构性缺陷**：据 harness engineering 文献（Addy Osmani，见 §5 引用），"agents reliably skew positive when grading their own work"——generator 在自己的推理轨迹里已经为选择辩护过，自评必然乐观。要真正核查，评审者必须是全新上下文、零投入，只看产物和标准，看不到实现过程的思路。

**当前只有一处多 agent 影子**：`archive-change.ts:70,188` 一次性 fire-and-forget 委派同步 specs，非并发、非评审性质。apply 循环里完全没有类似机制。

---

## 2. 采用的 pattern：Evaluator-Optimizer

出自 Anthropic《Building Effective Agents》+ Claude Cookbook 命名的既有 workflow：一个 LLM 调用生成方案（generator），另一个独立评判并给反馈（evaluator），循环直到通过或到轮次上限。适用前提：

- 评判标准能显式化、可核对
- 反馈确实能让下一轮变好
- evaluator 本身靠谱（不靠谱的 evaluator 只会导致原地震荡或橡皮图章）

**逻辑要点**（决定本设计取舍的核心分析）：
1. 标准必须在循环开始前定死，不能每轮临时加码——否则目标漂移、永远收敛不了（harness 文献称为"sprint contract"：generator/evaluator 开工前先谈好"done"是什么样）。映射到 apply：标准 = task 对应的 spec scenario 文本，本来就是 spec delta 里预先定好的，天然满足这条。
2. 反馈必须具体、可执行、点名标准出处，不能是"不够好"这种废话。
3. 终止条件只有两个：pass，或撞到轮次上限。撞上限**不能静默放行**，必须转成人工介入信号——否则这套机制等于白做。
4. 成本：每轮至少翻倍调用量，只该用在语义判断（取巧/擅自扩权/测试保真度），机械检查（lint/typecheck/测试跑没跑绿）该在更早、更便宜的一层挡掉——apply 现有 step 5"测试 GREEN"已经是那层，本设计只是叠加语义层，不重复。

**为什么两个 apply 场景里 review 模式不该被当作平权的两个选项**：`reviewMode: "self"`（同上下文自查）在这个 pattern 下有结构性偏差，不是"更省事的等价降级"；`reviewMode: "agent"`（真派生独立上下文）才是这个 pattern 该有的样子。文档/未来实现都要把这层讲清楚，不能把两者写成平级选项。

---

## 3. 已确认的决策（讨论过程中逐条敲定）

| 决策点 | 结论 | 理由 |
|---|---|---|
| 隔离强度 | **软约束，条件式原生派生**（方案B） | 不能锁死 Claude Code 专属机制（如 `.claude/agents/*.md`），要保跨平台；有原生 subagent 派生能力就用，没有就退化成"另开一遍自查" |
| 角色划分 | test-writer / implementer / reviewer 三角色，reviewer 有一票否决权 | 对应 evaluator 角色；watchdog(纪律检查) 与 reviewer 合并，同一件事 |
| 驳回处理 | 自动退回 implementer 重做，**有次数上限**（设计中定为 2 轮），超限转 blocked 交人工 | 不做严重度分级（曾提议 minor/critical 分级，用户选了更简单的二元版本） |
| 默认行为 | 新增 config 开关，**默认关**（opt-in） | 现有项目行为不变，用户自己勾选 |
| 并行 fan-out（备选方向） | 不在本次范围，列为正交的第二条线，可后续叠加 | 需要先解决任务依赖/文件重叠判断，复杂度明显高于角色拆分 |
| 预装角色定义文件（.claude/agents/*.md） | 不做，作为方案B之上的可选增强记一笔 | 违反"不锁死跨平台"这条硬约束 |
| loop engineering / 一人公司式框架（MetaGPT/ChatDev） | 明确排除 | 用户认为没必要到这个程度；且这些框架的角色流水线本质也只是"persona 提示词 + controller 路由"，没有额外机制值得抄 |

---

## 4. 若未来实现，落点(供后续 writing-plans 参考，非当前定案)

- **Config/类型层**：`project-config.ts` 加 `reviewMode: z.enum(['self','agent']).optional()`（仿照现有 `tddMode`/`commitMode` 字段与解析块写法）；`shared.ts` 的 `ApplyInstructions` 接口加 `reviewMode` 字段；`instructions.ts:290-292,375-376` 仿照 tddMode/commitMode 透传。CLI 本身零判断逻辑——门禁完全活在模板文字里。
- **模板流程**：`apply-change.ts` 第5步（测试 GREEN）和第7步（标记完成）之间插入 Review 子步骤。`reviewMode: "agent"` 时指令写成"若环境支持派生独立上下文的 subagent（如 Claude Code Task 工具），派生一个跑内嵌 reviewer prompt；不支持则自己另开一遍通读 diff"。reviewer 输出 pass/fail + notes，fail 打回 step 4 带 notes 重试，2 轮上限，超限进 Pause（复用现有"Output On Pause"格式）。
- **遗留待办**：仓库有模板 parity/snapshot 测试（近期 commit "test(templates): update parity snapshot hashes"），改 `apply-change.ts` 文字后这批 hash 需要重新生成——留给实现阶段处理。

---

## 5. 参考来源

- [Building Effective AI Agents \ Anthropic](https://www.anthropic.com/engineering/building-effective-agents) — Evaluator-Optimizer 定义与适用前提
- [Evaluator optimizer | Claude Cookbook](https://platform.claude.com/cookbook/patterns-agents-evaluator-optimizer)
- [Agent Harness Engineering — Addy Osmani](https://addyosmani.com/blog/agent-harness-engineering/) — "Agent = Model + Harness"、generator/evaluator 分离优于自评的论据、"success is silent, failures are verbose" 原则
- [9 Parallel AI Agents That Review My Code (Claude Code Setup) - HAMY](https://hamy.xyz/blog/2026-02_code-reviews-claude-subagents) — Claude Code 下真实的多 subagent code review 落地案例
- [Harness engineering for coding agent users — Martin Fowler](https://martinfowler.com/articles/harness-engineering.html)

---

## 6. 当前状态

讨论到此，用户判断"现在这套意义不大"，先落盘记录，不进入 writing-plans / 实现阶段。之后有需要时，从 §4 的落点继续走 superpowers:writing-plans。
