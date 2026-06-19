import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const mode = argValue("--mode", "operator");
const outDir = argValue("--outDir", "dist-operator");

if (mode !== "operator") {
  console.error(`--mode must be operator, got '${mode}'`);
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["astro", "build", "--outDir", outDir],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PUBLIC_SITE_MODE: mode
    },
    stdio: "inherit"
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

let gitCommit = "unknown";
const gitResult = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
  cwd: process.cwd(),
  encoding: "utf8"
});
if (gitResult.status === 0) {
  gitCommit = gitResult.stdout.trim();
}

await fs.writeFile(
  path.join(outDir, "site-manifest.json"),
  `${JSON.stringify(
    {
      mode,
      generated_at: new Date().toISOString(),
      git_commit: gitCommit,
      output_dir: outDir
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Built ${mode} site at ${outDir}`);
