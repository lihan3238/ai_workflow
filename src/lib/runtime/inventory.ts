import { diffLines } from "diff";
import type { SshTarget } from "./ssh";
export { defaultRemoteRootForSshTarget, parseSshTarget } from "./ssh";
export type { SshTarget } from "./ssh";

export type PresenceStatus = "present" | "missing" | "changed" | "unknown";
export type SkillStatus = "present" | "missing" | "changed" | "unknown";
export type ProjectStatus = "clean" | "dirty" | "unknown";
export type InventoryStatus = "complete" | "guide-only" | "network-only";
export type GuideVerificationStatus = "verified" | "mismatch" | "unknown";
export type GuideVerificationMode =
  | "shared-target"
  | "claude-imports-agents"
  | "identical-content"
  | "missing"
  | "unknown";

export interface RuntimeAssetSnapshot {
  path: string;
  sha256: string;
  content?: string;
}

export interface RuntimeBaseline {
  generated_at: string;
  source: "github" | "repo";
  assets: RuntimeAssetSnapshot[];
}

export interface AgentGuideSnapshot {
  path: string;
  status: PresenceStatus;
  sha256?: string;
  content?: string;
  resolved_path?: string;
}

export interface SkillSnapshot {
  tool: "codex" | "claude" | "other";
  name: string;
  status: SkillStatus;
}

export interface RuntimeProjectSnapshot {
  name: string;
  path: string;
  status: ProjectStatus;
  branch?: string;
  remote_url?: string;
  markers?: string[];
}

export interface RuntimeOsSnapshot {
  name?: string;
  pretty_name?: string;
  kernel?: string;
  arch?: string;
}

export interface RuntimeToolSnapshot {
  name: string;
  installed: boolean;
  version?: string;
  binary_path?: string;
  config_paths?: string[];
  data_paths?: string[];
  managed_by_cc_switch?: boolean;
  db_user_version?: number;
}

export interface RuntimeToolsSnapshot {
  claude: RuntimeToolSnapshot;
  codex: RuntimeToolSnapshot;
  cc_switch: RuntimeToolSnapshot;
}

export interface RuntimeDeviceSnapshot {
  id: string;
  label: string;
  ip?: string;
  user?: string;
  os?: RuntimeOsSnapshot;
  online: boolean;
  last_seen: string;
  inventory_status?: InventoryStatus;
  inventory_note?: string;
  tools?: RuntimeToolsSnapshot;
  agent_guides: {
    agents_md: AgentGuideSnapshot;
    claude_md: AgentGuideSnapshot;
  };
  guide_verification?: AgentGuideVerification;
  skills: SkillSnapshot[];
  projects: RuntimeProjectSnapshot[];
  assets: RuntimeAssetSnapshot[];
}

export interface AgentGuideVerification {
  status: GuideVerificationStatus;
  mode: GuideVerificationMode;
  detail: string;
}

export interface RuntimeDeviceConfig {
  id: string;
  label: string;
  ssh: SshTarget;
  remote_root?: string;
  snapshot_path: string;
}

export interface RuntimeDeviceRegistry {
  poll_interval_seconds: number;
  devices: RuntimeDeviceConfig[];
}

export interface AssetDelta {
  path: string;
  device_id: string;
  device_label: string;
  device?: RuntimeAssetSnapshot;
  baseline?: RuntimeAssetSnapshot;
}

export interface RuntimeComparison {
  device: RuntimeDeviceSnapshot;
  counts: {
    missing: number;
    changed: number;
    extra: number;
    in_sync: number;
  };
  missing: AssetDelta[];
  changed: AssetDelta[];
  extra: AssetDelta[];
  in_sync: AssetDelta[];
}

export interface RuntimeSummary {
  devices: number;
  online: number;
  missing: number;
  changed: number;
  extra: number;
  in_sync: number;
}

function byPath(assets: RuntimeAssetSnapshot[]): Map<string, RuntimeAssetSnapshot> {
  return new Map(assets.map((asset) => [asset.path, asset]));
}

