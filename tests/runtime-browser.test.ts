import { describe, expect, it } from "vitest";
import {
  buildRuntimeDevicePayload,
  fallbackDeviceAddCommand,
  shellDoubleQuote,
  slugDeviceId
} from "../src/lib/runtime/browser";

describe("runtime browser helpers", () => {
  it("derives a safe device payload from operator form values", () => {
    const result = buildRuntimeDevicePayload({
      sshTarget: "rocky@10.81.2.18:22",
      label: "Father Linux workstation",
      remoteRoot: ""
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        id: "father-linux-workstation",
        label: "Father Linux workstation",
        ssh: "rocky@10.81.2.18:22",
        remote_root: "/home/rocky/work/ai_workflow"
      }
    });
  });

  it("reports invalid SSH targets before API calls", () => {
    expect(buildRuntimeDevicePayload({
      sshTarget: "10.81.2.18",
      label: "Bad",
      remoteRoot: ""
    })).toEqual({
      ok: false,
      message: "SSH target 格式必须是 user@ip:port。"
    });
  });

  it("builds static-site fallback commands safely", () => {
    const payload = {
      id: "father-linux",
      label: "Father Linux workstation",
      ssh: "rocky@10.81.2.18:22",
      remote_root: "/home/rocky/work/ai_workflow"
    };

    expect(slugDeviceId("Father Linux workstation")).toBe("father-linux-workstation");
    expect(shellDoubleQuote('A "quoted" label')).toBe('"A \\"quoted\\" label"');
    expect(fallbackDeviceAddCommand(payload)).toContain(
      "npm run runtime:device:add -- --id father-linux --label"
    );
    expect(fallbackDeviceAddCommand(payload)).toContain("--remote-root");
  });
});
