import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import nodeOs from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import {
  compareDeviceToBaseline,
  defaultRemoteRootForSshTarget,
  guideVerificationForSnapshots,
  isSafeRuntimeDeviceId,
  parseSshTarget,
  upsertRuntimeDeviceConfig,
  type AgentGuideSnapshot,
  type RuntimeAssetSnapshot,
  type RuntimeBaseline,
  type RuntimeDeviceConfig,
  type RuntimeDeviceRegistry,
  type RuntimeDeviceSnapshot,
  type RuntimeOsSnapshot,
  type RuntimeProjectSnapshot,
  type SkillSnapshot,
  type RuntimeToolsSnapshot,
  unifiedDiffForAsset
} from "../src/lib/runtime/inventory";

const execFileAsync = promisify(execFile);
const MANAGED_GLOBS = [
  "ai/cards",
  "ai/prompts",
  "ai/profiles",
  "ai/skills",
  "runtime/adapters"
];
const WORKFLOW_HOME_SKILL_PATHS = [
  { tool: "codex", name: "workflow-home", path: "~/.codex/skills/workflow-home/SKILL.md" },
  { tool: "claude", name: "workflow-home", path: "~/.claude/skills/workflow-home/SKILL.md" }
] as const;

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function argValue(name: string, fallback = ""): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

async function collectFiles(root: string, current: string): Promise<string[]> {
  if (!(await pathExists(current))) return [];
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, fullPath)));
    } else if (entry.isFile() && /\.(md|json)$/i.test(entry.name)) {
      files.push(toPosix(path.relative(root, fullPath)));
    }
  }
  return files;
}

