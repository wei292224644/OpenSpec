# `/opsx:constitution` 设计文档

> 生成日期：2026-06-23
> 来源：SpecKit constitution 机制拆解 + 苏格拉底式用户决策对话
> 总纲：**尽量遵循 SpecKit constitution，但符合 OpenSpec 理念**
> 状态：已批准，待实现
> 关联：[opsx-probe-design](./2026-06-23-opsx-probe-design.md)（共享同一批思路）

---

## 0. 一句话定位

**宪法是 plan 级的项目不变量**：在写代码之前，由独立的 `/opsx:analyze` 对照方案（proposal/design/specs）审判。宪法**不检查代码**——代码机械规则交给 linter/CI，代码兑现 spec 交给 verify。

---

## 1. 问题陈述

OpenSpec 已有项目级配置 `openspec/config.yaml`（`context` + `rules`），概念上是"宪法雏形"，但起不到约束作用。三个结构性缺陷：

1. **太薄、无身份**：规范性铁律（"spec 必须用产品行为语言"）和背景信息（"我们用 pnpm"）平铺在同一个 yaml 字段里，铁律被稀释，没有独立分量、版本、review。
2. **无执法**：`config.yaml` 只注入给 **propose（生成者本人）**。同一个 AI 既写 artifact 又"参考"约束，可以一边违反一边自我说服。**没有独立环节核对。**
3. **无立法工具**：`openspec init` 只写 `schema:` + 注释示例，`context`/`rules` 要裸手编辑。没有等价于 `/speckit.constitution` 的交互式撰写 skill。

**核心认知**：约束力来自"独立审判"机制，**不来自文件叫什么、是不是独立**。换皮不产生约束力。

---

## 2. 已确认的决策

| 决策点 | 结论 | 理由 |
|--------|------|------|
| 宪法载体 | **独立 `openspec/constitution.md`** | 给"法律"独立身份、可单独 review/版本化；匹配 SpecKit 心智 |
| **宪法范围** | **仅 plan 级**（对照 artifacts） | 宪法不碰代码；代码机械规则归 linter/CI（见第 6 节传递性论证） |
| 审判者 | **`/opsx:analyze`（独立 read-only，apply 前）** | 对标 `/speckit.analyze`；不塞 verify、不塞 archive |
| 执法刚性 | **建议性阻塞 + 可记录豁免** | 保持动量，但违反必须留痕、不能静默（"可见性优于禁止"）。阻塞由 skill 在 prompt 中执行（与 verify 同），非代码 gate——执法力来自"独立审判"环节本身 |
| 立法工具 | **新建 `/opsx:constitution` skill** | 补上缺失的立法环节 |
| 注入方式 | **运行时注入（像 context）**，拒绝静态级联 | OpenSpec 每次重读，无需 SpecKit 式 Sync Impact 传播 |

### 防碎片化硬约束（职责边界）

用户最反对"规则散落多处"。**规范性约束只能住一处**：

| 文件 | 只放 | 禁止放 |
|------|------|--------|
| `constitution.md` | plan 级规范性铁律（MUST/SHOULD，被 analyze 审判） | 技术栈描述、代码机械规则 |
| `config.yaml` `context` | 描述性背景（技术栈、领域知识） | 任何 MUST 句式 |
| `config.yaml` `rules` | artifact 战术提示（可选、非强制） | 跨切面原则 |
| linter / CI 配置 | 代码机械规则（path.join、no-console、测试覆盖…） | —— |

---

## 3. SpecKit → OpenSpec 机制映射

