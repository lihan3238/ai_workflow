# AI Workflow Home 中文操作与运维说明

这套系统的核心不是博客、相册或账号系统，而是 **GitHub 仓库管理的 AI 资产**
和每台设备的 runtime 状态对齐。网页负责展示，CLI 负责专业操作。

## 当前产品边界

- 保留：Home、Blog、Search、AI Assets、Runtime。
- 删除：Family 页面、Photos 页面、单独 family 产物。
- 不自建账号系统：访问控制交给 LAN/VPN/firewall、Cloudflare Access、Authelia、
  authentik 或 Tailscale/WireGuard。
- 不自研相册：照片以后如果需要，仍交给 Immich，但不放在本项目核心界面里。
- 不自研文件同步系统：Git/GitHub 是最新版资产基准；设备同步先用 CLI 看 diff，再
  写入目标设备。

## 角色

### 程序员操作者

适合 Lihan、父亲、未来少数可信程序员。需要会：

- Git pull / diff / commit / push；
- 运行 `npm run check`；
- 查看 Runtime 页面；
- 用 CLI 生成设备快照、查看差异、同步资产；
- 管理 Linux server、备份和恢复。

### 普通读者

只读博客即可。不需要 runtime 权限，不需要 Git，不需要点同步按钮。

## 本地开发

```bash
cd /home/lihan/work/ai_workflow
source ~/.nvm/nvm.sh
nvm use 22.12.0
npm ci
npm run dev -- --host 127.0.0.1
```

生产环境不要使用 `npm run dev`，只发布静态构建产物。

## 基础验证

日常改动：

```bash
npm run check:readonly
```

发布前：

```bash
npm run check
git diff --check
```

检查内容包括 TypeScript、Vitest、AI asset schema、registry、Astro build、
operator artifact audit。

## AI 资产模型

当前 asset kind 只有：

- `card`
- `prompt`
- `skill`
- `profile`
- `connector`

没有 `workflow` asset kind。项目列表、开发工作区状态、设备差异，属于
Runtime inventory，不属于 AI asset registry。

## 旧博客迁移快照

旧 Hugo 博客默认位置：

```text
/mnt/c/lihan_work/github_repos/lihan3238.github.io
```

先 dry run：

```bash
npm run import:legacy
```

确认后写入：

```bash
npm run import:legacy -- --apply
```

当前 allowlist 迁移：

- 5 篇旧 Hugo 博文，包括 AI 反思和美景/诗意类文章；
- 4 张旧 cards；
- 1 个 `lihan-cards` legacy skill 快照；
- 旧博文相对图片/附件复制到 `public/legacy/<slug>/`；
- Markdown 图片链接会重写到 `/legacy/<slug>/...`。

迁移后运行：

```bash
npm run validate
npm run build:registry
npm run runtime:baseline
npm run check
```

## Runtime：设备资产差异

GitHub/repo checkout 是最新版资产基准。设备快照记录每台机器上：

- 用户级 `AGENTS.md` 状态；
- 用户级 `CLAUDE.md` 状态；
- Claude Code / Codex / cc-switch 的安装状态、版本、命令路径和配置文件位置；
- cc-switch 的 `~/.cc-switch/cc-switch.db` 路径和 `PRAGMA user_version`；
- Codex/Claude skills 状态；
- 本机管理的 AI asset 文件 hash 和内容；
- 当前开发项目列表和状态。

### 生成 GitHub/repo 基准

在最新 checkout 上运行：

```bash
git pull --ff-only
npm run validate
npm run build:registry
npm run runtime:baseline
```

输出：

```text
runtime/baseline/assets.json
```

### 采集某台设备快照

推荐从展示服务器通过免密 SSH 采集：

```bash
npm run runtime:inspect -- --device my-host --label "My Host" --ssh user@10.81.2.18:22 --out runtime/devices/my-host.json
```

免密 SSH 配好后，也可以注册设备并三分钟轮询一次：

```bash
npm run runtime:device:add -- --id my-host --label "My Host" --ssh user@10.81.2.18:22
npm run runtime:scan -- --watch --interval-seconds 180
```

如果还没有 SSH，只做 IP 可达性探测时加 `--network-only`，不要把本机资产当成远端资产。

默认静态站只读。可信内网里需要网页直接添加/删除主机时，启动薄 operator API：

```bash
npm run operator:serve
```

访问控制交给防火墙或反向代理，不在这个 MVP 里自建账号系统。

### CLI 查看差异

```bash
npm run runtime:diff -- --device runtime/devices/my-host.json
```

输出包括：

- missing：GitHub 基准里有，设备没有；
- changed：路径相同但 hash 不同；
- extra：设备本地有，GitHub 基准没有；
- changed 文件的 git diff 风格文本。

### 同步 GitHub 最新资产到设备

先 dry run：

```bash
npm run runtime:sync -- --device runtime/devices/my-host.json --target-root /path/to/device/repo
```

确认后 apply：

```bash
npm run runtime:sync -- --device runtime/devices/my-host.json --target-root /path/to/device/repo --apply
```

同步只写入 missing/changed 的基准文件；extra 文件默认保留，不自动删除。

