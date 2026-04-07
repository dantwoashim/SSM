import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repositoryRoot = process.cwd();
const forbiddenPrefixes = [".next/", "node_modules/", ".pglite/", ".runtime/", "storage/"];
const forbiddenBasenames = new Set([".env.local"]);
const archiveDir = await mkdtemp(path.join(os.tmpdir(), "assurance-release-"));
const archivePath = path.join(archiveDir, "release.tar");
const extractDir = path.join(archiveDir, "extract");

function isForbidden(file) {
  const normalized = file.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const baseName = normalized.split("/").pop() || normalized;

  if (forbiddenBasenames.has(baseName)) {
    return true;
  }

  return forbiddenPrefixes.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

function listArchiveEntries() {
  const output = execFileSync("tar", ["-tf", archivePath], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^\.\//, ""));
}

try {
  execFileSync("git", ["archive", "--format=tar", `--output=${archivePath}`, "HEAD"], {
    cwd: repositoryRoot,
    stdio: "ignore",
  });

  await mkdir(extractDir, { recursive: true });
  execFileSync("tar", ["-xf", archivePath, "-C", extractDir], {
    cwd: repositoryRoot,
    stdio: "ignore",
  });

  const entries = listArchiveEntries();
  const violations = entries.filter(isForbidden);

  if (violations.length > 0) {
    console.error("Release bundle contains forbidden files:");
    for (const violation of violations) {
      console.error(` - ${violation}`);
    }
    process.exit(1);
  }

  const gitignorePath = path.join(repositoryRoot, ".gitignore");
  const gitignore = await readFile(gitignorePath, "utf8");
  const missingGitignoreRules = [".runtime/", ".pglite", ".next", "node_modules", "storage", ".env.local"].filter(
    (rule) => !gitignore.includes(rule),
  );

  if (missingGitignoreRules.length > 0) {
    console.error("The repository is missing expected ignore rules:");
    for (const rule of missingGitignoreRules) {
      console.error(` - ${rule}`);
    }
    process.exit(1);
  }

  console.log("Release hygiene check passed.");
} finally {
  await rm(archiveDir, { recursive: true, force: true }).catch(() => undefined);
}