| SpecKit 机制 | 决定 | OpenSpec 化理由 |
|---|---|---|
| 独立文件，固定路径 | ✅ 照搬 | `openspec/constitution.md`，工具中立 |
| 编号条款 `I. II. III` + 标题 | ✅ 照搬 | 给"法律"分量感，成本极低 |
| MUST/SHOULD + 可测 + 拒绝模糊措辞 | ✅ 照搬 | 可执法的根基 |
| 立法 skill | ✅ 照搬 | `/opsx:constitution` |
| **宪法只对照 artifacts、从不扫代码** | ✅ 照搬 | SpecKit 的 analyze 只看 spec/plan/tasks，跑在 implement 之前；OpenSpec 同此 |
| 独立 read-only 审判命令 | ✅ 照搬 | 新建 `/opsx:analyze`（对标 `/speckit.analyze`） |
| MUST 违反 = 自动 CRITICAL | ✅ 照搬 | 机械定级 |
| Authority 条款（禁止重释/删除） | ✅ 照搬 | 堵死"放宽规则逃避违规" |
| 模板含占位符 | ♻️ 改造 | 模板进 schema/template 层，skill 经 CLI 动态拿（薄命令+厚模板） |
| Constitution Check GATE（plan 内） | ♻️ 改造 | OpenSpec 无 plan 阶段 → propose 注入（知情）+ analyze 审判方案 |
| 违反需写 justification | ♻️ 改造 | 映射为"可记录豁免"，保持动量但留痕 |
| 语义化版本 + 批准日期 | ♻️ 减重 | 独立文件 = git 即历史，只留一行轻量版本戳 |
| Sync Impact / 级联进模板 | ❌ 拒绝 | OpenSpec 运行时注入，每次重读，无需静态级联 |

---

## 4. `constitution.md` 结构

宪法只放 **plan 级**原则。每条原则带 ≥1 条**可测判据**，并标注类型 `[structure]` / `[judgment]`——给 analyze 看，据此选择核对手段（解析 artifact 结构 / 语义判断）。

```markdown
# Project Constitution: <project-name>

> Version: 1.0 · Last amended: 2026-06-23

## I. 产品行为语言 (MUST)

spec MUST 用产品行为语言描述可观察结果与产品契约，而非内部实现机制。
内部机制 MUST 放进 design.md / tasks.md，除非机制本身即产品契约的一部分。
- 判据[judgment]: 每条 requirement 读起来是"用户能观察到的结果"，而非函数/数据结构
    正例: "用户提交后 2 秒内看到确认"
    反例: "调用 saveToDb() 写入 orders 表"

## II. 可度量的成功标准 (MUST)

每个 change MUST 给出可度量的验收标准。
- 判据[structure]: proposal/specs 含可度量成功标准章节，且每条带具体阈值/信号

## III. 简单优先 (SHOULD)

design SHOULD 选择满足需求的最简方案，不引入超出当前需求的抽象。
- 判据[judgment]: design.md 中每处抽象/分层都能指出当前 change 里的具体驱动需求
```

> 注：像"路径必须用 `path.join()`""不许 console.log"这类**代码机械规则不进宪法**——它们是 linter/CI 的活（见第 6 节、第 11 节）。

**条款写法规则（由 `/opsx:constitution` 强制）：**
- 必须编号 + 标题 + 级别标注 `(MUST)` / `(SHOULD)`
- 必须用规范关键字（MUST/MUST NOT/SHOULD），**拒绝**模糊的 "should"/"try to"/"prefer"
- 每条必须带 ≥1 条**判据 + 类型标注** `[structure]`/`[judgment]`，否则 analyze 无法核对，skill 不让落地
- `judgment` 判据必须写成**逐项是非题**（"每条 X 是否…？"），不得整体扣帽子
- 一条原则只讲一件事（否则 analyze 无法把违反定位到具体条款）
- **只收 plan 级原则**：若一条规则只能靠扫代码判断，引导用户改放 linter/CI

---

## 5. `/opsx:constitution`（立法 skill）

定位：等价于 `/speckit.constitution`，引导用户把项目原则写成**可被 analyze 机械核对**的 plan 级条款。

### 5.1 薄命令实现

遵循薄命令哲学，skill 不内嵌模板，经 CLI 拿：

```
1. openspec status --json          → 确认项目/schema
2. openspec instructions constitution --json
                                    → 拿 constitution 模板 + 撰写规则
3. 读现有 constitution.md（若有）与 config.yaml 的 context/rules
4. 交互引导用户撰写/修订条款
5. 写入 openspec/constitution.md
```

> 实现依赖：需在 schema/template 层新增 `constitution` artifact 的模板与规则（见第 9 节）。

### 5.2 可测性阶梯

核心定义：**一条原则"可测"，当且仅当 analyze 能对照 artifacts 机械核对它。** 核对手段只有两种，落不进就不该进宪法：

| 类型 | analyze 怎么查 | 例子 |
|---|---|---|
| `structure` | 解析 artifact 结构 | "每条 requirement 至少 1 个 scenario" |
| `judgment` | 读 artifact 后判断一个逐项是非题 | "requirement 描述可观察行为，而非实现" |
| ❌ 需扫代码 | 不归宪法 → linter/CI | "路径用 path.join()" |
| ❌ 不可测 | 拒绝 | "代码要干净""尽量简洁" |

