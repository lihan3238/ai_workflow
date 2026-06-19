import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const tsxCli = path.join(repoRoot, "node_modules/tsx/dist/cli.mjs");
const runtimeScript = path.join(repoRoot, "scripts/runtime-assets.ts");
const tempRoots: string[] = [];

async function makeRuntimeRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ai-workflow-runtime-"));
  tempRoots.push(root);
  await fs.mkdir(path.join(root, "runtime/baseline"), { recursive: true });
  await fs.mkdir(path.join(root, "runtime/devices"), { recursive: true });
  return root;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function execRuntime(root: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  return execFileAsync(process.execPath, [tsxCli, runtimeScript, ...args], {
    cwd: root,
    env: { ...process.env, ...env }
  });
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))
  );
});

describe("runtime asset CLI", () => {
  it("adds SSH devices to the scan registry with a three minute default interval", async () => {
    const root = await makeRuntimeRoot();

    await execRuntime(root, [
      "device:add",
      "--id",
      "father-linux",
      "--label",
      "Father Linux workstation",
      "--ssh",
      "lihan@10.81.2.18:2222",
      "--remote-root",
      "/home/lihan/work/ai_workflow"
    ]);

    const config = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/config.json"), "utf8")
    );
    expect(config).toEqual({
      poll_interval_seconds: 180,
      devices: [
        {
          id: "father-linux",
          label: "Father Linux workstation",
          ssh: {
            user: "lihan",
            host: "10.81.2.18",
            port: 2222,
            target: "lihan@10.81.2.18"
          },
          remote_root: "/home/lihan/work/ai_workflow",
          snapshot_path: "runtime/devices/father-linux.json"
        }
      ]
    });
  });

  it("defaults remote repo roots from the SSH username when registering devices", async () => {
    const root = await makeRuntimeRoot();

    await execRuntime(root, [
      "device:add",
      "--id",
      "father-linux",
      "--label",
      "Father Linux workstation",
      "--ssh",
      "father@10.81.2.18:22"
    ]);

    const config = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/config.json"), "utf8")
    );
    expect(config.devices[0].remote_root).toBe("/home/father/work/ai_workflow");
  });

  it("captures full AGENTS.md content and verifies the CLAUDE.md relationship", async () => {
    const root = await makeRuntimeRoot();
    const home = path.join(root, "home");
    await fs.mkdir(path.join(home, ".codex"), { recursive: true });
    await fs.mkdir(path.join(home, ".claude"), { recursive: true });
    await fs.writeFile(path.join(home, ".codex/AGENTS.md"), "# Canonical agents\n", "utf8");
    await fs.writeFile(path.join(home, ".claude/CLAUDE.md"), "@AGENTS.md\n", "utf8");

    await execRuntime(
      root,
      ["inspect", "--device", "local", "--label", "Local", "--out", "runtime/devices/local.json"],
      { HOME: home }
    );

    const snapshot = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/local.json"), "utf8")
    );
    expect(snapshot.agent_guides.agents_md.content).toBe("# Canonical agents\n");
    expect(snapshot.agent_guides.claude_md.content).toBe("@AGENTS.md\n");
    expect(snapshot.guide_verification).toMatchObject({
      status: "verified",
      mode: "claude-imports-agents"
    });
  });

  it("does not mark SSH snapshots complete when the configured remote root is missing", async () => {
    const root = await makeRuntimeRoot();
    const bin = path.join(root, "bin");
    await fs.mkdir(bin, { recursive: true });
    const fakeSsh = path.join(bin, "ssh");
    await fs.writeFile(
      fakeSsh,
      [
        "#!/usr/bin/env bash",
        "script=\"${@: -1}\"",
        "if [[ \"$script\" == *$'\\n'* && \"$script\" != \\'* ]]; then printf \"remote shell parse error\\n\" >&2; exit 2; fi",
        "if [[ \"$script\" == \"true\" || \"$script\" == \"'true'\" ]]; then exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_ROOT_MISSING__\"* ]]; then printf \"__AWF_ROOT_MISSING__\\n\"; exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_PRESENT__\"* ]]; then printf \"__AWF_MISSING__\\n\"; exit 0; fi",
        "exit 0"
      ].join("\n"),
      "utf8"
    );
    await fs.chmod(fakeSsh, 0o755);

    await execRuntime(
      root,
      [
        "inspect",
        "--device",
        "rocky",
        "--label",
        "Rocky",
        "--ssh",
        "rocky@10.81.2.18:22",
        "--remote-root",
        "/home/rocky/work/ai_workflow",
        "--out",
        "runtime/devices/rocky.json"
      ],
      { PATH: `${bin}:${process.env.PATH}` }
    );

    const snapshot = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/rocky.json"), "utf8")
    );
    expect(snapshot.inventory_status).toBe("guide-only");
    expect(snapshot.inventory_note).toContain("/home/rocky/work/ai_workflow was not found");
    expect(snapshot.assets).toEqual([]);
  });

  it("reads remote user guide files through an expanded HOME path over SSH", async () => {
    const root = await makeRuntimeRoot();
    const bin = path.join(root, "bin");
    await fs.mkdir(bin, { recursive: true });
    const fakeSsh = path.join(bin, "ssh");
    await fs.writeFile(
      fakeSsh,
      [
        "#!/usr/bin/env bash",
        "script=\"${@: -1}\"",
        "if [[ \"$script\" == *\"p='\\$HOME/\"* ]]; then printf \"literal HOME path\\n\" >&2; exit 2; fi",
        "if [[ \"$script\" == \"true\" || \"$script\" == \"'true'\" ]]; then exit 0; fi",
        "if [[ \"$script\" == *\".codex/AGENTS.md\"* ]]; then printf \"__AWF_PRESENT__\\n/home/rocky/.codex/AGENTS.md\\n__AWF_CONTENT__\\n# Remote agents\\n\"; exit 0; fi",
        "if [[ \"$script\" == *\".claude/CLAUDE.md\"* ]]; then printf \"__AWF_PRESENT__\\n/home/rocky/.claude/CLAUDE.md\\n__AWF_CONTENT__\\n@AGENTS.md\\n\"; exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_ROOT_MISSING__\"* ]]; then printf \"__AWF_ROOT_MISSING__\\n\"; exit 0; fi",
        "exit 0"
      ].join("\n"),
      "utf8"
    );
    await fs.chmod(fakeSsh, 0o755);

    await execRuntime(
      root,
      [
        "inspect",
        "--device",
        "rocky",
        "--label",
        "Rocky",
        "--ssh",
        "rocky@10.81.2.18:22",
        "--out",
        "runtime/devices/rocky.json"
      ],
      { PATH: `${bin}:${process.env.PATH}` }
    );

    const snapshot = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/rocky.json"), "utf8")
    );
    expect(snapshot.agent_guides.agents_md.content).toBe("# Remote agents\n");
    expect(snapshot.agent_guides.agents_md.resolved_path).toBe("/home/rocky/.codex/AGENTS.md");
    expect(snapshot.guide_verification).toMatchObject({
      status: "verified",
      mode: "claude-imports-agents"
    });
  });

  it("records SSH username and operating system metadata in device snapshots", async () => {
    const root = await makeRuntimeRoot();
    const bin = path.join(root, "bin");
    await fs.mkdir(bin, { recursive: true });
    const fakeSsh = path.join(bin, "ssh");
    await fs.writeFile(
      fakeSsh,
      [
        "#!/usr/bin/env bash",
        "script=\"${@: -1}\"",
        "if [[ \"$script\" == \"true\" || \"$script\" == \"'true'\" ]]; then exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_OS__\"* ]]; then printf \"__AWF_OS__\\nNAME=Rocky Linux\\nPRETTY_NAME=\\\"Rocky Linux 9.6\\\"\\n__AWF_UNAME__\\nLinux 5.14.0 x86_64\\n\"; exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_ROOT_MISSING__\"* ]]; then printf \"__AWF_ROOT_MISSING__\\n\"; exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_PRESENT__\"* ]]; then printf \"__AWF_MISSING__\\n\"; exit 0; fi",
        "exit 0"
      ].join("\n"),
      "utf8"
    );
    await fs.chmod(fakeSsh, 0o755);

    await execRuntime(
      root,
      [
        "inspect",
        "--device",
        "rocky",
        "--label",
        "Rocky",
        "--ssh",
        "rocky@10.81.2.18:22",
        "--out",
        "runtime/devices/rocky.json"
      ],
      { PATH: `${bin}:${process.env.PATH}` }
    );

    const snapshot = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/rocky.json"), "utf8")
    );
    expect(snapshot.user).toBe("rocky");
    expect(snapshot.os).toEqual({
      name: "Rocky Linux",
      pretty_name: "Rocky Linux 9.6",
      kernel: "Linux 5.14.0",
      arch: "x86_64"
    });
  });

  it("records Claude Code, Codex, and cc-switch runtime tool metadata", async () => {
    const root = await makeRuntimeRoot();
    const bin = path.join(root, "bin");
    await fs.mkdir(bin, { recursive: true });
    const fakeSsh = path.join(bin, "ssh");
    await fs.writeFile(
      fakeSsh,
      [
        "#!/usr/bin/env bash",
        "script=\"${@: -1}\"",
        "if [[ \"$script\" == \"true\" || \"$script\" == \"'true'\" ]]; then exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_TOOLS__\"* ]]; then",
        "  printf '__AWF_TOOLS__\\n'",
        "  printf 'claude|1|/usr/bin/claude|2.1.181 (Claude Code)|~/.claude/settings.json,~/.claude.json|1\\n'",
        "  printf 'codex|1|/home/rocky/.local/bin/codex|codex-cli 0.141.0|~/.codex/config.toml|1\\n'",
        "  printf 'cc_switch|1|/usr/bin/cc-switch||~/.cc-switch/settings.json|0|~/.cc-switch/cc-switch.db|11\\n'",
        "  exit 0",
        "fi",
        "if [[ \"$script\" == *\"__AWF_OS__\"* ]]; then printf \"__AWF_OS__\\nNAME=Rocky Linux\\nPRETTY_NAME=\\\"Rocky Linux 9.6\\\"\\n__AWF_UNAME__\\nLinux 5.14.0 x86_64\\n\"; exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_ROOT_MISSING__\"* ]]; then printf \"__AWF_ROOT_MISSING__\\n\"; exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_PRESENT__\"* ]]; then printf \"__AWF_MISSING__\\n\"; exit 0; fi",
        "exit 0"
      ].join("\n"),
      "utf8"
    );
    await fs.chmod(fakeSsh, 0o755);

    await execRuntime(
      root,
      [
        "inspect",
        "--device",
        "rocky",
        "--label",
        "Rocky",
        "--ssh",
        "rocky@10.81.2.18:22",
        "--out",
        "runtime/devices/rocky.json"
      ],
      { PATH: `${bin}:${process.env.PATH}` }
    );

    const snapshot = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/rocky.json"), "utf8")
    );
    expect(snapshot.tools.claude).toMatchObject({
      installed: true,
      version: "2.1.181",
      binary_path: "/usr/bin/claude",
      config_paths: ["~/.claude/settings.json", "~/.claude.json"],
      managed_by_cc_switch: true
    });
    expect(snapshot.tools.codex).toMatchObject({
      installed: true,
      version: "codex-cli 0.141.0",
      binary_path: "/home/rocky/.local/bin/codex",
      config_paths: ["~/.codex/config.toml"],
      managed_by_cc_switch: true
    });
    expect(snapshot.tools.cc_switch).toMatchObject({
      installed: true,
      binary_path: "/usr/bin/cc-switch",
      config_paths: ["~/.cc-switch/settings.json"],
      data_paths: ["~/.cc-switch/cc-switch.db"],
      db_user_version: 11
    });
  });

  it("detects workflow projects from existing markers over SSH", async () => {
    const root = await makeRuntimeRoot();
    const bin = path.join(root, "bin");
    await fs.mkdir(bin, { recursive: true });
    const fakeSsh = path.join(bin, "ssh");
    await fs.writeFile(
      fakeSsh,
      [
        "#!/usr/bin/env bash",
        "script=\"${@: -1}\"",
        "if [[ \"$script\" == \"true\" || \"$script\" == \"'true'\" ]]; then exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_PROJECTS__\"* ]]; then",
        "  printf '__AWF_PROJECTS__\\n'",
        "  printf '/home/rocky/work/ai_workflow|ai_workflow|clean|main|git@github.com:lihan3238/ai_workflow.git|AGENTS.md,ai/cards,ai/skills,runtime/adapters\\n'",
        "  printf '/home/rocky/work/research|research|dirty|exp|git@example.com:team/research.git|AGENTS.md,.agents\\n'",
        "  exit 0",
        "fi",
        "if [[ \"$script\" == *\"__AWF_ROOT_MISSING__\"* ]]; then",
        "  printf 'ai/cards/model.md\\nai/skills/workflow-home/SKILL.md\\n'",
        "  exit 0",
        "fi",
        "if [[ \"$script\" == *\"cd '/home/rocky/work/ai_workflow' && cat 'ai/cards/model.md'\"* ]]; then printf 'model card\\n'; exit 0; fi",
        "if [[ \"$script\" == *\"cd '/home/rocky/work/ai_workflow' && cat 'ai/skills/workflow-home/SKILL.md'\"* ]]; then printf 'skill\\n'; exit 0; fi",
        "if [[ \"$script\" == *\"__AWF_PRESENT__\"* ]]; then printf \"__AWF_MISSING__\\n\"; exit 0; fi",
        "exit 0"
      ].join("\n"),
      "utf8"
    );
    await fs.chmod(fakeSsh, 0o755);

    await execRuntime(
      root,
      [
        "inspect",
        "--device",
        "rocky",
        "--label",
        "Rocky",
        "--ssh",
        "rocky@10.81.2.18:22",
        "--remote-root",
        "/home/rocky/work/ai_workflow",
        "--out",
        "runtime/devices/rocky.json"
      ],
      { PATH: `${bin}:${process.env.PATH}` }
    );

    const snapshot = JSON.parse(
      await fs.readFile(path.join(root, "runtime/devices/rocky.json"), "utf8")
    );
    expect(snapshot.inventory_status).toBe("complete");
    expect(snapshot.projects).toEqual([
      {
        name: "ai_workflow",
        path: "/home/rocky/work/ai_workflow",
        status: "clean",
        branch: "main",
        remote_url: "git@github.com:lihan3238/ai_workflow.git",
        markers: ["AGENTS.md", "ai/cards", "ai/skills", "runtime/adapters"]
      },
      {
        name: "research",
        path: "/home/rocky/work/research",
        status: "dirty",
        branch: "exp",
        remote_url: "git@example.com:team/research.git",
        markers: ["AGENTS.md", ".agents"]
      }
    ]);
  });

  it("warns on dry-run and refuses apply sync for network-only snapshots", async () => {
    const root = await makeRuntimeRoot();
    const targetRoot = path.join(root, "target-device");
    const devicePath = path.join(root, "runtime/devices/father-linux.json");

    await writeJson(path.join(root, "runtime/baseline/assets.json"), {
      generated_at: "2026-06-19T00:00:00.000Z",
      source: "github",
      assets: [
        {
          path: "ai/cards/model.md",
          sha256: "baseline",
          content: "model baseline\n"
        }
      ]
    });
    await writeJson(devicePath, {
      id: "father-linux",
      label: "Father Linux workstation",
      ip: "10.81.2.18",
      online: true,
      last_seen: "2026-06-19T00:01:00.000Z",
      inventory_status: "network-only",
      agent_guides: {
        agents_md: { path: "~/.codex/AGENTS.md", status: "unknown" },
        claude_md: { path: "~/.claude/CLAUDE.md", status: "unknown" }
      },
      skills: [{ tool: "codex", name: "workflow-home", status: "unknown" }],
      projects: [],
      assets: []
    });

    const dryRun = await execRuntime(root, [
      "sync",
      "--device",
      "runtime/devices/father-linux.json",
      "--target-root",
      targetRoot
    ]);
    expect(dryRun.stdout).toContain("network-only snapshot");

    await expect(
      execRuntime(root, [
        "sync",
        "--device",
        "runtime/devices/father-linux.json",
        "--target-root",
        targetRoot,
        "--apply"
      ])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("Refusing to apply sync from a network-only snapshot")
    });
    await expect(exists(path.join(targetRoot, "ai/cards/model.md"))).resolves.toBe(false);
  });
});
