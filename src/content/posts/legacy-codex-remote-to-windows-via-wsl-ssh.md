---
title: Codex 从 Mac 远连 Windows——绕过 pwsh，走 WSL 的 sshd
description: Codex 的 remote-connect 从 Mac 连 Windows 时会卡在默认 shell 是 pwsh、而 bootstrap 脚本假定 POSIX sh 的不匹配上。把 WSL 里的 sshd 通过 Windows portproxy 暴露出来，让会话落进 WSL 的 bash，一次性配好。
date: 2026-05-21
tags:
  - tech
  - codex
  - wsl
  - windows
  - ssh
  - remote-dev
  - legacy-blog
visibility: public
---

> 迁移自旧 Hugo 博客：`content/post/codex-remote-to-windows-via-wsl-ssh/index.md`。这是迁移快照，用于验证新工作流系统的内容链路。

> 本文是一次真实配置的完整走查记录（一次性、面向人阅读）。这套环境配好一次就长期
> 复用，我大概率不会再从头踩坑，所以收成博文而不是知识卡片。

## 背景与问题

想用 Codex 的 remote-connect 功能从 Mac 驱动一台 Windows 机器。连上之后，Codex
在远端跑 bootstrap 一上来就失败：报 pwsh 看不懂的 token、`&&`、`$(...)` 之类的
错误，或者客户端报远端 shell 没返回预期的握手。

根因是 **shell 不匹配**：

- Codex 的远端 bootstrap 假定远端是 POSIX shell（sh / bash）。
- Windows 自带的 OpenSSH server 默认把 pwsh（或 cmd）当登录 shell，所以那些
  一行式 bootstrap 命令在 Codex 启动之前就先炸了。
- 同一台 Windows 上的 WSL Ubuntu 里有真正的 bash。**解法就是把 SSH 会话落进
  WSL，而不是落在 Windows 本体。**

适用场景：用 Mac 通过 Codex remote-connect（或其他假定 sh 的远程开发工具，比如
JetBrains Gateway、bootstrap 脚本只认 sh 的 VS Code Remote-SSH）去驱动一台装了
WSL 的 Windows 机器，且连接在 bootstrap 阶段挂在 shell 不兼容 / pwsh /
command-not-found 上。

不适用：远端本身就是原生 Linux（没有 shell 不匹配）、远程工具明确支持 Windows
侧 pwsh、或者那台 Windows 上压根没装 WSL 发行版。

## 四步配置

第 1–3 步每台 Windows 主机一次性；第 4 步每台 Mac 一次性。

### 1. 在 WSL Ubuntu 里装 sshd

在 Windows 上打开 WSL Ubuntu：

```bash
sudo apt update
sudo apt install -y openssh-server
sudo service ssh start
```

确认：

```bash
which sshd
sudo service ssh status
```

### 2. 把 Mac 公钥写进 WSL 的 authorized_keys

在 Mac 上：

```bash
cat ~/.ssh/id_ed25519.pub
```

复制整行。进到 WSL 里：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys   # 粘贴 Mac 公钥，保存
chmod 600 ~/.ssh/authorized_keys
```

### 3. 把 Windows 的 :2222 转发到 WSL 的 :22

在 Windows 上以**管理员** PowerShell 执行：

```powershell
$wslIp = (wsl hostname -I).Trim().Split()[0]

netsh interface portproxy add v4tov4 `
  listenaddress=0.0.0.0 `
  listenport=2222 `
  connectaddress=$wslIp `
  connectport=22

New-NetFirewallRule `
  -DisplayName "WSL SSH 2222" `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 2222
```

### 4. 在 Mac 的 SSH config 里加一个 Host 条目

编辑 Mac 上的 `~/.ssh/config`：

```text
Host lihan_pc_02_wsl
  HostName <windows-host-lan-ip>   # 例如 10.88.0.6
  Port 2222
  User <wsl-username>
  IdentityFile ~/.ssh/id_ed25519
```

然后在 Codex 里把 remote-connect 指向 Host 别名 `lihan_pc_02_wsl`——Codex 看到
的是一个 POSIX 远端，bootstrap 就能干净跑通。

## 踩坑点

- **WSL IP 每次重启都会漂。** 第 3 步把 `$wslIp` 当成一个快照写死了。一旦
  `wsl --shutdown` 或 Windows 重启，要重跑 `netsh interface portproxy add`
  （先用 `netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0
  listenport=2222` 删掉旧的）。可以把它写成一个开机自动跑的计划任务。
- **别把代理塞进 git config。** 这台机器上别处用的 HTTP 代理
  （`10.88.0.6:10808`）跟这条 SSH 路径无关，别混在一起。
- **连进 WSL，不是连进 Windows。** 如果 Codex 客户端直接落在 Windows 本体的
  22 端口，你又回到 pwsh 失败的原点了。整套方案的意义就是用 2222 → WSL:22
  这一跳，强制把会话顶进 WSL。

## 怎么确认连通

在 Mac 上：

```bash
ssh lihan_pc_02_wsl -o BatchMode=yes -o ConnectTimeout=5 'uname -a'
```

返回一个 Linux 内核串（形如 `Linux ... microsoft-standard-WSL2`）且退出码为
0，就说明这台 Host 上的 Codex remote-connect 能用了。

连不上时按顺序排查：

1. WSL sshd 起没起：`sudo service ssh status`；
2. Windows portproxy 是否还指向当前 WSL IP：对比
   `netsh interface portproxy show v4tov4` 与 `wsl hostname -I`
   （每次 WSL 重启 IP 都会漂）；
3. 防火墙规则 `WSL SSH 2222` 是否存在；
4. `~/.ssh/authorized_keys` 里有没有 Mac 公钥，且权限是 600。