skill 的任务：能 `structure` 就别 `judgment`；只能靠扫代码 → 推去 linter/CI；一条都落不进 → 拒绝。

### 5.3 交互协议（grilling 风格，与 probe 一致）

对用户写下的每一条原则，skill 追问：

> **"如果有人违反了这条，analyze 在 proposal/design/specs 里看什么才能发现？"**

```
用户："spec 要写清楚"
skill：这是目标不是判据。违反时 analyze 在 artifact 里看什么？
用户："requirement 写成了实现细节"
skill：✅ 可逐条读判。归为 judgment。
       → I. 产品行为语言 (MUST)
         判据[judgment]: 每条 requirement 是可观察结果而非实现

用户："路径不能硬编码斜杠"
skill：这只能靠扫代码判断，不是 plan 级。
       → 不进宪法，建议加一条 ESLint 规则 / CI 检查。

用户："代码要优雅"
skill：❌ 不可测，无法核对。改写成可测，或降为 config.yaml 软提示。
```

### 5.4 交互行为

- **从代码库起草**：首次运行读 `config.yaml` 现有 `context`/`rules` 与代码约定，**起草**候选条款让用户确认，而非空手提问。
- **强制可测**：用 5.3 的问题逼出判据 + 类型；落不进阶梯则不让落地。
- **分流**：代码机械规则推去 linter/CI；模糊措辞要求改写或降级到 config.yaml。
- **迁移提示**：检测到 config.yaml 里混有 plan 级铁律时，提示迁移进 constitution.md（见第 8 节）。

---

## 6. 执法：只有 `/opsx:analyze` 一道门

### 6.1 三个动词各司其职（互不污染）

```
probe(可选)→ propose →
  ┌────────────────────────────────────────────┐
  │ /opsx:analyze ── 方案审判（写代码前，read-only） │
  │   对照 constitution 查 proposal/design/specs   │
  │   plan 级判据（structure / judgment）          │
  │   MUST 违反（无豁免）→ 阻塞，建议修方案          │
  └────────────────────────────────────────────┘
→ apply → verify（代码兑现 spec，不碰宪法）→ archive（纯归纳总结，不验证）
```

| 动词 | 职责 | 靶子 |
|---|---|---|
| `/opsx:analyze` | 宪法审判（方案越界）+ 一致性 | proposal/design/specs |
| `verify` | 代码兑现 spec | 代码 vs spec |
| `archive` | 合并 delta → 主 specs + 归档 | spec 文档（**不读代码、不验证宪法**） |

### 6.2 为什么"代码违宪"不需要单独验证（传递性论证）

宪法只剩 plan 级原则后，"代码有没有违宪"会**自动分解**成已有环节，无需新机制：

```
analyze:  spec/design  ⊨ 宪法        (写代码前，本设计)
verify:   code         ⊨ spec/design (写代码后，已有；Coherence 维度查代码偏离 design)
linter/CI: code        ⊨ 机械规则     (path.join 等，已有/应有)
─────────────────────────────────────
∴         code         ⊨ 宪法        (传递得到)
```

- 方案合宪由 analyze 保证；代码忠于（合宪的）方案由 verify 保证 → **代码传递性合宪**。
- 任何"必须看代码才能判"的规则都已不在宪法里（归 linter/CI）。
- 因此 **archive 回归纯归纳总结，一行代码都不读**。

> 小前提（**假设，非工具强制**）：analyze 须主动保证"每条 plan 级原则真的体现在 artifacts 里"，否则传递链断在第一环。这是 analyze 的职责约定；SHOULD 原则若未固化成具体 spec requirement，verify 的 code-vs-spec 不保证抓到代码漂移。

### 6.3 `/opsx:analyze`（SpecKit 原样）

- **时机**：propose 之后、apply 之前（pre-implementation gate，代码还不存在）
- **read-only**：只出报告，不改文件
- **对照**：constitution.md 的 MUST/SHOULD ↔ proposal/design/specs/tasks
- **检测 passes**（照搬 SpecKit）：
  - **Constitution Alignment** —— MUST 违反 → 自动 CRITICAL
  - 顺带：覆盖缺口（requirement→task 映射）、歧义、重复、不一致
