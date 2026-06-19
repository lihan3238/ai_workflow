---
title: 三地组网完成后的 AI Workflow 落地方案
description: 在武汉主 NAS、西安备份 NAS、学校算力站和 WireGuard 内网之上，部署一个模型解耦的家庭 AI 工作流系统。
date: 2026-06-19
tags:
  - ai-workflow
  - home-lab
  - codex
  - claude-code
  - wireguard
visibility: public
---

三地网络打通之后，AI Workflow Home 才真正从“一个博客项目”变成“家庭和小团队可维护的工作流系统”。博客仍然是窗口，但不再是核心。核心是可版本化的 AI 资产、可扫描的设备状态、可恢复的运行环境，以及跨 Codex、Claude Code、Hermes、OpenClaw 的轻量约定。

底层网络按三地规划完成后，基础设施角色是：

```text
武汉：主 NAS + 主数据中心 + 5060Ti 算力主机
西安：异地备份 NAS
学校：5070Ti 算力工作站
阿里云：WireGuard Hub
笔记本/手机：管理终端
```

AI 工作流落地要遵守同一个原则：

```text
模型可替换
资产可迁移
设备可扫描
产出可备份
恢复可演练
```

## 系统边界

AI Workflow Home 不做账号系统，不做通用监控平台，不做备份软件，不做 SSH 编排平台。成熟工具已经存在：

- WireGuard 负责组网。
- OpenWrt 负责路由和 WOL。
- GitHub / 后续可选 Forgejo 负责源代码和 PR 流程。
- restic 负责加密多版本备份。
- systemd timer / cron 负责定时扫描。
- Ansible 可以在规模变大后接管 SSH 执行。

本系统只做一件事：把 AI 工作流里真正属于自己的部分组织清楚。

```text
ai/cards        可复用经验卡片
ai/prompts      稳定提示词资产
ai/skills       Codex / Claude 可调用 skill
ai/profiles     非秘密环境 profile
runtime/devices 主机扫描快照
runtime/baseline GitHub/repo 资产基准
docs            恢复、部署、运维计划
blog            给人看的解释和复盘
```

这就是模型解耦的含义：今天用 Codex、Claude Code，明天换 Hermes、OpenClaw 或更强模型，资产仍然在 Git、Markdown、JSON、SSH 和备份里，不在某个模型会话里。

## 部署位置

第一阶段可以部署在 Linux 服务器。三地网络完成后，推荐迁移到武汉主 NAS 或武汉常开 Linux 小主机：

```text
武汉主站：
  /srv/ai_workflow              Git checkout
  /srv/www/ai-workflow          静态构建输出
  /etc/systemd/system           operator server / scan timer
  /data/code/ai_workflow        可选源码镜像
```

如果 NAS 本身适合跑容器，可以用容器部署 operator server；如果 NAS 系统更偏封闭，就让 R76S/N100 或一台小 Linux 主机跑服务，NAS 只承载数据和备份。

生产服务拆成两个面：

```text
只读博客面：
  给家人看博文、说明、公开内容。

operator 面：
  给程序员看设备、AI 资产、diff、工具版本和扫描状态。
  只在 LAN/WireGuard/私有反代后访问。
```

不要在 app 内自建账号密码。家庭场景里，防火墙、WireGuard、Cloudflare Access、Authelia 或 authentik 比自写登录更可靠。

## 设备接入

每台机器都按普通 SSH 设备接入，不把“本机”特殊化：

```text
武汉主 NAS / Linux 主机：user@192.168.20.10:22
武汉 5060Ti：user@192.168.20.31:22
学校 5070Ti：user@192.168.10.31:22
当前 WSL：lihan@10.22.0.11:2222
父亲 Rocky：rocky@10.81.2.18:22
```

接入后写入：

```text
runtime/devices/config.json
```

扫描进程每三分钟运行一次：

```bash
npm run runtime:scan -- --watch --interval-seconds 180
```

正式部署时改成 systemd timer 或 service。网页只是展示和发起添加/删除主机，不承担调度。

每台设备快照应该包含：

```text
IP / SSH 用户 / OS / kernel / arch
上次在线时间
AGENTS.md / CLAUDE.md 状态
Claude Code / Codex / cc-switch 安装状态
版本、binary path、配置文件路径
cc-switch DB 路径与 user_version
项目清单
AI 资产差异
```

首页只看红绿状态。点进设备页再看完整路径、版本、配置关系和 diff。

## 项目发现

项目不能靠“全盘扫描 Git repo”自动猜。那会把 NAS 扫成噪声，也会误把不属于 AI workflow 的目录纳入管理。

当前 MVP 不新增项目数据库，而是复用项目已经应该有的结构作为 marker：

