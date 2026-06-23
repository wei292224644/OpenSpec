# 改写 apply 阶段：加入 TDD 层策略

> 生成日期：2026-06-23
> 来源：苏格拉底式探讨——apply 是否应像 mattpocock-grilling 那样加 TDD 纪律
> 状态：已批准，待实现
> 关联：[code-quality-constraints-strategy](./2026-06-23-code-quality-constraints-strategy.md)（本设计 = 第 3 层"正确性"的落地）、[constitution](./2026-06-23-opsx-constitution-design.md)、[probe](./2026-06-23-opsx-probe-design.md)

---

## 0. 一句话定位

给 `/opsx:apply` 的实现循环加一套**轻量 TDD**：每个任务以"对应 scenario → 失败测试 → 实现 → 绿"推进，并把"任务完成"重新定义为"**测试通过**"。默认开、schema 可调、无测试器则降级。

---

## 1. 问题陈述

现阶段 apply 的实现循环（`apply-change.ts` step 6，lines 71–84）是一个**纪律真空**：

```
对每个任务：展示任务 → 改代码 → 标记完成（- [ ] → - [x]）→ 下一个
```

后果：
- **"完成"= 写了代码**，不是"代码正确"。完成模板甚至直接打印 "7/7 tasks complete ✓"（line 115），**没有跑过任何东西**。
- 全代码库零 TDD/test-first 信号（已查证）；tasks 模板是空壳。
- 这正是 `code-quality-constraints-strategy` 第 3 层标注的"测试纪律弱"。

**对比 Matt Pocock 体系**：grilling 只管访谈，TDD 是**独立 skill**，在"设计固化后进入实现"时才跑。映射到 OpenSpec：实现阶段 = apply。所以 TDD 纪律的正确落点就是 apply。

---

## 2. 为什么 apply-TDD 适合 OpenSpec（关键协同）

**OpenSpec 的 scenario 本来就是测试用例。** spec 的 WHEN/THEN/AND 格式被反复描述为"可读作 test case"（`onboard.ts:305`、`spec.schema.ts:81`）。

于是 apply-TDD 不需要凭空造测试——**直接把任务对应的 scenario 翻译成失败测试**。spec→test 的桥是现成的。这让 OpenSpec 比通用工具更适合在 apply 跑 TDD。

---

## 3. 已确认的决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 落点 | **apply 的 step 6 实现循环** | apply 是执行者指令集；实现阶段是 TDD 的家 |
| 强度 | **轻 TDD 默认，非全局铁律** | 全局 Iron Law 与"保持动量"冲突（probe 设计已否决） |
| 真牙 | **"任务 done" 重定义为"测试存在且绿"** | apply 能验终态（跑测试）；这是可机械兜住的部分 |
| 不假装的 | **不证明 test-first 时序** | OpenSpec 看不到编辑器，跨工具不能假设；诚实承认 |
| 可调 | **schema/config 开关** | 文档/脚手架/spike 不该被拖住；契合"复杂度在 schema" |
| 降级 | **无测试运行器则跳过** | 跨工具不能假设宿主，但"能跑测试"对多数宿主合理 |
| 范围 | **只管正确性，不管架构** | 架构走 design 期 analyze（见策略文档）；TDD 不越界 |

---

## 4. 改写后的 step 6 循环

### 4.0 测试锚定 scenario，不锚定 task（解决多对多）

正确性的单元是 **scenario**（它是可测契约），工作的单元是 **task**——两者是不同的轴。强行"每 task 一测试"正是多对多错配的根源。纠正：

- **测试 ↔ scenario** 一对多锚定（1 个 scenario → ≥1 测试）。这是稳定锚。
- **task** 仍是进度单元（tasks.md 不动）。每个 task 在 apply 时被判定**推进哪些 scenario**（读 task + specs 推断；strict 下可要求 tasks 显式引用 scenario）。
- 一个 task 碰多条 scenario → 写/扩多个测试；一条 scenario 跨多个 task → 其测试在多个 task 间逐步转绿。皆自然成立。
- **change 级兜底门**：delta specs 里每条 scenario 最终都必须有绿测试——抓住没被任何 task 认领的 scenario（覆盖缺口）。

### 4.1 green 门挂在"闭合 task"，不是每个 task（关键修正）

因为 **scenario 通常比 task 粗**（一条 scenario 跨多个 task），"每个推进它的 task 都要它绿"是错的——早期 task（如只做表单 UI）推进了 scenario A，但 A 此刻不可能绿。修正：

- **测试在第一个推进 scenario X 的 task 开始时就写（RED）**——尽早钉住目标
- **green 要求挂在"闭合 X 的那个 task"**（最后一个推进 X 的 task）：它 done 前，X 必须绿
- **中间 task** 可在 X 仍 RED 时正常完成（合法 WIP）
- **change 级兜底门** = 真正的总闸：收尾时 delta 里每条 scenario 必须绿

> "闭合 task"由 apply 在运行时判定（它看得到全部 task + 该 scenario）。即便判错，change 级门也会兜住——没有 scenario 能带红收尾。

### 4.2 循环

```
对每个 pending 任务：
  1. 判定该任务推进哪些 scenario（来自 specs 的 WHEN/THEN/AND）
  2. 对尚无测试的 scenario：写失败测试钉死期望 → 确认 RED
  3. 写最小实现
  4. 运行相关测试
  5. （可选）refactor，保持已绿的不变红
  6. 标记任务完成：
       - 若该 task 闭合了某 scenario → 该 scenario 测试 GREEN 才允许 - [ ] → - [x]
       - 否则（部分推进 / 不推进 scenario）→ 代码写完即可打勾
```