- **机械定级 + 可豁免**（见第 7 节）

**Authority 条款（照搬 SpecKit）**：

> constitution 不可协商。发现 MUST 违反时，只能调整方案去迎合，**不得重新解释或删除条款**。修改 constitution 必须经 `/opsx:constitution` 单独进行，**不得在 analyze 过程中顺手改动**。

### 6.4 判据核对机制（误报防控）

总原则：**任何 CRITICAL 都必须能指向具体证据**（requirement ID / artifact 位置），拿不出具体定位的一律降 WARNING。这兼容 verify 现有的"不确定降级"启发式。

judgment 的证据闸门：

```
judgment 违反 → 必须引用具体证据（哪条 requirement + 违反判据的哪一点）
  有具体证据 → CRITICAL（阻塞）
  只有"感觉不对"，拿不出定位 → WARNING（回显，不阻塞）
```

配套：**逐项是非题**（逐条 requirement 判定，证据定位到具体某条）+ **正负例锚定**（条款带正/反例）+ **稳定 ID 锚定**（证据锚到 requirement ID，缓解非确定性）。

> 机械确定 vs AI 判断的分界：条款解析（`parseConstitution`）、waiver 匹配、artifact 清单、迁移预筛都由代码完成，经 `instructions analyze/constitution --json` 喂给 skill（确定输入）；只有 judgment/structure 判据的**评估结论**由 AI 给出。这样 AI 不会因读 markdown 读岔而漏条款，而无可避免的语义判断仍交给 AI（与 verify 同模式）。

---

## 7. 豁免机制（analyze 阶段，方案级）

保持动量，但违反必须留痕、不能静默。

### 7.1 豁免落点：`.openspec.yaml`（结构化），不靠解析 prose

| 落点 | 优点 | 缺点 |
|---|---|---|
| proposal.md `## Waivers` 区块 | 人最容易看见 | analyze 要解析散文 = 脆弱，**反 OpenSpec** |
| **`.openspec.yaml` `waivers` 字段** ✅ | Zod 校验、机械可读、工具链已在读、在 git 里 | dotfile，可见性稍弱 |

**结论：住 `.openspec.yaml`。** 它是 per-change 元数据的家（`ChangeMetadataSchema` 非 strict，加字段干净）。可见性靠"**analyze 报告高声回显 waiver**"解决。

### 7.2 waiver 结构

```yaml
# openspec/changes/<name>/.openspec.yaml
schema: spec-driven
created: 2026-06-23
goal: ...
waivers:
  - principle: I              # 对应 constitution.md 的条款编号
    reason: 该 change 是内部脚手架，无用户可观察行为
```

需在 `ChangeMetadataSchema`（`src/core/change-metadata/schema.ts`）新增可选 `waivers` 字段。

### 7.3 流转

```
analyze 发现违反 I.（judgment 命中某条 requirement）
  → 读 .openspec.yaml 的 waivers
  → 有 principle: I 的豁免？
      是 → 降级为 NOTE，报告高声回显："⚠ 已豁免 I. — 原因：…"
      否 → CRITICAL，建议修方案后再进 apply
```

原则：**豁免必须对用户可见、可追溯，绝不静默消化。**（与 probe 的 `[ASSUMED]` 留痕同源。）

---

## 8. 迁移方案

现有 `config.yaml` 的 `context`/`rules` 里混有不同性质的规则，按性质分流：

| 现有内容 | 迁移到 | 改写为 |
|---|---|---|
| `context`: "优先产品可观察行为而非实现" | **constitution.md** | `I. 产品行为语言 (MUST)` + judgment 判据 |
| `context`: "路径必须用 path.join()，绝不硬编码" | **linter/CI** | ESLint 规则 / CI 检查（**不进宪法**） |
| `rules.specs`: "显式列表而非模式匹配" | 看性质：plan 级→constitution；纯代码→linter | 对应改写 |
| `context`: "技术栈 TS/Node/pnpm" | 留在 config.yaml | 不动（纯描述性背景） |
| `rules.tasks`: "加 Windows CI 验证任务" | 留在 config.yaml（战术提示） | 不动 |

迁移由 `/opsx:constitution` 首次运行时辅助完成：`instructions constitution --json` 经 `detectConfigMigrationHints()` **机械预筛** `context`/`rules`，给出每条的 `constitution`/`linter`/`keep` 建议；skill **消费**这些 hint、逐条向用户展示并请其确认（机械检测一次、人机协同定夺，单一来源——不再让 skill 重复分类一遍）。

