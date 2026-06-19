import { defaultRemoteRootForSshTarget, parseSshTarget } from "./ssh";

export interface RuntimeDeviceFormValues {
  sshTarget: string;
  label: string;
  remoteRoot: string;
}

export interface RuntimeDevicePayload {
  id: string;
  label: string;
  ssh: string;
  remote_root?: string;
}

export type RuntimeDeviceFormResult =
  | { ok: true; payload: RuntimeDevicePayload }
  | { ok: false; message: string };

export function slugDeviceId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "device";
}

export function shellDoubleQuote(value: string): string {
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

export function defaultRemoteRootForTargetValue(value: string): string | undefined {
  try {
    return defaultRemoteRootForSshTarget(parseSshTarget(value.trim()));
  } catch {
    return undefined;
  }
}

export function buildRuntimeDevicePayload(
  values: RuntimeDeviceFormValues
): RuntimeDeviceFormResult {
  let ssh;
  try {
    ssh = parseSshTarget(values.sshTarget.trim());
  } catch {
    return { ok: false, message: "SSH target 格式必须是 user@ip:port。" };
  }

  const label = values.label.trim() || "New device";
  const remoteRoot = values.remoteRoot.trim() || defaultRemoteRootForSshTarget(ssh);

  return {
    ok: true,
    payload: {
      id: slugDeviceId(label),
      label,
      ssh: `${ssh.target}:${ssh.port}`,
      ...(remoteRoot ? { remote_root: remoteRoot } : {})
    }
  };
}

export function fallbackDeviceAddCommand(payload: RuntimeDevicePayload): string {
  const remoteRootArgs = payload.remote_root
    ? ` --remote-root ${shellDoubleQuote(payload.remote_root)}`
    : "";
  return `npm run runtime:device:add -- --id ${payload.id} --label ${shellDoubleQuote(payload.label)} --ssh ${payload.ssh}${remoteRootArgs}`;
}
