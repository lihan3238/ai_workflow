import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const tsxCli = path.join(repoRoot, "node_modules/tsx/dist/cli.mjs");
const serverScript = path.join(repoRoot, "scripts/operator-server.ts");
const tempRoots: string[] = [];
let server: ChildProcessWithoutNullStreams | undefined;

async function makeRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ai-workflow-operator-"));
  tempRoots.push(root);
  await fs.mkdir(path.join(root, "runtime/devices"), { recursive: true });
  await fs.mkdir(path.join(root, "dist-operator"), { recursive: true });
  await fs.writeFile(path.join(root, "dist-operator/index.html"), "ok", "utf8");
  await fs.writeFile(
    path.join(root, "scripts-build-site-stub.mjs"),
    "import { mkdirSync, writeFileSync } from 'node:fs'; mkdirSync('dist-operator', { recursive: true }); writeFileSync('dist-operator/index.html', 'rebuilt');\n",
    "utf8"
  );
  await fs.mkdir(path.join(root, "scripts"), { recursive: true });
  await fs.copyFile(path.join(root, "scripts-build-site-stub.mjs"), path.join(root, "scripts/build-site.mjs"));
  return root;
}

async function waitForServer(port: number): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/runtime/devices`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("operator server did not start");
}

afterEach(async () => {
  server?.kill();
  server = undefined;
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("operator server", () => {
  it("adds and deletes runtime hosts through the local API", async () => {
    const root = await makeRoot();
    const port = 8199;
    server = spawn(process.execPath, [tsxCli, serverScript], {
      cwd: root,
      env: {
        ...process.env,
        AI_WORKFLOW_HOST: "127.0.0.1",
        AI_WORKFLOW_PORT: String(port),
        AI_WORKFLOW_DIST: "dist-operator"
      }
    });
    await waitForServer(port);

    const addResponse = await fetch(`http://127.0.0.1:${port}/api/runtime/devices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "father-linux",
        label: "Father Linux workstation",
        ssh: "user@10.81.2.18:22"
      })
    });
    expect(addResponse.status).toBe(200);
    const registry = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/config.json"), "utf8")
    );
    expect(registry.devices[0].id).toBe("father-linux");
    expect(registry.devices[0].remote_root).toBe("/home/user/work/ai_workflow");

    await fs.writeFile(path.join(root, "runtime/devices/father-linux.json"), "{}", "utf8");
    const deleteResponse = await fetch(
      `http://127.0.0.1:${port}/api/runtime/devices/father-linux`,
      { method: "DELETE" }
    );
    expect(deleteResponse.status).toBe(200);
    const nextRegistry = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/config.json"), "utf8")
    );
    expect(nextRegistry.devices).toEqual([]);
    await expect(
      fs.access(path.join(root, "runtime/devices/father-linux.json"))
    ).rejects.toThrow();
  });

  it("rejects unsafe device ids before writing config or snapshots", async () => {
    const root = await makeRoot();
    const port = 8200;
    server = spawn(process.execPath, [tsxCli, serverScript], {
      cwd: root,
      env: {
        ...process.env,
        AI_WORKFLOW_HOST: "127.0.0.1",
        AI_WORKFLOW_PORT: String(port),
        AI_WORKFLOW_DIST: "dist-operator"
      }
    });
    await waitForServer(port);

    const addResponse = await fetch(`http://127.0.0.1:${port}/api/runtime/devices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "../bad",
        label: "Bad",
        ssh: "user@10.81.2.18:22"
      })
    });
    const deleteResponse = await fetch(
      `http://127.0.0.1:${port}/api/runtime/devices/..%2Fbad`,
      { method: "DELETE" }
    );

    expect(addResponse.status).toBe(400);
    expect(await addResponse.text()).toContain("safe device id");
    expect(deleteResponse.status).toBe(400);
    await expect(fs.access(path.join(root, "runtime/devices/config.json"))).rejects.toThrow();
    await expect(fs.access(path.join(root, "bad.json"))).rejects.toThrow();
  });

  it("blocks encoded path traversal outside the operator artifact directory", async () => {
    const root = await makeRoot();
    const port = 8201;
    await fs.mkdir(path.join(root, "dist-operator-sibling"), { recursive: true });
    await fs.writeFile(path.join(root, "dist-operator-sibling/secret.txt"), "secret", "utf8");
    server = spawn(process.execPath, [tsxCli, serverScript], {
      cwd: root,
      env: {
        ...process.env,
        AI_WORKFLOW_HOST: "127.0.0.1",
        AI_WORKFLOW_PORT: String(port),
        AI_WORKFLOW_DIST: "dist-operator"
      }
    });
    await waitForServer(port);

    const response = await fetch(
      `http://127.0.0.1:${port}/..%2Fdist-operator-sibling%2Fsecret.txt`
    );

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("forbidden");
  });
});
