import { describe, expect, it } from "vitest";
import {
  compareDeviceToBaseline,
  defaultRemoteRootForSshTarget,
  guideVerificationForSnapshots,
  parseSshTarget,
  repositoryWebUrlFromRemote,
  removeRuntimeDeviceConfig,
  runtimeDeviceHref,
  runtimeDeviceIdentityLine,
  runtimeDeviceInventoryLine,
  runtimeToolStatusCounts,
  runtimeGuideVerificationLine,
  runtimeDeviceStatusLine,
  runtimeSummary,
  upsertRuntimeDeviceConfig,
  unifiedDiffForAsset,
  type RuntimeBaseline,
  type RuntimeDeviceSnapshot
} from "../src/lib/runtime/inventory";

const baseline: RuntimeBaseline = {
  generated_at: "2026-06-19T00:00:00.000Z",
  source: "github",
  assets: [
    {
      path: "ai/cards/model.md",
      sha256: "new-model",
      content: "title: Model\nsummary: new\n"
    },
    {
      path: "ai/skills/workflow-home/SKILL.md",
      sha256: "skill",
      content: "name: workflow-home\n"
    }
  ]
};

const device: RuntimeDeviceSnapshot = {
  id: "father-linux",
  label: "Father Linux workstation",
  ip: "10.81.2.18",
  user: "rocky",
  os: {
    pretty_name: "Rocky Linux 9.6",
    kernel: "Linux 5.14.0",
    arch: "x86_64"
  },
  online: true,
  last_seen: "2026-06-19T00:01:00.000Z",
  tools: {
    claude: {
      name: "Claude Code",
      installed: true,
      version: "2.1.181",
      binary_path: "/usr/bin/claude",
      config_paths: ["~/.claude/settings.json", "~/.claude.json"],
      managed_by_cc_switch: true
    },
    codex: {
      name: "Codex",
      installed: false,
      config_paths: ["~/.codex/config.toml"],
      managed_by_cc_switch: true
    },
    cc_switch: {
      name: "cc-switch",
      installed: true,
      binary_path: "/usr/bin/cc-switch",
      config_paths: ["~/.cc-switch/settings.json"],
      data_paths: ["~/.cc-switch/cc-switch.db"],
      db_user_version: 11
    }
  },
  agent_guides: {
    agents_md: { path: "~/.codex/AGENTS.md", status: "present" as const },
    claude_md: { path: "~/.claude/CLAUDE.md", status: "missing" as const }
  },
  skills: [
    { tool: "codex", name: "workflow-home", status: "present" as const },
    { tool: "claude", name: "workflow-home", status: "missing" as const }
  ],
  projects: [
    { name: "ai_workflow", path: "/home/lihan/work/ai_workflow", status: "clean" as const }
  ],
  assets: [
    {
      path: "ai/cards/model.md",
      sha256: "old-model",
      content: "title: Model\nsummary: old\n"
    },
    {
      path: "ai/prompts/local-only.md",
      sha256: "local-extra",
      content: "local"
    }
  ]
};

