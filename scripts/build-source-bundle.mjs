import { execFileSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repositoryRoot = process.cwd();
const outputDir = path.join(repositoryRoot, "output");
const shortSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim();
const archiveName = `identity-go-live-assurance-${shortSha}.tar`;
const archivePath = path.join(outputDir, archiveName);

await mkdir(outputDir, { recursive: true });

execFileSync("git", ["archive", "--format=tar", `--output=${archivePath}`, "HEAD"], {
  cwd: repositoryRoot,
  stdio: "inherit",
});

const tempProbeDir = path.join(os.tmpdir(), `assurance-bundle-probe-${Date.now()}`);
await mkdir(tempProbeDir, { recursive: true });
execFileSync("tar", ["-xf", archivePath, "-C", tempProbeDir], {
  cwd: repositoryRoot,
  stdio: "ignore",
});
await rm(tempProbeDir, { recursive: true, force: true }).catch(() => undefined);

console.log(`Created clean source bundle at ${archivePath}`);
