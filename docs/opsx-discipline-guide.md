# OpenSpec 纪律机制使用指南（probe · constitution+analyze · apply-TDD）

> 适用版本：含 `tddMode`、`/opsx:probe`、`/opsx:constitution`、`/opsx:analyze` 的构建。
> 本文只讲这三套**新增机制**怎么用；基础流程（propose / apply / verify / archive）见 OpenSpec 主文档。

---

## 安装与启用

OpenSpec 是一个 CLI（包名 `@fission-ai/openspec`，命令 `openspec`）。`/opsx:*` 不是内置的——它们是 `openspec init` 按你选的 AI 工具**生成**到项目里的 skill/命令文件。

> ⚠️ 前提：本文这三套机制（probe / constitution+analyze / apply-TDD）是在**本仓库**开发的，npm 上已发布的版本不一定包含。**想现在就用，请用下面的「本仓库构建」路径**；npm 安装要等包含这些功能的版本发布后才有。

### 路径 A：从本仓库构建（拿到最新功能，推荐用于自测）
```bash
# 在 OpenSpec 仓库根目录
pnpm install
pnpm build
npm link          # 把全局 `openspec` 指向这份构建

# 验证指到的是本地构建
openspec --version
which openspec
```
> 不想污染全局，也可以不 `npm link`，直接用绝对路径调用：`node /path/to/OpenSpec/bin/openspec.js <cmd>`。

### 路径 B：从 npm 安装（功能发布后的常规方式）
```bash
npm i -g @fission-ai/openspec     # 或 pnpm add -g / npx @fission-ai/openspec
```

### 在你的项目里启用
进入**你要使用 OpenSpec 的项目**（不是 OpenSpec 仓库本身），初始化并选择 AI 工具：
```bash
cd /path/to/your-project
openspec init --tools claude          # 也可: cursor / codex / windsurf / gemini ... 或 "all"
# 多个工具用逗号: openspec init --tools claude,cursor,codex
```
这会创建 `openspec/`（含 `config.yaml`、`specs/`、`changes/`）并把 `/opsx:*` 命令/skill 写进所选工具的目录（如 Claude Code 的 skills、Cursor 的 commands）。

支持的工具（`--tools` 取值）：`amazon-q, antigravity, auggie, bob, claude, cline, codex, forgecode, codebuddy, continue, costrict, crush, cursor, factory, gemini, github-copilot, iflow, junie, kilocode, kimi, kiro, lingma, vibe, opencode, pi, qoder, qwen, roocode, trae, windsurf`。

### 已有项目升级（拿到新的 opsx 命令）
如果项目早就 init 过，CLI 升级后用 `update` 重新生成命令文件：
```bash
cd /path/to/your-project
openspec update
```

### 启用本文三套机制
- **apply-TDD**：编辑 `openspec/config.yaml`，加一行 `tddMode: default`（或 `strict` / `off`）。即时生效，无需重启。
- **constitution + analyze**：在项目里跑 `/opsx:constitution` 起草 `openspec/constitution.md`；之后 `/opsx:analyze <change>` 即可审查。
- **probe**：直接 `/opsx:probe <change>`，无需额外配置。

### 跨工具用法（Claude Code 出方案 → Codex/Cursor 写码）
对同一个项目 `openspec init --tools claude,codex,cursor` 一次，三个工具就都有 `/opsx:*` 了。接力靠文件（`openspec/changes/<name>/` + `tasks.md` + `config.yaml`）+ CLI 的 JSON，不靠对话记忆。切换工具前 commit/同步即可。

---

## 0. 它们在工作流的哪个位置

OpenSpec 的一次变更（change）走这条链。新机制用 ★ 标出：

```
                       ┌─ openspec/constitution.md  （项目级，长期存在，所有 change 共享）
                       │            ▲
                       │      ★ /opsx:constitution  （起草/修订宪法）
                       │
★ /opsx:probe  ──►  /opsx:propose  ──►  ★ /opsx:analyze  ──►  /opsx:apply  ──►  /opsx:verify  ──►  /opsx:archive
  (可选,提案前)        (生成产物)         (写码前审方案)        (实现, 带 TDD)      (码 vs spec)      (归并入 specs/)
  probe-report.md     proposal/design/                                ▲
                      specs/tasks                          ★ tddMode (config.yaml)
```

