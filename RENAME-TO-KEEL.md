# 改名清单：OpenSpec → Keel

> 状态：**盘点阶段，尚未做任何真实修改。**
> 目的：把这次改名涉及的所有面、精确改动量、陷阱、未决问题一次性理清，作为动手前的依据。

---

## 1. 已定 / 未定的决策

| # | 决策 | 状态 |
|---|------|------|
| 1 | 品牌名 / CLI 名：`openspec` → `keel` | ✅ 已定 |
| 2 | npm 包名：`@fission-ai/openspec` → `@wei292224644/keel`（`@scope` 公开包免费） | ✅ 已定 |
| 3 | 命令前缀：`opsx` → `keel` | ✅ 已定 |
| 4 | **磁盘工作目录 `openspec/`（存 specs、changes）是否改成 `keel/`** | ❓ **未定 —— 风险中心** |
| 5 | **历史归档 `changes/archive/` 及旧提案文档里的旧名是否重写** | ❓ 未定（建议原样保留） |

---

## 2. 一个关键澄清：`openspec` 是三样不同的东西

不能一把 `sed` 全换。这个词在仓库里同时是：

1. **品牌 / 包名 / CLI 名** —— 该换成 `keel`。
2. **磁盘目录约定 `openspec/`** —— 是*数据格式约定*。一换就影响本仓库自己的 `openspec/` 目录 + 所有老用户项目 → 需要迁移逻辑。风险等级完全不同（= 决策 4）。
3. **历史归档文档** —— `openspec/changes/archive/2026-*/…` 里几百处是历史记录，重写等于篡改历史（= 决策 5）。

---

## 3. 改动清单（按面拆分，附精确计数）

### A. 包与二进制元数据 —— `package.json` + `bin/`
- `name`: `@fission-ai/openspec` → `@wei292224644/keel`
- `bin`: `openspec` → `keel`，指向文件 `./bin/openspec.js` → `./bin/keel.js`
- **重命名文件** `bin/openspec.js` → `bin/keel.js`
- `description`: `"AI-native system for spec-driven development"` —— 视情况改
- `keywords` / `homepage` / `repository.url` —— 指向 `Fission-AI/OpenSpec`，需改成你的仓库地址
- 影响：CLI 安装后的命令名、`npx` 调用名全部随之变。

### B. CLI 显示文案
- `src/ui/welcome-screen.ts:20` —— `'Welcome to OpenSpec'` 等展示字符串。
- 全仓库面向用户的输出里的 “OpenSpec” 字样。

### C. 命令前缀 `opsx` → `keel`（活跃代码：47 个 src 文件）
`opsx` 有**两种形态**，都要改：

1. **目录命名空间**（Claude 等）：`.claude/commands/opsx/<id>.md` → `.../keel/<id>.md`
   - 见 `src/core/command-generation/types.ts:38` 注释与各 adapter。
2. **文件名前缀**（~25 个扁平 adapter）：`opsx-<id>.md` → `keel-<id>.md`
   - 遍布 `src/core/command-generation/adapters/*.ts`（amazon-q, antigravity, auggie, bob, cline, codex, cursor, gemini … 每个都有 `path.join(..., \`opsx-${commandId}.md\`)`）。
3. **模板正文里的 `/opsx:` 引用**：`src/core/templates/workflows/*.ts`（analyze、constitution、apply-change 等）正文中 `/opsx:analyze`、`/opsx:constitution` 之类的用户可见命令引用。

### D. 磁盘目录 `openspec/`（⚠️ 取决于决策 4）
- **64 处**硬编码 `path.join(..., 'openspec', ...)`，散落在 **44 个 src 文件**（`commands/change.ts`、`validate.ts`、`archive.ts`、`workflow/shared.ts`、`artifact-graph/*` 等）。
- 不是集中常量 → 没有“改一处生效”的捷径。
- 若决策 4 = 改成 `keel/`：还需
  - 迁移本仓库自身的 `openspec/` 目录；
  - 为老项目写迁移/兼容逻辑（同时认 `openspec/` 和 `keel/`）；
  - `costrict.ts` 这类特例路径 `.cospec/openspec/commands/opsx-*.md` 要一并处理。
- 若决策 4 = 保留 `openspec/`：本面**不动**，只是品牌与目录名不完全一致。

### E. 测试（11 个含 opsx / 73 个含 openspec）
- **快照 parity 测试** `test/core/templates/skill-templates-parity.test.ts`：
  - 写死了每个模板的 **SHA256 hash**（如 `getExploreSkillTemplate: 'e2765f…'`）。
  - 改模板正文（含 C.3 的 `/opsx:` 引用）→ 内容变 → **所有相关 hash 必须重新生成**。
  - 期望键名本身带 `Opsx`：`getOpsxExploreCommandTemplate`、`getOpsxNewCommandTemplate`… 若把模板函数标识符也改名（见 F），键名要同步改。
- `test/core/command-generation/adapters.test.ts`、`generator.test.ts`、`init.test.ts`、`migration.test.ts`、`update.test.ts` 等断言里含旧文件名/路径，需同步。

### F. 代码标识符（可选但建议一致）
- 模板函数名 `getOpsx*CommandTemplate`（`src/core/templates/skill-templates.ts` 及引用处）含 `Opsx`。
- 改这些是纯 TypeScript 标识符重命名，牵动 D/E 里对应的引用与测试键名。
- 可作为独立一步，避免和字符串替换混在一起。

### G. 文档（docs/ 20 处含 opsx、23 处含 openspec）
- 面向用户的 `docs/*.md`（cli、commands、getting-started、opsx.md、migration-guide 等）：随品牌与命令名更新。
- `README.md` / `README_OLD.md`：品牌、徽章、npm 链接、命令示例。
- logo 资源 `assets/openspec_bg.png`（README 引用）—— 需换图或改文案。

### H. 历史归档（⚠️ 取决于决策 5，建议不动）
- `openspec/changes/archive/**`：257 处含 openspec、30 处含 opsx。
- 建议**原样保留**（历史记录）；只改活跃面。

### I. 其它零散
- LICENSE、`*.nix`、`*.yaml`/`*.yml`（CI workflow 里的包名/路径）、`*.sh`、`*.mjs` 各 1–3 处 —— 逐个确认。
- CI（`.github/workflows/ci.yml`）中若引用包名或 badge。

---

## 4. 建议的改动分层（动手时的顺序，暂不执行）

1. **品牌层**（低风险，独立可测）：package.json、bin 文件重命名、welcome 文案、README。
2. **命令前缀层** `opsx→keel`：adapters（两种形态）+ 模板正文引用 + 标识符重命名。
3. **快照层**：重新生成 parity hash + 修断言。
4. **数据目录层**（仅当决策 4 = 改）：64 处路径 + 迁移逻辑 + 自身 `openspec/` 目录搬迁。
5. **文档层**：docs/ + logo。
6. 历史归档：按决策 5，默认跳过。

---

## 5. 待你拍板

- **决策 4**：`openspec/` 目录 → 保留，还是改成 `keel/`？（决定第 4 层做不做，是本次风险与工作量的分水岭）
- **决策 5**：历史归档是否重写？（默认否）
- 仓库本身要不要同时改 GitHub repo 名 / remote（影响 package.json 的 repository、homepage、badge 链接）？
