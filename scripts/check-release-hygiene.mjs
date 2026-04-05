import { execFileSync } from "node:child_process";

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const forbiddenPrefixes = [
  ".next/",
  "node_modules/",
  ".pglite/",
  ".runtime/",
  "storage/",
];

const forbiddenExact = [".env.local"];

const violations = trackedFiles.filter((file) => {
  if (forbiddenExact.includes(file)) {
    return true;
  }

  return forbiddenPrefixes.some((prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix));
});

if (violations.length > 0) {
  console.error("Tracked release-artifact files are not allowed:");
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log("Release hygiene check passed.");