function deltaFor(
  device: RuntimeDeviceSnapshot,
  path: string,
  deviceAsset: RuntimeAssetSnapshot | undefined,
  baselineAsset: RuntimeAssetSnapshot | undefined
): AssetDelta {
  return {
    path,
    device_id: device.id,
    device_label: device.label,
    device: deviceAsset,
    baseline: baselineAsset
  };
}

export function compareDeviceToBaseline(
  device: RuntimeDeviceSnapshot,
  baseline: RuntimeBaseline
): RuntimeComparison {
  const baselineByPath = byPath(baseline.assets);
  const deviceByPath = byPath(device.assets);
  const allPaths = [...new Set([...baselineByPath.keys(), ...deviceByPath.keys()])].sort();

  const missing: AssetDelta[] = [];
  const changed: AssetDelta[] = [];
  const extra: AssetDelta[] = [];
  const inSync: AssetDelta[] = [];

  for (const path of allPaths) {
    const baselineAsset = baselineByPath.get(path);
    const deviceAsset = deviceByPath.get(path);
    const delta = deltaFor(device, path, deviceAsset, baselineAsset);

    if (baselineAsset && !deviceAsset) {
      missing.push(delta);
    } else if (!baselineAsset && deviceAsset) {
      extra.push(delta);
    } else if (baselineAsset && deviceAsset && baselineAsset.sha256 !== deviceAsset.sha256) {
      changed.push(delta);
    } else {
      inSync.push(delta);
    }
  }

  return {
    device,
    counts: {
      missing: missing.length,
      changed: changed.length,
      extra: extra.length,
      in_sync: inSync.length
    },
    missing,
    changed,
    extra,
    in_sync: inSync
  };
}

export function runtimeSummary(comparisons: RuntimeComparison[]): RuntimeSummary {
  return comparisons.reduce(
    (summary, comparison) => ({
      devices: summary.devices + 1,
      online: summary.online + (comparison.device.online ? 1 : 0),
      missing: summary.missing + comparison.counts.missing,
      changed: summary.changed + comparison.counts.changed,
      extra: summary.extra + comparison.counts.extra,
      in_sync: summary.in_sync + comparison.counts.in_sync
    }),
    { devices: 0, online: 0, missing: 0, changed: 0, extra: 0, in_sync: 0 }
  );
}

export function runtimeDeviceHref(device: Pick<RuntimeDeviceSnapshot, "id">): string {
  return `/runtime/${encodeURIComponent(device.id)}/`;
}

export function runtimeDeviceStatusLine(
  device: Pick<RuntimeDeviceSnapshot, "ip" | "last_seen">
): string {
  const seen = `上次在线 ${device.last_seen}`;
  return device.ip ? `${device.ip} · ${seen}` : seen;
}

export function runtimeDeviceIdentityLine(
  device: Pick<RuntimeDeviceSnapshot, "ip" | "user" | "os">
): string {
  const address = device.user && device.ip ? `${device.user}@${device.ip}` : device.user || device.ip || "unknown host";
  const osName = device.os?.pretty_name || device.os?.name || device.os?.kernel;
  return [address, osName, device.os?.arch].filter(Boolean).join(" · ");
}

export function runtimeDeviceInventoryLine(
  device: Pick<RuntimeDeviceSnapshot, "inventory_status">
): string {
  if (device.inventory_status === "network-only") {
    return "只完成网络探测，尚未采集远端资产清单";
  }
  if (device.inventory_status === "guide-only") {
    return "SSH 已连通，尚未采集项目资产清单";
  }
  return "已采集资产清单";
}

export function runtimeToolStatusCounts(
  device: Pick<RuntimeDeviceSnapshot, "tools">
): { installed: number; missing: number; total: number } {
  const tools = device.tools ? Object.values(device.tools) : [];
  const installed = tools.filter((tool) => tool.installed).length;
  return {
    installed,
    missing: tools.length - installed,
    total: tools.length
  };
}