三套机制各管一段，互不重叠：

| 机制 | 管什么 | 时机 | 性质 |
|---|---|---|---|
| **probe** | 把需求/范围/假设**挖清楚** | propose **之前**（可选） | 交互式拷问，产出报告 |
| **constitution + analyze** | 方案是否**越过项目原则** | propose **之后**、apply **之前** | 只读审查，建议性阻塞 |
| **apply-TDD** | 实现是否**被测试验证** | apply **之中** | 配置驱动的测试门 |

一句话区分：**probe 问"要做什么"，analyze 审"方案对不对"，apply-TDD 保"代码验没验"。**

---

## 1. probe —— 提案前的深度对齐

### 用途
在生成任何产物前，用"6 层问题树 + 一次一问的拷问"把模型逼到它自己达不到的思考深度，并把结论**落盘**（防止上下文压缩后丢失）。适合范围模糊、设计有多个选项、或你想先对齐再动手的场景。简单改动可跳过。

### 怎么用
```
/opsx:probe <change-name>
# 或直接给一句描述，让它推导出 kebab-case 名字：
/opsx:probe "给登录加双因子"
```

执行后它会：
1. **先读代码**（`openspec status/instructions --json`、`openspec/specs/`、相关源码、`constitution.md`）——能读到的绝不问你。
2. `openspec new change <name>` 起一个变更壳。
3. **一次一个问题**地拷问，每个问题都带**有证据的推荐答案**（引用 `file:line` 或显式标注"基于一般假设，未验证"）。
4. 走 6 层问题树（深度优先，AI 自己决定遍历顺序）：

   | 层 | 内容 | 覆盖要求 |
   |---|---|---|
   | L1 Scope | 解决什么问题、为何现在、什么明确不做、谁受益 | 必覆盖 |
   | L2 Impact | 动哪些 spec/模块、上下游依赖 | 必覆盖 |
   | L3 Design | 2–3 个实现选项+取舍、推荐+理由、接口/数据结构、是否沿用现有模式 | 按复杂度 |
   | L4 Failure | 怎么失败、失败态可恢复吗、安全/性能/并发、边界条件 | 按复杂度 |
   | L5 Success | "完成"的可度量定义、什么测试能证明、什么信号说明做错了 | 按复杂度 |
   | L6 Open assumptions | AI 对现有代码/约定做了哪些**未验证假设**、哪些是猜的 | **永远输出** |

5. 结束时写 `openspec/changes/<name>/probe-report.md`。

### 何时停
没有强制结束。当 L1–L6 没有真正残留的歧义，或你说"够了/开始"时结束。你随时可以喊停——剩下的会被记成 open assumption，不会丢。

### 产物如何被下游消费
`probe-report.md` 里的 **Open assumptions（`[ASSUMED]` 行）** 会被 `/opsx:propose` 自动读取并显式带进 `proposal.md`——假设不会被"悄悄消化"，而是一路留痕到产物里。

---

## 2. constitution + analyze —— 项目宪法与写码前审查

这是一套**两件套**：`constitution.md` 是规则，`/opsx:analyze` 是唯一的检查器。**只有 analyze 这一道门**，verify 和 archive 完全不碰宪法。

### 2.1 关键边界（先理解，再使用）

- **宪法只管 plan 级**：它检查 `proposal.md` / `design.md` / `specs/`，**绝不扫代码**。
- **代码机械规则不进宪法**：`path.join`、no-console、命名格式这类——交给 ESLint / CI，不是宪法。
- **判据必须可被 analyze 在文本里找到**：写宪法时若一条原则"违反了 analyze 该看哪里都说不出"，它就不该是宪法条款。

### 2.2 起草宪法
```
/opsx:constitution
```
它会：
1. 加载模板、写作规则、迁移提示（`openspec instructions constitution --json`）。
2. **逐条拷问**你："如果有人违反这条，analyze 该去 proposal/design/specs 的哪里找证据？"
   - 不可测的目标 → 逼你补**判据** + 标 `[structure]` 或 `[judgment]`
   - 纯代码规则 → 劝退到 linter/CI
   - 含糊措辞 → 用 MUST/SHOULD 重写，或降级成 `config.yaml` 的 rules
