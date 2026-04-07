import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { waitForHttp } from "./wait-for-http.mjs";

const repositoryRoot = process.cwd();
const stateRoot = `${repositoryRoot}/.runtime/smoke-state`;
const baseEnv = {
  ...process.env,
  PORT: "3011",
  HOSTNAME: "127.0.0.1",
  APP_URL: "http://127.0.0.1:3011",
  SESSION_SECRET: "smoke-session-secret",
  FOUNDER_EMAIL: "owner@example.com",
  FOUNDER_PASSWORD: "StartHere123!",
  FOUNDER_NAME: "Founder",
  ALLOW_LOCAL_PROD: "1",
  ASSURANCE_STATE_DIR: stateRoot,
};

if (baseEnv.NODE_OPTIONS?.includes("--localstorage-file")) {
  baseEnv.NODE_OPTIONS = baseEnv.NODE_OPTIONS
    .split(/\s+/)
    .filter((token) => token && !token.startsWith("--localstorage-file"))
    .join(" ");

  if (!baseEnv.NODE_OPTIONS) {
    delete baseEnv.NODE_OPTIONS;
  }
}

function run(command, args, env = baseEnv) {
  return new Promise((resolve, reject) => {
    const child = process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
          cwd: repositoryRoot,
          env,
          stdio: "inherit",
        })
      : spawn(command, args, {
          cwd: repositoryRoot,
          env,
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

await rm(stateRoot, { recursive: true, force: true }).catch(() => undefined);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
await run(npmCommand, ["run", "seed", "--workspace", "@assurance/web"]);

const child = process.platform === "win32"
  ? spawn("cmd.exe", ["/d", "/s", "/c", npmCommand, "run", "start", "--workspace", "@assurance/web"], {
      cwd: repositoryRoot,
      env: baseEnv,
      stdio: "inherit",
    })
  : spawn(npmCommand, ["run", "start", "--workspace", "@assurance/web"], {
      cwd: repositoryRoot,
      env: baseEnv,
      stdio: "inherit",
    });

try {
  await waitForHttp("http://127.0.0.1:3011/api/healthz");
  await waitForHttp("http://127.0.0.1:3011/api/readyz");
  await waitForHttp("http://127.0.0.1:3011/login");
  console.log("production start smoke passed");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    child.once("exit", () => resolve(undefined));
    setTimeout(() => resolve(undefined), 5000);
  });
  await rm(stateRoot, { recursive: true, force: true }).catch(() => undefined);
}
