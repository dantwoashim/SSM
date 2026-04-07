import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const stateRoot = path.join(repositoryRoot, ".runtime", "e2e-state");
const nextBuildDir = path.join(repositoryRoot, "apps", "web", ".next");

const sharedEnv = {
  ...process.env,
  PORT: "3001",
  HOSTNAME: "localhost",
  APP_URL: "http://localhost:3001",
  SESSION_SECRET: "e2e-session-secret",
  FOUNDER_EMAIL: "owner@example.com",
  FOUNDER_PASSWORD: "StartHere123!",
  FOUNDER_NAME: "Founder",
  ALLOW_LOCAL_PROD: "1",
  ASSURANCE_STATE_DIR: stateRoot,
};

if (sharedEnv.NODE_OPTIONS?.includes("--localstorage-file")) {
  sharedEnv.NODE_OPTIONS = sharedEnv.NODE_OPTIONS
    .split(/\s+/)
    .filter((token) => token && !token.startsWith("--localstorage-file"))
    .join(" ");

  if (!sharedEnv.NODE_OPTIONS) {
    delete sharedEnv.NODE_OPTIONS;
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
          cwd: repositoryRoot,
          env: sharedEnv,
          stdio: "inherit",
        })
      : spawn(command, args, {
          cwd: repositoryRoot,
          env: sharedEnv,
          stdio: "inherit",
        });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}.`));
    });
  });
}

await rm(stateRoot, { force: true, recursive: true }).catch(() => undefined);
await rm(nextBuildDir, { force: true, recursive: true }).catch(() => undefined);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
await run(npmCommand, ["run", "build", "--workspace", "@assurance/web"]);
await run(npmCommand, ["run", "seed", "--workspace", "@assurance/web"]);
await new Promise(() => {
  const child = process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", npmCommand, "run", "start", "--workspace", "@assurance/web"], {
        cwd: repositoryRoot,
        env: sharedEnv,
        stdio: "inherit",
      })
    : spawn(npmCommand, ["run", "start", "--workspace", "@assurance/web"], {
        cwd: repositoryRoot,
        env: sharedEnv,
        stdio: "inherit",
      });

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
});
