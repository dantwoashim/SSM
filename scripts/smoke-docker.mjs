import { spawn } from "node:child_process";
import { waitForHttp } from "./wait-for-http.mjs";

const repositoryRoot = process.cwd();
const imageName = "assurance-smoke";
const containerName = "assurance-smoke";
const hostPort = "3012";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
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

async function cleanupContainer() {
  try {
    await run("docker", ["rm", "-f", containerName]);
  } catch {
    // Ignore cleanup failures when the container was never created.
  }
}

await cleanupContainer();
await run("docker", ["build", "-t", imageName, "."]);
await run("docker", [
  "run",
  "-d",
  "--name",
  containerName,
  "-p",
  `${hostPort}:3000`,
  "-e",
  `APP_URL=http://127.0.0.1:${hostPort}`,
  "-e",
  "SESSION_SECRET=smoke-session-secret",
  "-e",
  "FOUNDER_EMAIL=owner@example.com",
  "-e",
  "FOUNDER_PASSWORD=StartHere123!",
  "-e",
  "FOUNDER_NAME=Founder",
  "-e",
  "ALLOW_LOCAL_PROD=1",
  imageName,
]);

try {
  await waitForHttp(`http://127.0.0.1:${hostPort}/api/healthz`, 120_000);
  await waitForHttp(`http://127.0.0.1:${hostPort}/api/readyz`, 120_000);
  await waitForHttp(`http://127.0.0.1:${hostPort}/login`, 120_000);
  console.log("docker smoke passed");
} finally {
  await cleanupContainer();
}