反向上传本地改动到 GitHub 不走网页按钮，必须使用：

```bash
git diff
git status --short
git add ...
git commit -m "..."
git push
```

必要时走 PR。这样避免非专业用户误点覆盖团队基准。

## Runtime 页面语义

Runtime 首页每台设备是一张链接卡片，点击进入独立详情页，不在首页展开大块内容。
首页只显示：

- online/offline；
- `user@ip`、操作系统、架构；
- IP 和上次在线时间；
- Claude Code / Codex / cc-switch 三个红绿安装状态；
- missing / changed / extra 差异计数。

详情页显示完整 `AGENTS.md`、`CLAUDE.md` 验证关系、工具版本、命令路径、配置路径、
项目和 diff。网页添加/删除主机使用站内 `<dialog>` 弹窗，不使用浏览器原生
`confirm` / `alert`。

当前版本不会让网页直接 SSH 到远端设备执行写入。这是刻意的安全边界。以后如果要做
远端按钮执行，应优先复用 Ansible、Tailscale SSH 或已有运维通道，而不是自建账号和
远控系统。

### Project 识别规则

Runtime 不维护单独的项目数据库。扫描器复用项目里已经存在的 workflow marker：

- `AGENTS.md`
- `ai/cards`
- `ai/skills`
- `runtime/adapters`
- 显式 opt-in 文件 `.workflow-home.json`

`.agents/` 会在项目已经命中上述 marker 时作为辅助信息记录，但不会单独让一个目录
进入项目列表，避免把普通 agent 缓存目录误认为 workflow 项目。

扫描范围是已配置的 `remote_root`、它的父目录，以及常见 workspace 目录：
`~/work`、`~/projects`、`~/github_repos`。命中的项目会显示路径、Git 状态、branch、
remote 和 markers。这样项目是否“走这套 workflow”由项目自身结构决定，不额外发明
登记服务。

## lihan_cards 资产导入

旧仓库：

```text
/mnt/c/lihan_work/github_repos/lihan3238.github.io
```

完整 card 集合已经转换后复制到：

```text
ai/cards/imported-lihan-cards/
```

旧 `skills/lihan-cards/` 完整复制为参考快照：

```text
docs/legacy/lihan-cards-skill/
```

它不进入 `ai/skills/`，也不作为可安装 skill 出现在 registry。当前系统只保留一个从
`lihan_cards` 抽象出来的入口 skill：

```text
ai/skills/workflow-home/SKILL.md
```

旧 `agents/` 下的非 secret 用户级配置作为 private profile 快照复制到：

```text
ai/profiles/imported-lihan-cards/
```

这些文件保留原正文，frontmatter 转为当前 `AI Workflow Home` asset schema，并加
`lihan-cards-` 前缀避免和迁移快照重复 ID。导入后必须运行：

```bash
npm run validate
npm run build:registry
npm run check:registry
```

## 本地 agent runtime 安装

先验证：

```bash
npm run validate
npm run check:registry
```

安装前 dry run：

```bash
node scripts/install-runtime.mjs --dry-run
```

确认只触碰白名单路径：

```text
~/.codex/skills/workflow-home
~/.claude/skills/workflow-home
```

确认后：

```bash
node scripts/install-runtime.mjs --apply
```

默认不管理全局 `AGENTS.md` / `CLAUDE.md`。只有新机器没有个人规范时才考虑：

```bash
node scripts/install-runtime.mjs --dry-run --manage-global-guides
node scripts/install-runtime.mjs --apply --manage-global-guides
```

## Linux server 发布

推荐目录：

```text
/srv/ai-workflow-home/repo
/srv/ai-workflow-home/site
/etc/ai-workflow-home
/var/lib/ai-workflow-home
```

构建发布：

```bash
cd /srv/ai-workflow-home/repo
git pull --ff-only
source ~/.nvm/nvm.sh
nvm use 22.12.0
npm ci
npm run check
npm run build:operator
npm run check:operator-artifact
rsync -a --delete dist-operator/ /srv/ai-workflow-home/site/
```

Caddy 示例：

```caddyfile
ai-home.local {
	root * /srv/ai-workflow-home/site
	encode zstd gzip
	file_server
}
```

## 备份

restic 密码和仓库配置放在服务器本地，不提交 Git。

示例：

```bash
RESTIC_REPOSITORY=/mnt/backup/restic/ai-workflow-home
RESTIC_PASSWORD_FILE=/etc/ai-workflow-home/restic-password
```

备份：

```bash
set -a
. /etc/ai-workflow-home/restic.env
set +a

restic backup \
  /srv/ai-workflow-home/repo \
  /srv/ai-workflow-home/site \
  /var/lib/ai-workflow-home

restic snapshots
restic check
```

## 最小上线清单

- `npm run check` 通过；
- `git diff --check` 通过；
- `npm run runtime:baseline` 已更新；
- 至少一台真实设备运行过 `npm run runtime:inspect`；
- Runtime 页面能看到设备差异；
- `npm run runtime:diff -- --device <snapshot>` 能输出差异；
- 同步写入只通过 CLI；
- 服务器只通过 LAN/VPN/成熟访问代理访问；
- 没有把密钥写进 Git。