---

## 9. 实现范围

1. **schema/template 层：新增 `constitution` artifact**
   - 模板（`constitution.md` 结构）+ 撰写规则（编号/MUST/可测判据/拒绝模糊/只收 plan 级）
   - 使 `openspec instructions constitution --json` 返回模板、规则与 `migrationHints`

2. **机械核心：`src/core/constitution/{parser,migration}.ts`**
   - `parseConstitution()` 把宪法解析成结构化条款（id/level/判据类型）
   - `detectConfigMigrationHints()` 机械预筛 config.yaml 的迁移候选
   - 经 `instructions analyze/constitution --json` 暴露，skill 消费（不重复实现）

3. **新增 `src/core/templates/workflows/constitution.ts`**
   - `/opsx:constitution` skill + command（薄命令，经 CLI 拿模板与 migrationHints）

4. **新增 `src/core/templates/workflows/analyze.ts` + `instructions analyze` CLI**
   - `/opsx:analyze` skill + command（read-only，pre-apply）
   - CLI 给出已解析条款 + 已校验 waivers + artifact 清单（确定输入）
   - SpecKit 式检测 passes：Constitution Alignment（structure/judgment）+ 覆盖/歧义/一致性
   - Authority 条款 + 机械定级 + 按 `principle ↔ clause.id` 匹配 waivers 降级回显

5. **`project-config.ts` / 读取层**
   - 读取 `openspec/constitution.md`
   - 注入进**所有 artifact** 的 instructions（运行时注入，像 context；propose/design 尤其受益）

6. **`change-metadata/schema.ts` 扩展**
   - `ChangeMetadataSchema` 新增可选 `waivers` 字段（`principle` 罗马数字 / `reason`）

7. **`openspec init` 扩展（可选）**
   - init 时可选生成 constitution.md 骨架（或留给 `/opsx:constitution`）

8. **迁移辅助**
   - `detectConfigMigrationHints()` 机械预筛 + `/opsx:constitution` 消费确认（见第 8 节）

**不动的部分**：`verify`（保持代码兑现 spec 本职）、`archive`（保持纯归纳总结，不读代码、不验证宪法）。

---

## 10. 与 `/opsx:probe` 的关系

两个独立特性，共享同一批思路，在 analyze 层呼应：

```
constitution  = 常驻 plan 级铁律（适用每个 change）+ analyze 审判
probe         = 单次 change 的深度对齐（提问时读 constitution，已规定的不重复问）
```

- probe 在提问前**先读 constitution**，宪法已规定的不再问（避免重复）。
- 两者同一条哲学：**不禁止偏离，但禁止隐藏偏离**（probe 的 `[ASSUMED]` 留痕 = constitution 的 waiver 留痕）。
- 可分别实现、分别提 change。

---

## 11. 明确不引入

| 排除项 | 原因 |
|--------|------|
| **宪法含代码机械规则 / 扫代码** | 归 linter/CI；code 违宪由 analyze+verify+linter 传递性覆盖（6.2） |
| archive gate 检查代码 | archive 是纯归纳总结，跨域读代码是坏设计 |
| 把宪法执法塞进 verify | verify=code-vs-spec，与宪法是两件事 |
| Sync Impact / 模板静态级联 | OpenSpec 运行时注入使其多余 |
| 完整语义化版本 + rationale 强制 | git 即历史，避免重复仓库已记录的 |
| 纯刚性硬阻塞（无豁免） | 与"保持动量"冲突 |
| 把宪法写进 CLAUDE.md/AGENTS.md | vendor lock-in + 碎片化，违背工具中立 |

---

## 参考

- `docs/speckit-analysis.md`：SpecKit constitution 机制来源
- SpecKit `templates/commands/analyze.md`：独立审判（**只看 artifacts、从不扫代码、跑在 implement 前**）+ MUST=CRITICAL + Authority 条款
- SpecKit `templates/commands/constitution.md`：立法工具 + 版本 + 传播
- `src/core/project-config.ts`：现有 config.yaml 读取层
- `src/core/templates/workflows/verify-change.ts`：verify 本职（Coherence 维度查代码偏离 design）
- `src/core/archive.ts`：archive 现状（合并 delta + 文档结构校验，不读代码）