与现状的关键差别：**第 6 步的闭合判定**。现在"打勾"= 写了代码；改写后"闭合 task 打勾"= **它闭合的 scenario 绿了**。

### 4.3 不推进 scenario 的任务

并非每个任务都推进用户 scenario（如纯重构、配置、迁移）。规则：
- **闭合 scenario 的 task** → 该 scenario 绿才 done
- **不推进 scenario 的 task** → 不要求测试（明确不要求，非"软鼓励"）
- 介于之间（产出可测行为但无 scenario）→ 鼓励补一个行为测试；strict 下要求或标 `no-test: <原因>` 留痕

---

## 5. 真牙 vs 诚实的限制

| | 能不能 | 怎么做 |
|---|---|---|
| 证明"先写测试"（时序） | ❌ 不能 | OpenSpec 看不到编辑顺序；不假装 |
| 保证"scenario 不带红收尾" | ✅ 能 | 闭合 task 打勾前 + change 收尾前，跑测试，红则拦 |
| 完成报告真实 | ✅ 能 | 完成模板（现 line 115 "7/7 ✓"）改为打印**实际测试运行结果**，而非凭空声称 |

拿不到时序纪律，但拿得到"**scenario 必须验证过才收尾**"——这把 apply 从"写完即完成"扳到"验证即完成"，捕获 TDD 的大部分价值。

---

## 6. 校准：默认开 + schema 可调 + 优雅降级

遵循薄命令 / schema 驱动哲学，TDD 强度不写死在 apply，而由 schema/config 调：

```
apply 读 status/instructions JSON →
  tddMode: "strict" | "default" | "off"（来自 schema 或 config）
    default : 闭合某 scenario 的 task，该 scenario 测试绿才允许 done；
              中间/不推进的 task 不被 green 门挡；
              change 收尾：每条**已覆盖**的 scenario 须绿，未覆盖的 → 告警(不阻塞)（推荐默认）
    strict  : default + change 级**全覆盖阻塞**（delta 每条 scenario 都须有绿测试）
              + 关闭 no-test 逃逸（需 waiver）；可要求 task 显式引用 scenario
    off     : 无测试门（文档型项目 / 探索 spike）
```

三档都是**机械可验**的规则，无"鼓励但不强制"的软语言。strict 与 default 的唯一差别 = strict 多一道 change 级全覆盖门 + 堵死 no-test 逃逸。

- **优雅降级**：检测不到测试运行器 → 提示并退回 off，不报错。
- 这对应 Matt Pocock 把 TDD 做成**独立可换 skill** 的思路——OpenSpec 用 schema 开关实现"可换"，而非新建命令。

---

## 7. 不做什么

| 排除项 | 原因 |
|---|---|
| 全局 TDD Iron Law（无条件强制） | 与"保持动量"冲突；probe 设计已否决 |
| 机械证明 test-first 时序 | 跨工具不能假设宿主、看不到编辑器；只会变空壳 |
| 用 TDD 管架构/风格 | 架构走 design 期 analyze，风格走 linter（见策略文档分层） |
| 新建独立 TDD 命令 | 纪律嵌进 apply（薄命令：不为每个纪律加命令） |

---

## 8. 实现范围

1. **`src/core/templates/workflows/apply-change.ts` 改写**
   - step 6 循环改为第 4 节的 TDD 微循环
   - "标记完成"加前置条件：测试 GREEN 才允许 `- [ ] → - [x]`
   - 完成输出模板（line 108–123）改为打印**真实测试结果**，去掉凭空 "N/N ✓"
   - guardrails 增补 TDD 相关项；读 `tddMode` 决定强度

2. **schema 层：新增 `tddMode` 配置**
   - spec-driven schema 默认 `default`
   - 经 `openspec status/instructions --json` 暴露给 apply
   - 允许 `config.yaml` 覆盖

3. **降级检测**
   - apply 探测测试运行器是否存在；无则提示 + 退 off

4. **（可选）tasks 模板 test-aware**
   - 引导每条 requirement 对应一个测试任务（结构层面，verify/analyze 可核对）

**不动**：verify（保持代码 vs spec 本职；但 apply 加 TDD 后，到 verify 时测试已大体就绪，verify 的"scenario 有无测试"检查命中率自然提高）、archive、constitution/analyze。

---

## 9. 与其他设计的关系

- **策略文档**：本设计 = 第 3 层"正确性"的具体落地（测试是 per-case 机械门）。
- **constitution + analyze**：analyze 在写代码前审方案；apply-TDD 在写代码时保证每步被验证。一前一后，互补。
- **probe**：probe 把需求/scenario 挖清楚 → apply-TDD 才有高质量 scenario 可翻译成测试。上游质量直接决定 TDD 测试质量。
- **副作用红利**：测试是新抽象的第一个真实调用者——"难测 = 抽象可能错"，apply-TDD 顺带给策略文档第 4 节"架构早暴露"提供了传感器。

---

## 参考

- `src/core/templates/workflows/apply-change.ts:71-84`：现状的实现真空循环
- `src/core/templates/workflows/apply-change.ts:108-123`：凭空声称 "N/N 完成" 的完成模板
- `schemas/spec-driven/templates/tasks.md`：现状空壳 tasks 模板
- `src/core/templates/workflows/onboard.ts:305`、`schemas/spec-driven/schema.yaml:81`：scenario = 可测试用例（spec→test 桥）
- `docs/mattpocock-grilling-analysis.md`：TDD 作为实现期独立 skill 的来源
