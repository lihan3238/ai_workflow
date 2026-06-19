export interface SshTarget {
  user: string;
  host: string;
  port: number;
  target: string;
}

export function parseSshTarget(value: string): SshTarget {
  const match = /^([^@\s]+)@([^:\s]+)(?::(\d+))?$/.exec(value.trim());
  if (!match) {
    throw new Error("SSH target must look like user@ip:port");
  }
  const port = match[3] ? Number(match[3]) : 22;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SSH target port must be between 1 and 65535");
  }
  return {
    user: match[1],
    host: match[2],
    port,
    target: `${match[1]}@${match[2]}`
  };
}

export function defaultRemoteRootForSshTarget(ssh: Pick<SshTarget, "user">): string {
  return ssh.user === "root" ? "/root/work/ai_workflow" : `/home/${ssh.user}/work/ai_workflow`;
}
