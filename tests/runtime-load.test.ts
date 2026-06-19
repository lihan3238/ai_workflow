import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareDeviceToBaseline, type RuntimeBaseline, type RuntimeDeviceSnapshot } from "../src/lib/runtime/inventory";
import { diffTextForComparison, loadRuntimeState } from "../src/lib/runtime/load";

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

describe("runtime web state", () => {
  it("redacts private prompt and profile paths from web diff text", () => {
    const baseline: RuntimeBaseline = {
      generated_at: "2026-06-19T00:00:00.000Z",
      source: "github",
      assets: [
        {
          path: "ai/prompts/codex-default.md",
          sha256: "new",
          content: "private prompt baseline"
        }
      ]
    };
    const device: RuntimeDeviceSnapshot = {
      id: "device",
      label: "Device",
      online: true,
      last_seen: "2026-06-19T00:00:00.000Z",
      agent_guides: {
        agents_md: { path: "~/.codex/AGENTS.md", status: "present" },
        claude_md: { path: "~/.claude/CLAUDE.md", status: "present" }
      },
      skills: [],
      projects: [],
      assets: [
        {
          path: "ai/prompts/codex-default.md",
          sha256: "old",
          content: "private prompt device copy"
        },
        {
          path: "ai/profiles/local.md",
          sha256: "extra",
          content: "private profile"
        }
      ]
    };

    const text = diffTextForComparison(compareDeviceToBaseline(device, baseline));

    expect(text).toContain("[redacted private/local asset]");
    expect(text).not.toContain("ai/prompts/codex-default.md");
    expect(text).not.toContain("ai/profiles/local.md");
    expect(text).not.toContain("private prompt");
    expect(text).not.toContain("private profile");
  });

  it("loads device scan config without treating it as a device snapshot", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ai-workflow-load-"));
    try {
      await writeJson(path.join(root, "runtime/baseline/assets.json"), {
        generated_at: "2026-06-19T00:00:00.000Z",
        source: "github",
        assets: []
      });
      await writeJson(path.join(root, "runtime/devices/local.json"), {
        id: "local",
        label: "Local",
        online: true,
        last_seen: "2026-06-19T00:00:00.000Z",
        agent_guides: {
          agents_md: { path: "~/.codex/AGENTS.md", status: "present" },
          claude_md: { path: "~/.claude/CLAUDE.md", status: "present" }
        },
        skills: [],
        projects: [],
        assets: []
      });
      await writeJson(path.join(root, "runtime/devices/config.json"), {
        poll_interval_seconds: 180,
        devices: [
          {
            id: "father-linux",
            label: "Father Linux workstation",
            ssh: {
              user: "lihan",
              host: "10.81.2.18",
              port: 22,
              target: "lihan@10.81.2.18"
            },
            snapshot_path: "runtime/devices/father-linux.json"
          }
        ]
      });

      const runtime = await loadRuntimeState(root);

      expect(runtime.devices.map((device) => device.id)).toEqual(["local"]);
      expect(runtime.scanConfig.devices.map((device) => device.id)).toEqual(["father-linux"]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