3. 写入 `openspec/constitution.md`，格式：
   - 罗马数字 id + `(MUST)` / `(SHOULD)`
   - 每条 ≥1 判据，带正例/反例
   - 一条只讲一个主题
   - 版本戳：`> Version: X.Y · Last amended: YYYY-MM-DD`

判据两类：
- **`[structure]`** —— 机械检查产物结构（如"design 必须含'备选方案'章节，≥2 候选"）
- **`[judgment]`** —— 逐需求 yes/no 判断（如"每处抽象都能指向本 change 的具体需求"）

### 2.3 审查一个 change
```
/opsx:analyze <change-name>
```
**只读**，不改任何文件。它会：
1. 载入结构化上下文（`openspec instructions analyze --change <name> --json`）：宪法是否存在、clauses[]、waivers[]、artifacts[]。
2. 读各产物内容。
3. **Pass 1 宪法对齐**：逐条判据核对
   - MUST 违反 + 无豁免 → **CRITICAL**（带证据：文件 + 需求 ID + 判据）
   - MUST 违反 + 有匹配豁免 → NOTE：`⚠ Waived <id>`
   - judgment 但拿不出具体证据 → 降级为 WARNING（绝不 CRITICAL）
4. **Pass 2 一致性**（SpecKit 式，只看产物）：需求↔任务映射缺口、重复/冲突需求、proposal 能力 vs specs、design 决策 vs specs 范围。
5. 出报告表格，**若有 CRITICAL → 建议性阻塞 apply**（除非你明确接受风险）。

> "建议性阻塞"= skill 层面的提示拦截，不是 CLI 硬门。OpenSpec 不会从机制上禁止你继续，但会大声标红。哲学是"**不禁止偏离，但禁止隐藏偏离**"。

### 2.4 豁免（waiver）
当你**有意**违反某条 MUST，不要删条款、也别假装合规——记一条豁免：

在 `openspec/changes/<name>/.openspec.yaml`：
```yaml
waivers:
  - principle: III        # 宪法条款 id，必须是罗马数字
    reason: 本次为 spike，暂不拆分模块，下个 change 重构
```
之后 analyze 会把该违反显示成 `⚠ Waived III — reason: ...` 而非 CRITICAL。豁免是**留痕**，不是消音：同一条原则在同一模块反复被豁免 = 强信号（原则错或架构错），该起一个 refactor change。

---

## 3. apply-TDD —— 实现期的测试门

给 `/opsx:apply` 的实现循环加一套轻量 TDD：把"任务完成"从"写了代码"重定义为"**它闭合的 scenario 测试绿了**"。

### 3.1 开关：`openspec/config.yaml`
```yaml
schema: spec-driven
tddMode: default        # strict | default | off，不写默认为 default
```
该值经 `openspec instructions apply --change <name> --json` 暴露给 apply skill。无效值会告警并忽略（回退到不带该字段的行为）。

### 3.2 三档语义

| 档 | task 级门 | change 级收尾门 | 适用 |
|---|---|---|---|
| `default`（推荐） | 闭合某 scenario 的 task，其 scenario 测试**绿**才能打勾 | **已覆盖**的 scenario 必须绿；未覆盖 → 告警(不阻塞) | 大多数项目 |
| `strict` | 同 default | **每条** delta scenario 都须有绿测试，否则 **STOP 不归档**；关闭 `no-test` 逃逸 | 高保障要求 |
| `off` | 无 | 无 | 文档型项目 / 探索 spike |

### 3.3 实现循环（apply 内部，每个 pending task）
1. **判定该 task 推进哪些 scenario**（读 task + specs 的 WHEN/THEN/AND）。
2. 对尚无测试的 scenario：**写失败测试钉死期望 → 确认 RED**。
3. 写**最小实现**。
4. 跑相关测试 → **GREEN**。
5. （可选）重构，保持已绿的不变红。
6. **打勾规则**：
   - **闭合 scenario 的 task**（最后一个推进该 scenario 的）：其 scenario 测试绿才允许 `- [ ] → - [x]`
   - **部分推进**的 task：可带红打勾（合法 WIP，因为 scenario 通常跨多个 task）
   - **不推进任何 scenario**的 task（纯重构/配置/迁移）：无测试门，写完即打勾

