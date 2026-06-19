import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import {
  compareDeviceToBaseline,
  repositoryWebUrlFromRemote,
  runtimeSummary,
  unifiedDiffForAsset,
  type RuntimeBaseline,
  type RuntimeComparison,
  type RuntimeDeviceSnapshot,
  type RuntimeDeviceRegistry,
  type RuntimeSummary
} from "./inventory";

const execFileAsync = promisify(execFile);

export interface RuntimeRepositoryState {
  remote_url: string;
  web_url: string;
  branch: string;
  head: string;
  status_line: string;
  dirty_files: number;
}

export interface RuntimeState {
  baseline: RuntimeBaseline;
  devices: RuntimeDeviceSnapshot[];
  comparisons: RuntimeComparison[];
  summary: RuntimeSummary;
  scanConfig: RuntimeDeviceRegistry;
  repository: RuntimeRepositoryState;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function listDeviceFiles(root: string): Promise<string[]> {
  const dir = path.join(root, "runtime", "devices");
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "config.json")
      .map((entry) => path.join(dir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function readScanConfig(root: string): Promise<RuntimeDeviceRegistry> {
  try {
    return await readJson<RuntimeDeviceRegistry>(path.join(root, "runtime/devices/config.json"));
  } catch {
    return { poll_interval_seconds: 180, devices: [] };
  }
}

async function git(root: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: root, timeout: 2500 });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function loadRepositoryState(root: string): Promise<RuntimeRepositoryState> {
  const remoteUrl = await git(root, ["remote", "get-url", "origin"]);
  const status = await git(root, ["status", "--short", "--branch"]);
  const statusLines = status.split("\n").filter(Boolean);
  const statusLine = statusLines.find((line) => line.startsWith("## "))?.slice(3) || "unknown";
  const branch = await git(root, ["branch", "--show-current"]);
  const head = (await git(root, ["rev-parse", "--short", "HEAD"])) || "no commits";
  return {
    remote_url: remoteUrl || "unknown",
    web_url: remoteUrl ? repositoryWebUrlFromRemote(remoteUrl) : "unknown",
    branch: branch || "unknown",
    head,
    status_line: statusLine,
    dirty_files: statusLines.filter((line) => !line.startsWith("## ")).length
  };
}

export async function loadRuntimeState(root = process.cwd()): Promise<RuntimeState> {
  const baseline = await readJson<RuntimeBaseline>(
    path.join(root, "runtime", "baseline", "assets.json")
  );
  const devices = await Promise.all(
    (await listDeviceFiles(root)).map((file) => readJson<RuntimeDeviceSnapshot>(file))
  );
  const comparisons = devices.map((device) => compareDeviceToBaseline(device, baseline));
  return {
    baseline,
    devices,
    comparisons,
    summary: runtimeSummary(comparisons),
    scanConfig: await readScanConfig(root),
    repository: await loadRepositoryState(root)
  };
}

function isPrivateRuntimeAssetPath(assetPath: string): boolean {
  return /^ai\/(?:prompts|profiles)\//i.test(assetPath);
}

function displayPath(assetPath: string): string {
  return isPrivateRuntimeAssetPath(assetPath) ? "[redacted private/local asset]" : assetPath;
}

export function diffTextForComparison(comparison: RuntimeComparison): string {
  const changed = comparison.changed.map((delta) =>
    isPrivateRuntimeAssetPath(delta.path)
      ? `CHANGED ${displayPath(delta.path)}\n`
      : unifiedDiffForAsset(delta)
  );
  const missing = comparison.missing.map((delta) => `MISSING ${displayPath(delta.path)}\n`);
  const extra = comparison.extra.map((delta) => `EXTRA ${displayPath(delta.path)}\n`);
  return [...changed, ...missing, ...extra].join("\n").trimEnd();
}
