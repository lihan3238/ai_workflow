import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import {
  defaultRemoteRootForSshTarget,
  isSafeRuntimeDeviceId,
  parseSshTarget,
  removeRuntimeDeviceConfig,
  upsertRuntimeDeviceConfig,
  type RuntimeDeviceConfig,
  type RuntimeDeviceRegistry
} from "../src/lib/runtime/inventory";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const host = process.env.AI_WORKFLOW_HOST || "127.0.0.1";
const port = Number(process.env.AI_WORKFLOW_PORT || "8100");
const outDir = path.join(root, process.env.AI_WORKFLOW_DIST || "dist-operator");

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

async function readDeviceRegistry(): Promise<RuntimeDeviceRegistry> {
  const filePath = path.join(root, "runtime/devices/config.json");
  if (!(await pathExists(filePath))) {
    return { poll_interval_seconds: 180, devices: [] };
  }
  return JSON.parse(await fs.readFile(filePath, "utf8")) as RuntimeDeviceRegistry;
}

async function writeDeviceRegistry(registry: RuntimeDeviceRegistry): Promise<void> {
  const filePath = path.join(root, "runtime/devices/config.json");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

async function rebuildOperator(): Promise<void> {
  await execFileAsync(
    process.execPath,
    ["scripts/build-site.mjs", "--mode", "operator", "--outDir", path.relative(root, outDir)],
    { cwd: root, timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
  );
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(text);
}

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> {
  if (url.pathname === "/api/runtime/devices" && request.method === "GET") {
    sendJson(response, 200, await readDeviceRegistry());
    return true;
  }

  if (url.pathname === "/api/runtime/devices" && request.method === "POST") {
    const body = await readJsonBody<{
      id: string;
      label: string;
      ssh: string;
      remote_root?: string;
    }>(request);
    if (!body.id || !body.label || !body.ssh) {
      sendJson(response, 400, { error: "id, label, and ssh are required" });
      return true;
    }
    if (!isSafeRuntimeDeviceId(body.id)) {
      sendJson(response, 400, { error: "safe device id is required" });
      return true;
    }
    const ssh = parseSshTarget(body.ssh);
    const device: RuntimeDeviceConfig = {
      id: body.id,
      label: body.label,
      ssh,
      remote_root: body.remote_root || defaultRemoteRootForSshTarget(ssh),
      snapshot_path: `runtime/devices/${body.id}.json`
    };
    const registry = upsertRuntimeDeviceConfig(await readDeviceRegistry(), device);
    await writeDeviceRegistry(registry);
    await rebuildOperator();
    sendJson(response, 200, { registry, device });
    return true;
  }

  const deleteMatch = /^\/api\/runtime\/devices\/([^/]+)$/.exec(url.pathname);
  if (deleteMatch && request.method === "DELETE") {
    const id = decodeURIComponent(deleteMatch[1]);
    if (!isSafeRuntimeDeviceId(id)) {
      sendJson(response, 400, { error: "safe device id is required" });
      return true;
    }
    const result = removeRuntimeDeviceConfig(await readDeviceRegistry(), id);
    await writeDeviceRegistry(result.registry);
    await fs.rm(path.join(root, "runtime/devices", `${id}.json`), { force: true });
    await rebuildOperator();
    sendJson(response, 200, { ...result, removed_snapshot: true });
    return true;
  }

  return false;
}

async function serveStatic(response: ServerResponse, url: URL): Promise<void> {
  const pathname = decodeURIComponent(url.pathname);
  const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const candidate = path.normalize(path.join(outDir, relative));
  const outDirRelative = path.relative(outDir, candidate);
  if (outDirRelative.startsWith("..") || path.isAbsolute(outDirRelative)) {
    sendText(response, 403, "forbidden");
    return;
  }
  const filePath = (await pathExists(candidate)) ? candidate : path.join(candidate, "index.html");
  if (!(await pathExists(filePath))) {
    sendText(response, 404, "not found");
    return;
  }
  const extension = path.extname(filePath);
  const contentType =
    extension === ".html"
      ? "text/html; charset=utf-8"
      : extension === ".css"
        ? "text/css; charset=utf-8"
        : extension === ".js"
          ? "text/javascript; charset=utf-8"
          : extension === ".json"
            ? "application/json; charset=utf-8"
            : "application/octet-stream";
  response.writeHead(200, { "content-type": contentType });
  response.end(await fs.readFile(filePath));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
    if (await handleApi(request, response, url)) return;
    await serveStatic(response, url);
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`operator server listening at http://${host}:${port}/`);
});