export function guideVerificationForSnapshots(args: {
  agents: AgentGuideSnapshot;
  claude: AgentGuideSnapshot;
}): AgentGuideVerification {
  const { agents, claude } = args;
  if (agents.status === "unknown" || claude.status === "unknown") {
    return {
      status: "unknown",
      mode: "unknown",
      detail: "尚未采集 AGENTS.md / CLAUDE.md，无法验证"
    };
  }
  if (agents.status !== "present" || claude.status !== "present") {
    return {
      status: "mismatch",
      mode: "missing",
      detail: "AGENTS.md 或 CLAUDE.md 缺失"
    };
  }
  if (agents.resolved_path && agents.resolved_path === claude.resolved_path) {
    return {
      status: "verified",
      mode: "shared-target",
      detail: "AGENTS.md 与 CLAUDE.md 指向同一个 canonical 文件"
    };
  }
  if (claude.content?.trim() === "@AGENTS.md") {
    return {
      status: "verified",
      mode: "claude-imports-agents",
      detail: "CLAUDE.md 使用 @AGENTS.md 引入 canonical 指南"
    };
  }
  if (agents.content !== undefined && agents.content === claude.content) {
    return {
      status: "verified",
      mode: "identical-content",
      detail: "AGENTS.md 与 CLAUDE.md 内容一致"
    };
  }
  return {
    status: "mismatch",
    mode: "unknown",
    detail: "CLAUDE.md 未验证为 @AGENTS.md 引用、同源 symlink 或相同内容"
  };
}

export function runtimeGuideVerificationLine(
  verification: AgentGuideVerification | undefined
): string {
  if (!verification) return "尚未验证 AGENTS.md / CLAUDE.md 关系";
  return verification.detail;
}

export function isSafeRuntimeDeviceId(id: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(id);
}

export function repositoryWebUrlFromRemote(remoteUrl: string): string {
  const trimmed = remoteUrl.trim().replace(/\.git$/, "");
  const sshMatch = /^git@github\.com:([^/]+\/.+)$/.exec(trimmed);
  if (sshMatch) return `https://github.com/${sshMatch[1]}`;
  const httpsMatch = /^https:\/\/github\.com\/([^/]+\/.+)$/.exec(trimmed);
  if (httpsMatch) return `https://github.com/${httpsMatch[1]}`;
  return remoteUrl;
}

export function upsertRuntimeDeviceConfig(
  registry: RuntimeDeviceRegistry,
  device: RuntimeDeviceConfig
): RuntimeDeviceRegistry {
  const devices = registry.devices.filter((item) => item.id !== device.id);
  devices.push(device);
  devices.sort((left, right) => left.id.localeCompare(right.id));
  return {
    poll_interval_seconds: registry.poll_interval_seconds || 180,
    devices
  };
}

export function removeRuntimeDeviceConfig(
  registry: RuntimeDeviceRegistry,
  id: string
): { registry: RuntimeDeviceRegistry; removed: boolean } {
  const devices = registry.devices.filter((device) => device.id !== id);
  return {
    registry: {
      poll_interval_seconds: registry.poll_interval_seconds || 180,
      devices
    },
    removed: devices.length !== registry.devices.length
  };
}

export function unifiedDiffForAsset(delta: AssetDelta): string {
  const before = delta.device?.content ?? "";
  const after = delta.baseline?.content ?? "";
  const beforeLines = linesForDiff(before);
  const afterLines = linesForDiff(after);
  const lines = [
    `--- ${delta.device_id}:${delta.path}`,
    `+++ github:${delta.path}`,
    "@@"
  ];

  for (const entry of lineDiff(beforeLines, afterLines)) {
    lines.push(`${entry.prefix}${entry.line}`);
  }

  return `${lines.join("\n")}\n`;
}

function linesForDiff(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function lineDiff(
  beforeLines: string[],
  afterLines: string[]
): Array<{ prefix: " " | "-" | "+"; line: string }> {
  const beforeText = `${beforeLines.join("\n")}${beforeLines.length > 0 ? "\n" : ""}`;
  const afterText = `${afterLines.join("\n")}${afterLines.length > 0 ? "\n" : ""}`;
  const diff: Array<{ prefix: " " | "-" | "+"; line: string }> = [];

  for (const part of diffLines(beforeText, afterText, { newlineIsToken: false })) {
    const prefix = part.added ? "+" : part.removed ? "-" : " ";
    for (const line of linesForDiff(part.value)) {
      diff.push({ prefix, line });
    }
  }

  return diff;
}