```text
AGENTS.md
ai/cards
ai/skills
runtime/adapters
.workflow-home.json
```

`.agents/` 可以作为辅助证据显示，但不能单独让一个目录进入项目列表。这样能避免把普通 agent 缓存目录误当成正式 workflow 项目。

扫描范围也保持克制：

```text
配置里的 remote_root
remote_root 的父目录
~/work
~/projects
~/github_repos
```

命中的项目显示路径、Git 状态、branch、remote 和 markers。以后如果机器变多，再把这些路径交给 Ansible inventory 或 systemd 配置，不在 app 里重写一套项目管理服务。

## AI 资产流转

GitHub 或后续自建 Forgejo/Gitea 是 AI 资产基准：

```text
Git repo → runtime/baseline/assets.json → device snapshot → diff → 人确认 → sync
```

下载/同步到设备可以半自动：

```bash
npm run runtime:diff -- --device runtime/devices/lihan-wsl.json
npm run runtime:sync -- --device runtime/devices/lihan-wsl.json --target-root /home/lihan/work/ai_workflow --apply
```

反向上传不能网页一键做。会改变团队基准的动作必须走 Git：

```bash
git diff
git add ...
git commit
git push
gh pr create
```

这是为了保护“基准”这个概念。家庭项目可以简单，但不能模糊“谁改了公共资产”。

## cc-switch 与多模型工具

Claude Code、Codex、cc-switch 不是系统的护城河，只是当前工具层。设备快照要记录它们的状态，但系统价值不能依赖它们永久存在。

每台设备应展示：

```text
Claude Code：是否安装、版本、binary path、配置路径、是否由 cc-switch 管理
Codex：是否安装、版本、binary path、配置路径、是否由 cc-switch 管理
cc-switch：是否安装、binary path、settings.json、cc-switch.db、DB user_version
```

如果将来换成 Hermes、OpenClaw 或新的 agent，新增 adapter 就行。资产层仍然是 cards、prompts、skills、profiles 和项目 marker。

## 数据和备份

武汉主 NAS 是长期数据责任主体：

```text
/data/code
/data/research
/data/photos
/data/family
/data/personal
/data/backup-laptops
```

AI workflow 需要备份的不是 node_modules 或临时构建，而是：

```text
Git repo
AI assets
runtime device snapshots
docs and blog posts
operator deployment config
restic repo metadata
关键 agent 配置导出
```

推荐备份关系：

```text
武汉主 NAS daily restic snapshot → 西安备份 NAS
关键 Git repo → GitHub + 武汉 NAS mirror
重要文档 → 西安 NAS + 云端/移动硬盘冷备
```

恢复演练比备份配置更重要。每次大改后至少做一次：

```bash
npm ci
npm run check
npm run operator:serve
npm run runtime:scan
```

并确认一台新机器能从 Git + 备份恢复 operator 页面和运行时资产。

## 家庭使用方式

程序员入口：

```text
Runtime 页面
AI Assets 页面
Git repo
SSH / systemd / restic
```

家人入口：

```text
博客
照片系统
家庭说明页
只读 NAS 共享
```

不要要求不懂技术的家人理解 Codex、Claude、cards、skills。她们只需要看到稳定的博客、照片和资料。程序员维护者负责背后的扫描、备份、恢复和工具更新。

## 分阶段落地

第一阶段：Linux 服务器 MVP。

```text
operator server 跑起来
WSL / Rocky 两台真实设备接入
三分钟扫描
工具版本和配置路径展示
AI 资产 diff
GitHub 同步
```

第二阶段：武汉主站。

```text
迁移到武汉常开主机或 NAS
systemd timer
Caddy/nginx 反代
WireGuard 访问
restic 到西安
5060Ti WOL
```

第三阶段：三地协作。

```text
学校 5070Ti 接入 Runtime
武汉 NAS 承担主数据
西安 NAS 承担异地备份
项目 marker 识别稳定运行
```

第四阶段：团队化。

```text
父亲机器接入完整 workflow
新增 trusted programmer
必要时导出 Ansible inventory
必要时增加 Forgejo/Gitea 本地 mirror
```

## 结论

这套 AI workflow 不应该变成又一个大平台。它应该像家里的电箱和工具柜：平时不显眼，但每个开关都有标签，每把工具都有位置，出了问题知道怎么断电、怎么恢复、怎么替换。

网络底座负责连通，NAS 负责数据，restic 负责备份，Git 负责基准，AI Workflow Home 负责把人和 agent 真正共用的那层资产组织起来。

一句话总结：

```text
三地网络解决“机器在哪里”，AI Workflow 解决“人在任何机器上怎样继续稳定工作”。
```
