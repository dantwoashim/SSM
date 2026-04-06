import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const repositoryRoot = process.cwd();
const stateRoot = path.join(os.tmpdir(), `assurance-storage-smoke-${randomUUID()}`);

process.env.NODE_ENV = "production";
process.env.ALLOW_LOCAL_PROD = "1";
process.env.ASSURANCE_STATE_DIR = stateRoot;
process.env.APP_URL = "https://app.example.com";
process.env.SESSION_SECRET = "smoke-session-secret";
process.env.FOUNDER_EMAIL = "owner@example.com";
process.env.FOUNDER_PASSWORD = "StartHere123!";
process.env.FOUNDER_NAME = "Founder";

try {
  const provider = await import(
    pathToFileURL(path.join(repositoryRoot, "apps/web/src/lib/storage/provider.ts")).href
  );
  const body = new TextEncoder().encode("storage smoke");
  await provider.storeArtifact(
    "smoke/evidence.txt",
    "evidence.txt",
    body,
    "text/plain",
  );
  const download = await provider.getArtifactDownload("smoke/evidence.txt", "text/plain");

  if (download.type !== "file") {
    throw new Error("Storage smoke expected a local file download result.");
  }

  const output = Buffer.from(download.body).toString("utf8");

  if (output !== "storage smoke") {
    throw new Error("Storage smoke readback did not match the written artifact.");
  }

  const ready = await provider.checkArtifactStorageReadiness();

  if (!ready) {
    throw new Error("Storage smoke readiness check failed.");
  }

  console.log("storage smoke passed");
} finally {
  await rm(stateRoot, { recursive: true, force: true }).catch(() => undefined);
}