async function collectManagedAssets(root: string): Promise<RuntimeAssetSnapshot[]> {
  const files: string[] = [];
  for (const managedPath of MANAGED_GLOBS) {
    files.push(...(await collectFiles(root, path.join(root, managedPath))));
  }

  const unique = [...new Set(files)].sort();
  const assets: RuntimeAssetSnapshot[] = [];
  for (const file of unique) {
    const content = await fs.readFile(path.join(root, file), "utf8");
    assets.push({ path: file, sha256: sha256(content), content });
  }
  return assets;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function homePath(filePath: string): string {
  if (!filePath.startsWith("~/")) return filePath;
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (!home) throw new Error("HOME is required to resolve user guide paths");
  return path.join(home, filePath.slice(2));
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function runtimePathPrefix(): string {
  return 'PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin:$PATH"';
}

function shellDoubleQuoteContent(value: string): string {
  return value.replace(/(["\\$`])/g, "\\$1");
}

function remotePathExpression(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return `"$HOME/${shellDoubleQuoteContent(filePath.slice(2))}"`;
  }
  return shellQuote(filePath);
}

async function readLocalGuide(guidePath: string): Promise<AgentGuideSnapshot> {
  const resolvedInput = homePath(guidePath);
  if (!(await pathExists(resolvedInput))) {
    return { path: guidePath, status: "missing" };
  }
  const content = await fs.readFile(resolvedInput, "utf8");
  let resolvedPath = resolvedInput;
  try {
    resolvedPath = await fs.realpath(resolvedInput);
  } catch {
    resolvedPath = resolvedInput;
  }
  return {
    path: guidePath,
    status: "present",
    sha256: sha256(content),
    content,
    resolved_path: resolvedPath
  };
}

function unknownGuide(guidePath: string): AgentGuideSnapshot {
  return { path: guidePath, status: "unknown" };
}

async function localAgentGuides(networkOnly: boolean): Promise<RuntimeDeviceSnapshot["agent_guides"]> {
  if (networkOnly) {
    return {
      agents_md: unknownGuide("~/.codex/AGENTS.md"),
      claude_md: unknownGuide("~/.claude/CLAUDE.md")
    };
  }
  return {
    agents_md: await readLocalGuide("~/.codex/AGENTS.md"),
    claude_md: await readLocalGuide("~/.claude/CLAUDE.md")
  };
}

async function probeIpOnline(ip: string): Promise<boolean> {
  if (!ip) return true;
  const args =
    process.platform === "win32"
      ? ["-n", "1", "-w", "1000", ip]
      : ["-c", "1", "-W", "1", ip];
  try {
    await execFileAsync("ping", args, { timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}

async function runSsh(config: RuntimeDeviceConfig, script: string): Promise<string> {
  const { ssh } = config;
  const { stdout } = await execFileAsync(
    "ssh",
    [
      "-p",
      String(ssh.port),
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=5",
      ssh.target,
      "sh",
      "-lc",
      shellQuote(script)
    ],
    { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
  );
  return stdout;
}

async function probeSshOnline(config: RuntimeDeviceConfig): Promise<boolean> {
  try {
    await runSsh(config, "true");
    return true;
  } catch {
    return false;
  }
}

async function readRemoteGuide(
  config: RuntimeDeviceConfig,
  guidePath: string
): Promise<AgentGuideSnapshot> {
  const remotePath = guidePath.startsWith("~/") ? `$HOME/${guidePath.slice(2)}` : guidePath;
  const script = [
    `p=${remotePathExpression(guidePath)}`,
    'if [ -e "$p" ]; then',
    '  printf "__AWF_PRESENT__\\n"',
    '  readlink -f "$p" 2>/dev/null || printf "%s\\n" "$p"',
    '  printf "__AWF_CONTENT__\\n"',
    '  cat "$p"',
    "else",
    '  printf "__AWF_MISSING__\\n"',
    "fi"
  ].join("\n");
  try {
    const stdout = await runSsh(config, script);
    if (stdout.startsWith("__AWF_MISSING__")) {
      return { path: guidePath, status: "missing" };
    }
    const [, rest = ""] = stdout.split("__AWF_PRESENT__\n");
    const [resolvedPath = remotePath, content = ""] = rest.split("__AWF_CONTENT__\n");
    return {
      path: guidePath,
      status: "present",
      sha256: sha256(content),
      content,
      resolved_path: resolvedPath.trim()
    };
  } catch {
    return unknownGuide(guidePath);
  }
}

async function remoteAgentGuides(
  config: RuntimeDeviceConfig
): Promise<RuntimeDeviceSnapshot["agent_guides"]> {
  return {
    agents_md: await readRemoteGuide(config, "~/.codex/AGENTS.md"),
    claude_md: await readRemoteGuide(config, "~/.claude/CLAUDE.md")
  };
}

function unknownWorkflowHomeSkills(): SkillSnapshot[] {
  return WORKFLOW_HOME_SKILL_PATHS.map((skill) => ({
    tool: skill.tool,
    name: skill.name,
    status: "unknown"
  }));
}

async function localWorkflowHomeSkills(networkOnly: boolean): Promise<SkillSnapshot[]> {
  if (networkOnly) return unknownWorkflowHomeSkills();
  const snapshots: SkillSnapshot[] = [];
  for (const skill of WORKFLOW_HOME_SKILL_PATHS) {
    snapshots.push({
      tool: skill.tool,
      name: skill.name,
      status: (await pathExists(homePath(skill.path))) ? "present" : "missing"
    });
  }
  return snapshots;
}

async function remoteSkillStatus(config: RuntimeDeviceConfig, skillPath: string): Promise<SkillSnapshot["status"]> {
  const script = [
    'printf "__AWF_SKILL_STATUS__\\n"',
    `p=${remotePathExpression(skillPath)}`,
    'if [ -e "$p" ]; then printf "present\\n"; else printf "missing\\n"; fi'
  ].join("\n");
  try {
    const stdout = await runSsh(config, script);
    const status = stdout.split("__AWF_SKILL_STATUS__\n").at(-1)?.trim();
    return status === "present" || status === "missing" ? status : "unknown";
  } catch {
    return "unknown";
  }
}

async function remoteWorkflowHomeSkills(config: RuntimeDeviceConfig): Promise<SkillSnapshot[]> {
  const snapshots: SkillSnapshot[] = [];
  for (const skill of WORKFLOW_HOME_SKILL_PATHS) {
    snapshots.push({
      tool: skill.tool,
      name: skill.name,
      status: await remoteSkillStatus(config, skill.path)
    });
  }
  return snapshots;
}

function parseOsRelease(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    values[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return values;
}

function osSnapshotFromParts(osRelease: string, uname: string): RuntimeOsSnapshot {
  const release = parseOsRelease(osRelease);
  const unameParts = uname.trim().split(/\s+/).filter(Boolean);
  return {
    ...(release.NAME ? { name: release.NAME } : {}),
    ...(release.PRETTY_NAME ? { pretty_name: release.PRETTY_NAME } : {}),
    ...(unameParts.length >= 2 ? { kernel: `${unameParts[0]} ${unameParts[1]}` } : {}),
    ...(unameParts.length >= 1 ? { arch: unameParts.at(-1) } : {})
  };
}

async function remoteOs(config: RuntimeDeviceConfig): Promise<RuntimeOsSnapshot | undefined> {
  const script = [
    'printf "__AWF_OS__\\n"',
    "cat /etc/os-release 2>/dev/null || true",
    'printf "__AWF_UNAME__\\n"',
    "uname -srm 2>/dev/null || true"
  ].join("\n");
  try {
    const stdout = await runSsh(config, script);
    const [, rest = ""] = stdout.split("__AWF_OS__\n");
    const [osRelease = "", uname = ""] = rest.split("__AWF_UNAME__\n");
    const snapshot = osSnapshotFromParts(osRelease, uname);
    return Object.keys(snapshot).length > 0 ? snapshot : undefined;
  } catch {
    return undefined;
  }
}

function splitList(value: string | undefined): string[] | undefined {
  const items = (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function normalizeToolVersion(tool: "claude" | "codex" | "cc_switch", value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (tool === "claude") {
    return trimmed.replace(/\s*\(Claude Code\)\s*$/, "");
  }
  return trimmed;
}

function runtimeToolFallbacks(): RuntimeToolsSnapshot {
  return {
    claude: { name: "Claude Code", installed: false },
    codex: { name: "Codex", installed: false },
    cc_switch: { name: "cc-switch", installed: false }
  };
}

function parseRuntimeTools(stdout: string): RuntimeToolsSnapshot {
  const tools = runtimeToolFallbacks();
  const lines = stdout.split("__AWF_TOOLS__\n").at(-1)?.split("\n") ?? [];
  for (const line of lines.map((item) => item.trim()).filter(Boolean)) {
    const [id, installed, binaryPath, version, configPaths, managed, dataPaths, dbUserVersion] = line.split("|");
    if (id !== "claude" && id !== "codex" && id !== "cc_switch") continue;
    const base = tools[id];
    tools[id] = {
      ...base,
      installed: installed === "1",
      ...(binaryPath ? { binary_path: binaryPath } : {}),
      ...(normalizeToolVersion(id, version ?? "") ? { version: normalizeToolVersion(id, version ?? "") } : {}),
      ...(splitList(configPaths) ? { config_paths: splitList(configPaths) } : {}),
      ...(managed === "0" || managed === "1" ? { managed_by_cc_switch: managed === "1" } : {}),
      ...(splitList(dataPaths) ? { data_paths: splitList(dataPaths) } : {}),
      ...(dbUserVersion && /^\d+$/.test(dbUserVersion) ? { db_user_version: Number(dbUserVersion) } : {})
    };
  }
  return tools;
}

async function remoteRuntimeTools(config: RuntimeDeviceConfig): Promise<RuntimeToolsSnapshot> {
  const script = runtimeToolsScript();
  try {
    return parseRuntimeTools(await runSsh(config, script));
  } catch {
    return runtimeToolFallbacks();
  }
}

function runtimeToolsScript(): string {
  return [
    runtimePathPrefix(),
    'tool_version() {',
    '  id="$1"; bin="$2"; version="";',
    '  for arg in --version -V version; do',
    '    version="$("$id" "$arg" 2>/dev/null | head -n 1 | tr "|" " " || true)";',
    '    [ -n "$version" ] && { printf "%s" "$version"; return 0; }',
    '  done;',
    '  if command -v dpkg-query >/dev/null 2>&1; then',
    '    package="$(dpkg-query -S "$bin" 2>/dev/null | head -n 1 | cut -d: -f1 || true)";',
    "    [ -n \"$package\" ] && version=\"$(dpkg-query -W -f='${Version}' \"$package\" 2>/dev/null || true)\";",
    '  fi;',
    '  if [ -z "$version" ] && command -v rpm >/dev/null 2>&1; then',
    '    version="$(rpm -qf --qf "%{VERSION}-%{RELEASE}" "$bin" 2>/dev/null || true)";',
    '    printf "%s" "$version" | grep -Eq "^[0-9]+[.][0-9]+" || version="";',
    '  fi;',
    '  if [ -z "$version" ]; then',
    '    resolved="$(readlink -f "$bin" 2>/dev/null || printf "%s" "$bin")";',
    '    version="$(printf "%s\\n%s\\n" "$bin" "$resolved" | grep -Eo "v?[0-9]+[.][0-9]+[.][0-9]+" | head -n 1 | sed "s/^v//" || true)";',
    '  fi;',
    '  printf "%s" "$version";',
    '}',
    'tool_line() {',
    '  id="$1"; label="$2"; config_list="$3"; managed="$4"; data_list="${5:-}"; db_version="${6:-}";',
    '  bin="$(command -v "$id" 2>/dev/null || true)";',
    '  installed=0; version="";',
    '  if [ -n "$bin" ]; then',
    '    installed=1;',
    '    version="$(tool_version "$id" "$bin")";',
    '  fi;',
    '  existing_configs="";',
    '  old_ifs="$IFS"; IFS=",";',
    '  for p in $config_list; do [ -e "$p" ] && existing_configs="${existing_configs}${existing_configs:+,}$p"; done;',
    '  IFS="$old_ifs";',
    '  existing_data=""; old_ifs="$IFS"; IFS=",";',
    '  for p in $data_list; do [ -e "$p" ] && existing_data="${existing_data}${existing_data:+,}$p"; done;',
    '  IFS="$old_ifs";',
    '  printf "%s|%s|%s|%s|%s|%s|%s|%s\\n" "$label" "$installed" "$bin" "$version" "$existing_configs" "$managed" "$existing_data" "$db_version";',
    '}',
    'cc_db="$HOME/.cc-switch/cc-switch.db"',
    'cc_db_version=""',
    'if [ -e "$cc_db" ] && command -v sqlite3 >/dev/null 2>&1; then cc_db_version="$(sqlite3 "$cc_db" "PRAGMA user_version;" 2>/dev/null || true)"; fi',
    'if [ -z "$cc_db_version" ] && [ -e "$cc_db" ] && command -v python3 >/dev/null 2>&1; then cc_db_version="$(python3 - "$cc_db" <<\'PY\' 2>/dev/null || true',
    'import sqlite3, sys',
    'con = sqlite3.connect(sys.argv[1])',
    'print(con.execute("PRAGMA user_version").fetchone()[0])',
    'PY',
    ')"; fi',
    'cc_has_common_claude=0; cc_has_common_codex=0',
    'if [ -e "$cc_db" ] && command -v sqlite3 >/dev/null 2>&1; then',
    '  sqlite3 "$cc_db" "SELECT 1 FROM settings WHERE key = \'common_config_claude\' LIMIT 1;" 2>/dev/null | grep -q 1 && cc_has_common_claude=1 || true;',
    '  sqlite3 "$cc_db" "SELECT 1 FROM settings WHERE key = \'common_config_codex\' LIMIT 1;" 2>/dev/null | grep -q 1 && cc_has_common_codex=1 || true;',
    'elif [ -e "$cc_db" ] && command -v python3 >/dev/null 2>&1; then',
    '  cc_has_common_claude="$(python3 - "$cc_db" common_config_claude <<\'PY\' 2>/dev/null || printf 0',
    'import sqlite3, sys',
    'con = sqlite3.connect(sys.argv[1])',
    'row = con.execute("SELECT 1 FROM settings WHERE key = ? LIMIT 1", (sys.argv[2],)).fetchone()',
    'print(1 if row else 0)',
    'PY',
    '  )";',
    '  cc_has_common_codex="$(python3 - "$cc_db" common_config_codex <<\'PY\' 2>/dev/null || printf 0',
    'import sqlite3, sys',
    'con = sqlite3.connect(sys.argv[1])',
    'row = con.execute("SELECT 1 FROM settings WHERE key = ? LIMIT 1", (sys.argv[2],)).fetchone()',
    'print(1 if row else 0)',
    'PY',
    '  )";',
    'fi',
    'printf "__AWF_TOOLS__\\n"',
    'tool_line claude claude "$HOME/.claude/settings.json,$HOME/.claude.json" "$cc_has_common_claude"',
    'tool_line codex codex "$HOME/.codex/config.toml" "$cc_has_common_codex"',
    'tool_line cc-switch cc_switch "$HOME/.cc-switch/settings.json" "" "$HOME/.cc-switch/cc-switch.db" "$cc_db_version"'
  ].join("\n");
}

async function localOs(): Promise<RuntimeOsSnapshot> {
  let osRelease = "";
  try {
    osRelease = await fs.readFile("/etc/os-release", "utf8");
  } catch {
    osRelease = "";
  }
  return osSnapshotFromParts(osRelease, `${nodeOs.type()} ${nodeOs.release()} ${nodeOs.arch()}`);
}

async function localRuntimeTools(): Promise<RuntimeToolsSnapshot> {
  try {
    const { stdout } = await execFileAsync("sh", ["-lc", runtimeToolsScript()], {
      timeout: 10000,
      maxBuffer: 1024 * 1024
    });
    return parseRuntimeTools(stdout);
  } catch {
    return runtimeToolFallbacks();
  }
}

async function collectRemoteManagedAssets(
  config: RuntimeDeviceConfig,
  remoteRoot: string
): Promise<{ root_exists: boolean; assets: RuntimeAssetSnapshot[] }> {
  const findScript = [
    `if ! cd ${shellQuote(remoteRoot)} 2>/dev/null; then`,
    '  printf "__AWF_ROOT_MISSING__\\n"',
    "  exit 0",
    "fi",
    "find ai/cards ai/prompts ai/profiles ai/skills runtime/adapters -type f \\( -iname '*.md' -o -iname '*.json' \\) -print 2>/dev/null || true"
  ].join("\n");
  const stdout = await runSsh(config, findScript);
  if (stdout.startsWith("__AWF_ROOT_MISSING__")) {
    return { root_exists: false, assets: [] };
  }
  const files = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
  const assets: RuntimeAssetSnapshot[] = [];
  for (const file of files) {
    const content = await runSsh(config, `cd ${shellQuote(remoteRoot)} && cat ${shellQuote(file)}`);
    assets.push({ path: file, sha256: sha256(content), content });
  }
  return { root_exists: true, assets };
}

function parseRemoteProjects(stdout: string): RuntimeProjectSnapshot[] {
  const lines = stdout.split("__AWF_PROJECTS__\n").at(-1)?.split("\n") ?? [];
  const projects = new Map<string, RuntimeProjectSnapshot>();
  for (const line of lines.map((item) => item.trim()).filter(Boolean)) {
    const [projectPath, name, status, branch, remoteUrl, markers] = line.split("|");
    if (!projectPath || !name) continue;
    projects.set(projectPath, {
      name,
      path: projectPath,
      status: status === "clean" || status === "dirty" ? status : "unknown",
      ...(branch ? { branch } : {}),
      ...(remoteUrl ? { remote_url: remoteUrl } : {}),
      ...(splitList(markers) ? { markers: splitList(markers) } : {})
    });
  }
  return [...projects.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function workflowProjectDiscoveryScript(remoteRoot: string): string {
  const root = shellQuote(remoteRoot);
  return [
    'clean_field() { printf "%s" "$1" | tr "\\n|\\t" "   "; }',
    "emit_project() {",
    '  dir="$1";',
    '  [ -d "$dir" ] || return 0;',
    '  resolved="$(readlink -f "$dir" 2>/dev/null || printf "%s" "$dir")";',
    '  markers="";',
    '  strong_markers="";',
    '  [ -f "$resolved/AGENTS.md" ] && strong_markers="${strong_markers}${strong_markers:+,}AGENTS.md";',
    '  [ -d "$resolved/ai/cards" ] && strong_markers="${strong_markers}${strong_markers:+,}ai/cards";',
    '  [ -d "$resolved/ai/skills" ] && strong_markers="${strong_markers}${strong_markers:+,}ai/skills";',
    '  [ -d "$resolved/runtime/adapters" ] && strong_markers="${strong_markers}${strong_markers:+,}runtime/adapters";',
    '  [ -f "$resolved/.workflow-home.json" ] && strong_markers="${strong_markers}${strong_markers:+,}.workflow-home.json";',
    '  [ -n "$strong_markers" ] || return 0;',
    '  markers="$strong_markers";',
    '  [ -d "$resolved/.agents" ] && markers="${markers}${markers:+,}.agents";',
    '  name="$(basename "$resolved")";',
    '  status="unknown"; branch=""; remote="";',
    '  if git -C "$resolved" rev-parse --is-inside-work-tree >/dev/null 2>&1; then',
    '    if [ -n "$(git -C "$resolved" status --porcelain 2>/dev/null)" ]; then status="dirty"; else status="clean"; fi;',
    '    branch="$(git -C "$resolved" branch --show-current 2>/dev/null || true)";',
    '    [ -n "$branch" ] || branch="$(git -C "$resolved" rev-parse --short HEAD 2>/dev/null || true)";',
    '    remote="$(git -C "$resolved" remote get-url origin 2>/dev/null || true)";',
    "  fi;",
    '  printf "%s|%s|%s|%s|%s|%s\\n" "$(clean_field "$resolved")" "$(clean_field "$name")" "$status" "$(clean_field "$branch")" "$(clean_field "$remote")" "$(clean_field "$markers")";',
    "}",
    'printf "__AWF_PROJECTS__\\n"',
    `remote_root=${root}`,
    'emit_project "$remote_root"',
    'parent="$(dirname "$remote_root" 2>/dev/null || true)"',
    'for base in "$parent" "$HOME/work" "$HOME/projects" "$HOME/github_repos"; do',
    '  [ -d "$base" ] || continue;',
    '  for candidate in "$base"/*; do emit_project "$candidate"; done;',
    "done"
  ].join("\n");
}

async function collectRemoteWorkflowProjects(
  config: RuntimeDeviceConfig,
  remoteRoot: string
): Promise<RuntimeProjectSnapshot[]> {
  try {
    return parseRemoteProjects(await runSsh(config, workflowProjectDiscoveryScript(remoteRoot)));
  } catch {
    return [];
  }
}

async function localWorkflowProjects(root: string): Promise<RuntimeProjectSnapshot[]> {
  const markers: string[] = [];
  if (await pathExists(path.join(root, "AGENTS.md"))) markers.push("AGENTS.md");
  if (await pathExists(path.join(root, "ai/cards"))) markers.push("ai/cards");
  if (await pathExists(path.join(root, "ai/skills"))) markers.push("ai/skills");
  if (await pathExists(path.join(root, "runtime/adapters"))) markers.push("runtime/adapters");
  if (await pathExists(path.join(root, ".workflow-home.json"))) markers.push(".workflow-home.json");
  if (markers.length === 0) return [];
  if (await pathExists(path.join(root, ".agents"))) markers.push(".agents");
  let status: "clean" | "dirty" | "unknown" = "unknown";
  let branch = "";
  let remoteUrl = "";
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: root, timeout: 2500 });
    status = stdout.trim() ? "dirty" : "clean";
    branch = (await execFileAsync("git", ["branch", "--show-current"], { cwd: root, timeout: 2500 })).stdout.trim();
    remoteUrl = (await execFileAsync("git", ["remote", "get-url", "origin"], { cwd: root, timeout: 2500 })).stdout.trim();
  } catch {
    status = "unknown";
  }
  return [
    {
      name: path.basename(root),
      path: root,
      status,
      ...(branch ? { branch } : {}),
      ...(remoteUrl ? { remote_url: remoteUrl } : {}),
      markers
    }
  ];
}

async function snapshotFromSshConfig(
  root: string,
  config: RuntimeDeviceConfig
): Promise<RuntimeDeviceSnapshot> {
  const online = await probeSshOnline(config);
  if (!online) {
    const guides = {
      agents_md: unknownGuide("~/.codex/AGENTS.md"),
      claude_md: unknownGuide("~/.claude/CLAUDE.md")
    };
    return {
      id: config.id,
      label: config.label,
      ip: config.ssh.host,
      user: config.ssh.user,
      online: await probeIpOnline(config.ssh.host),
      last_seen: new Date().toISOString(),
      inventory_status: "network-only",
      inventory_note: "SSH probe failed; only network reachability was checked.",
      tools: runtimeToolFallbacks(),
      agent_guides: guides,
      guide_verification: guideVerificationForSnapshots({
        agents: guides.agents_md,
        claude: guides.claude_md
      }),
      skills: unknownWorkflowHomeSkills(),
      projects: [],
      assets: []
    };
  }

  const guides = await remoteAgentGuides(config);
  const skills = await remoteWorkflowHomeSkills(config);
  const os = await remoteOs(config);
  const tools = await remoteRuntimeTools(config);
  const assetCollection = config.remote_root
    ? await collectRemoteManagedAssets(config, config.remote_root)
    : undefined;
  const projects = config.remote_root ? await collectRemoteWorkflowProjects(config, config.remote_root) : [];
  const assets = assetCollection?.assets ?? [];
  const hasCompleteInventory = Boolean(config.remote_root && assetCollection?.root_exists);
  return {
    id: config.id,
    label: config.label,
    ip: config.ssh.host,
    user: config.ssh.user,
    ...(os ? { os } : {}),
    tools,
    online: true,
    last_seen: new Date().toISOString(),
    inventory_status: hasCompleteInventory ? "complete" : "guide-only",
    ...(hasCompleteInventory
      ? {}
      : {
          inventory_note: config.remote_root
            ? `SSH probe succeeded; remote project root ${config.remote_root} was not found.`
            : "SSH guide probe succeeded; remote project asset inventory was not configured."
        }),
    agent_guides: guides,
    guide_verification: guideVerificationForSnapshots({
      agents: guides.agents_md,
      claude: guides.claude_md
    }),
    skills,
    projects,
    assets
  };
}

async function baselineCommand(root: string): Promise<void> {
  const out = argValue("--out", "runtime/baseline/assets.json");
  const baseline: RuntimeBaseline = {
    generated_at: new Date().toISOString(),
    source: "github",
    assets: await collectManagedAssets(root)
  };
  await writeJson(path.join(root, out), baseline);
  console.log(`wrote ${out} with ${baseline.assets.length} managed assets`);
}

async function inspectCommand(root: string): Promise<void> {
  const id = argValue("--device", "local");
  const label = argValue("--label", id);
  const ip = argValue("--ip", "");
  const sshTarget = argValue("--ssh", "");
  const remoteRoot = argValue("--remote-root", "");
  const networkOnly = process.argv.includes("--network-only");
  const out = argValue("--out", `runtime/devices/${id}.json`);
  if (sshTarget) {
    const ssh = parseSshTarget(sshTarget);
    const device = await snapshotFromSshConfig(root, {
      id,
      label,
      ssh,
      remote_root: remoteRoot || defaultRemoteRootForSshTarget(ssh),
      snapshot_path: out
    });
    await writeJson(path.join(root, out), device);
    console.log(
      `wrote ${out} with ${device.assets.length} managed assets; ${sshTarget} is ${
        device.online ? "online" : "offline"
      }`
    );
    return;
  }
  const online = await probeIpOnline(ip);
  const agentGuides = await localAgentGuides(networkOnly);
  const user = process.env.USER || process.env.USERNAME || undefined;
  const os = networkOnly ? undefined : await localOs();
  const tools = networkOnly ? runtimeToolFallbacks() : await localRuntimeTools();
  const skills = await localWorkflowHomeSkills(networkOnly);
  const device: RuntimeDeviceSnapshot = {
    id,
    label,
    ...(ip ? { ip } : {}),
    ...(user ? { user } : {}),
    ...(os ? { os } : {}),
    tools,
    online,
    last_seen: new Date().toISOString(),
    inventory_status: networkOnly ? "network-only" : "complete",
    ...(networkOnly
      ? { inventory_note: "IP probe succeeded/failed locally; remote asset inventory was not collected." }
      : {}),
    agent_guides: agentGuides,
    guide_verification: guideVerificationForSnapshots({
      agents: agentGuides.agents_md,
      claude: agentGuides.claude_md
    }),
    skills,
    projects: networkOnly ? [] : await localWorkflowProjects(root),
    assets: networkOnly ? [] : await collectManagedAssets(root)
  };
  await writeJson(path.join(root, out), device);
  console.log(
    `wrote ${out} with ${device.assets.length} managed assets${ip ? `; ${ip} is ${online ? "online" : "offline"}` : ""}`
  );
}

async function readDeviceRegistry(root: string): Promise<RuntimeDeviceRegistry> {
  const filePath = path.join(root, "runtime/devices/config.json");
  if (!(await pathExists(filePath))) {
    return { poll_interval_seconds: 180, devices: [] };
  }
  return readJson<RuntimeDeviceRegistry>(filePath);
}

async function writeDeviceRegistry(
  root: string,
  registry: RuntimeDeviceRegistry
): Promise<void> {
  await writeJson(path.join(root, "runtime/devices/config.json"), registry);
}

async function deviceAddCommand(root: string): Promise<void> {
  const sshValue = argValue("--ssh", "");
  if (!sshValue) {
    throw new Error("--ssh <user@ip:port> is required");
  }
  const ssh = parseSshTarget(sshValue);
  const id = argValue("--id", ssh.host.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, ""));
  if (!isSafeRuntimeDeviceId(id)) {
    throw new Error("--id must be a safe lowercase device id");
  }
  const label = argValue("--label", id);
  const remoteRoot = argValue("--remote-root", "");
  const registry = await readDeviceRegistry(root);
  const nextDevice: RuntimeDeviceConfig = {
    id,
    label,
    ssh,
    remote_root: remoteRoot || defaultRemoteRootForSshTarget(ssh),
    snapshot_path: `runtime/devices/${id}.json`
  };
  await writeDeviceRegistry(root, upsertRuntimeDeviceConfig(registry, nextDevice));
  console.log(`registered ${id} at ${sshValue}; scan interval 180s`);
}

async function scanOnce(root: string, registry: RuntimeDeviceRegistry): Promise<void> {
  for (const config of registry.devices) {
    const snapshot = await snapshotFromSshConfig(root, config);
    await writeJson(path.join(root, config.snapshot_path), snapshot);
    console.log(
      `scanned ${config.id}: ${snapshot.online ? "online" : "offline"} ${snapshot.inventory_status}`
    );
  }
}

async function scanCommand(root: string): Promise<void> {
  const registry = await readDeviceRegistry(root);
  const watch = process.argv.includes("--watch");
  const interval = Number(argValue("--interval-seconds", String(registry.poll_interval_seconds)));
  if (!Number.isFinite(interval) || interval < 1) {
    throw new Error("--interval-seconds must be a positive number");
  }
  do {
    await scanOnce(root, registry);
    if (!watch) break;
    await sleep(interval * 1000);
  } while (watch);
}

async function diffCommand(root: string): Promise<void> {
  const baselinePath = path.join(root, argValue("--baseline", "runtime/baseline/assets.json"));
  const devicePath = path.join(root, argValue("--device", ""));
  if (!devicePath || devicePath === root) {
    throw new Error("--device <runtime/devices/name.json> is required");
  }
  const baseline = await readJson<RuntimeBaseline>(baselinePath);
  const device = await readJson<RuntimeDeviceSnapshot>(devicePath);
  const comparison = compareDeviceToBaseline(device, baseline);
  console.log(
    `${device.id}: missing=${comparison.counts.missing} changed=${comparison.counts.changed} extra=${comparison.counts.extra} in_sync=${comparison.counts.in_sync}`
  );
  for (const delta of comparison.changed) {
    console.log(unifiedDiffForAsset(delta));
  }
  for (const delta of comparison.missing) {
    console.log(`MISSING ${delta.path}`);
  }
  for (const delta of comparison.extra) {
    console.log(`EXTRA ${delta.path}`);
  }
}

async function syncCommand(root: string): Promise<void> {
  const apply = process.argv.includes("--apply");
  const targetRoot = argValue("--target-root", "");
  if (apply && !targetRoot) {
    throw new Error("--apply requires --target-root so writes are explicit");
  }

  const baselinePath = path.join(root, argValue("--baseline", "runtime/baseline/assets.json"));
  const devicePath = path.join(root, argValue("--device", ""));
  if (!devicePath || devicePath === root) {
    throw new Error("--device <runtime/devices/name.json> is required");
  }
  const baseline = await readJson<RuntimeBaseline>(baselinePath);
  const device = await readJson<RuntimeDeviceSnapshot>(devicePath);
  if (device.inventory_status === "network-only") {
    const message = `network-only snapshot ${device.id}: remote asset inventory was not collected`;
    if (apply) {
      throw new Error(
        `Refusing to apply sync from a network-only snapshot (${device.id}). Run runtime:inspect on the target device to collect a complete inventory first.`
      );
    }
    console.log(message);
  }
  const comparison = compareDeviceToBaseline(device, baseline);
  const toWrite = [...comparison.missing, ...comparison.changed];

  console.log(
    `${apply ? "apply" : "dry-run"} sync ${device.id}: write=${toWrite.length} extra=${comparison.extra.length}`
  );
  for (const delta of toWrite) {
    console.log(`${apply ? "write" : "would write"} ${delta.path}`);
    if (apply && delta.baseline?.content !== undefined) {
      const outputPath = path.join(targetRoot, delta.path);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, delta.baseline.content, "utf8");
    }
  }
  for (const delta of comparison.extra) {
    console.log(`keep extra ${delta.path}`);
  }
}

async function main(): Promise<void> {
  const root = process.cwd();
  const command = process.argv[2];
  if (command === "baseline") return baselineCommand(root);
  if (command === "inspect") return inspectCommand(root);
  if (command === "device:add") return deviceAddCommand(root);
  if (command === "scan") return scanCommand(root);
  if (command === "diff") return diffCommand(root);
  if (command === "sync") return syncCommand(root);
  throw new Error("usage: runtime-assets <baseline|inspect|device:add|scan|diff|sync>");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