### 3.4 两条诚实的边界
- **不假装证明 test-first 时序**：跨工具看不到编辑器，apply 只验**终态**（测试绿没绿），不强制"先写测试"的顺序。
- **优雅降级**：检测不到测试运行器（vitest/jest/mocha/`package.json` 的 test 脚本）时，宣布"降级为 off"并继续，不报错。

### 3.5 完成输出
旧模板凭空打印 "7/7 tasks complete ✓"。新模板**打印真实测试运行结果**，并按 tddMode 跑 change 级覆盖门。

---

## 4. 端到端示例

给"登录加双因子"走一遍完整链路：

```bash
# (一次性) 起草项目宪法，全项目共享
/opsx:constitution
#   → 写出 openspec/constitution.md，例如:
#     ## III. 简单优先 (MUST)
#     [judgment] design 里每处抽象都能指向本 change 的具体需求；
#               凡用"未来/可扩展"辩护且无当前驱动 → CRITICAL

# (一次性) 配置 TDD 档位
# openspec/config.yaml:
#   schema: spec-driven
#   tddMode: default

# 1. 提案前深挖（可选）
/opsx:probe add-2fa
#   → 一问一答走 6 层树 → openspec/changes/add-2fa/probe-report.md

# 2. 生成产物（自动读 probe-report 的 open assumptions）
/opsx:propose add-2fa
#   → proposal.md / design.md / specs/ / tasks.md

# 3. 写码前审查（宪法对齐 + 一致性）
/opsx:analyze add-2fa
#   → 若 design 里冒出"可插拔认证框架"但本次只要 TOTP →
#     CRITICAL: 违反 III. 简单优先。修方案，或在 .openspec.yaml 记 waiver

# 4. 实现（apply 内跑 TDD 微循环，按 tddMode=default）
/opsx:apply add-2fa
#   → 每个 task: scenario→失败测试(RED)→实现→GREEN→打勾
#   → 收尾打印真实测试结果

# 5. 验证 + 归档
/opsx:verify add-2fa
/opsx:archive add-2fa
#   → delta specs 归并入 openspec/specs/
```

---

## 5. 常见问题

**Q：analyze 会扫我的代码吗？**
不会。它只看 plan 级产物（proposal/design/specs）。代码越界由 linter/CI（机械规则）+ verify（码 vs spec）兜，宪法不重复管。

**Q：宪法和 CLAUDE.md 冲突吗？**
不冲突，层次不同。CLAUDE.md 是给 AI 的通用工作指令；constitution 是**本项目的方案级不变量**，且有 analyze 这个独立机械检查器给它"牙齿"。

**Q：tddMode=strict 真能阻止我归档吗？**
它是 skill 层面的强指令（STOP 不报 all-done、不建议 archive），不是 CLI 硬锁。和 analyze 的"建议性阻塞"同理——OpenSpec 给信号、留痕，但最终不从机制上锁死你。

**Q：probe 是必须的吗？**
不是。简单改动直接 `/opsx:propose` 即可。probe 是为"值得先对齐"的变更准备的可选前置。

**Q：跨工具能用吗（Claude Code 出方案、Codex/Cursor 写码）？**
能。状态全在文件（`changes/<name>/` + `tasks.md` 勾 + `config.yaml`）+ CLI 的 JSON，不在对话记忆里。只要两个工具指向同一 repo、都装了 CLI、都 init 过，接力即可。注意：(1) 切换前要 commit/同步；(2) 没写进产物的隐性决策不跨工具传；(3) 串行接力，别并行改重叠 change。

---

## 6. 设计文档索引

- 宪法+analyze：`docs/superpowers/plans/2026-06-23-opsx-constitution-design.md`
- probe：`docs/superpowers/plans/2026-06-23-opsx-probe-design.md`
- apply-TDD：`docs/superpowers/plans/2026-06-24-opsx-apply-tdd.md`
- 总策略（风格/正确性/架构如何约束 AI）：`docs/superpowers/specs/2026-06-23-code-quality-constraints-strategy.md`