describe("runtime inventory", () => {
  it("compares a device inventory with the repository baseline", () => {
    const comparison = compareDeviceToBaseline(device, baseline);

    expect(comparison.counts).toEqual({
      missing: 1,
      changed: 1,
      extra: 1,
      in_sync: 0
    });
    expect(comparison.changed.map((item) => item.path)).toEqual(["ai/cards/model.md"]);
    expect(comparison.missing.map((item) => item.path)).toEqual([
      "ai/skills/workflow-home/SKILL.md"
    ]);
    expect(comparison.extra.map((item) => item.path)).toEqual(["ai/prompts/local-only.md"]);
  });

  it("summarizes runtime drift for the home page", () => {
    expect(runtimeSummary([compareDeviceToBaseline(device, baseline)])).toEqual({
      devices: 1,
      online: 1,
      missing: 1,
      changed: 1,
      extra: 1,
      in_sync: 0
    });
  });

  it("renders changed asset content as a unified diff", () => {
    const comparison = compareDeviceToBaseline(device, baseline);
    const diff = unifiedDiffForAsset(comparison.changed[0]);

    expect(diff).toContain("--- father-linux:ai/cards/model.md");
    expect(diff).toContain("+++ github:ai/cards/model.md");
    expect(diff).toContain("-summary: old");
    expect(diff).toContain("+summary: new");
  });

  it("formats device detail navigation and network status", () => {
    expect(runtimeDeviceHref(device)).toBe("/runtime/father-linux/");
    expect(runtimeDeviceStatusLine(device)).toBe("10.81.2.18 · 上次在线 2026-06-19T00:01:00.000Z");
    expect(runtimeDeviceIdentityLine(device)).toBe("rocky@10.81.2.18 · Rocky Linux 9.6 · x86_64");
  });

  it("labels network-only device snapshots instead of treating them as complete inventory", () => {
    expect(runtimeDeviceInventoryLine({ inventory_status: "network-only" })).toBe("只完成网络探测，尚未采集远端资产清单");
    expect(runtimeDeviceInventoryLine({ inventory_status: "guide-only" })).toBe("已采集用户指南，尚未采集项目资产清单");
    expect(runtimeDeviceInventoryLine({ inventory_status: "complete" })).toBe("已采集资产清单");
  });

  it("summarizes installed runtime tools for device cards", () => {
    expect(runtimeToolStatusCounts(device)).toEqual({
      installed: 2,
      missing: 1,
      total: 3
    });
  });

  it("verifies CLAUDE.md through a canonical AGENTS.md relationship", () => {
    const importVerification = guideVerificationForSnapshots({
      agents: {
        path: "~/.codex/AGENTS.md",
        status: "present",
        content: "# Canonical\n"
      },
      claude: {
        path: "~/.claude/CLAUDE.md",
        status: "present",
        content: "@AGENTS.md\n"
      }
    });
    const symlinkVerification = guideVerificationForSnapshots({
      agents: {
        path: "~/.codex/AGENTS.md",
        status: "present",
        content: "# Canonical\n",
        resolved_path: "/home/lihan/agents/user-AGENTS.md"
      },
      claude: {
        path: "~/.claude/CLAUDE.md",
        status: "present",
        content: "# Canonical\n",
        resolved_path: "/home/lihan/agents/user-AGENTS.md"
      }
    });
    const mismatchVerification = guideVerificationForSnapshots({
      agents: {
        path: "~/.codex/AGENTS.md",
        status: "present",
        content: "# Canonical\n"
      },
      claude: {
        path: "~/.claude/CLAUDE.md",
        status: "present",
        content: "# Different\n"
      }
    });

    expect(importVerification.status).toBe("verified");
    expect(importVerification.mode).toBe("claude-imports-agents");
    expect(runtimeGuideVerificationLine(importVerification)).toContain("CLAUDE.md 使用 @AGENTS.md");
    expect(symlinkVerification.status).toBe("verified");
    expect(symlinkVerification.mode).toBe("shared-target");
    expect(mismatchVerification.status).toBe("mismatch");
  });

  it("parses SSH targets and converts GitHub SSH remotes to web URLs", () => {
    expect(parseSshTarget("lihan@10.81.2.18:2222")).toEqual({
      user: "lihan",
      host: "10.81.2.18",
      port: 2222,
      target: "lihan@10.81.2.18"
    });
    expect(repositoryWebUrlFromRemote("git@github.com:lihan3238/ai_workflow.git")).toBe(
      "https://github.com/lihan3238/ai_workflow"
    );
  });

  it("derives default remote repo roots from the SSH username", () => {
    expect(defaultRemoteRootForSshTarget(parseSshTarget("root@10.81.2.18:22"))).toBe(
      "/root/work/ai_workflow"
    );
    expect(defaultRemoteRootForSshTarget(parseSshTarget("father@10.81.2.18:22"))).toBe(
      "/home/father/work/ai_workflow"
    );
  });

  it("upserts and removes runtime device scan config entries", () => {
    const registry = {
      poll_interval_seconds: 180,
      devices: [
        {
          id: "old",
          label: "Old",
          ssh: parseSshTarget("user@10.0.0.2:22"),
          snapshot_path: "runtime/devices/old.json"
        }
      ]
    };
    const updated = upsertRuntimeDeviceConfig(registry, {
      id: "father-linux",
      label: "Father Linux workstation",
      ssh: parseSshTarget("user@10.81.2.18:22"),
      snapshot_path: "runtime/devices/father-linux.json"
    });

    expect(updated.devices.map((item) => item.id)).toEqual(["father-linux", "old"]);
    expect(
      upsertRuntimeDeviceConfig(updated, {
        id: "father-linux",
        label: "Father Linux workstation",
        ssh: parseSshTarget("user@10.81.2.18:2222"),
        snapshot_path: "runtime/devices/father-linux.json"
      }).devices.find((item) => item.id === "father-linux")?.ssh.port
    ).toBe(2222);
    expect(removeRuntimeDeviceConfig(updated, "old")).toMatchObject({
      removed: true,
      registry: { devices: [{ id: "father-linux" }] }
    });
  });
});
