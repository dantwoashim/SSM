import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repositoryRoot = process.cwd();
const outputDir = path.join(repositoryRoot, "output");
const shortSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim();
const archivePath = path.join(outputDir, `identity-go-live-assurance-${shortSha}.tar`);
const tempDir = await mkdtemp(path.join(os.tmpdir(), "assurance-source-smoke-"));

function run(command, args, cwd) {
  const env = {
    ...process.env,
    CI: "1",
  };

  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", command, ...args], {
      cwd,
      stdio: "inherit",
      env,
    });
    return;
  }

  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env,
  });
}

try {
  run("node", ["scripts/build-source-bundle.mjs"], repositoryRoot);
  run("tar", ["-xf", archivePath, "-C", tempDir], repositoryRoot);
  run("npm", ["ci"], tempDir);
  run("npm", ["run", "typecheck"], tempDir);
  run("npm", ["run", "build:app"], tempDir);
  console.log(`Source bundle smoke passed from ${archivePath}`);
} finally {
  await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
}
