import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isLocalProdMode, isProductionLike, env } from "../env";
import { ArtifactStorageError } from "@assurance/service";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(moduleDir, "../../../../../");
const stateRoot = env.stateRoot ? path.resolve(env.stateRoot) : repositoryRoot;
const localRoot = path.join(stateRoot, "storage");

function normalizeStorageKey(storageKey: string) {
  const rawSegments = storageKey.replace(/\\/g, "/").split("/");

  if (rawSegments.some((segment) => segment === "..")) {
    throw new ArtifactStorageError("Artifact storage key is invalid.");
  }

  const normalized = storageKey
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

  if (!normalized) {
    throw new ArtifactStorageError("Artifact storage key is invalid.");
  }

  return normalized;
}

function resolveLocalPath(storageKey: string) {
  const normalizedKey = normalizeStorageKey(storageKey);
  const resolvedPath = path.resolve(localRoot, normalizedKey);
  const expectedRoot = `${path.resolve(localRoot)}${path.sep}`;

  if (resolvedPath !== path.resolve(localRoot) && !resolvedPath.startsWith(expectedRoot)) {
    throw new ArtifactStorageError("Artifact storage key escapes the configured storage root.");
  }

  return resolvedPath;
}

function hasS3Config() {
  return !!(
    env.s3.endpoint &&
    env.s3.bucket &&
    env.s3.accessKeyId &&
    env.s3.secretAccessKey
  );
}

function getS3Client() {
  return new S3Client({
    endpoint: env.s3.endpoint,
    region: env.s3.region,
    credentials: {
      accessKeyId: env.s3.accessKeyId || "",
      secretAccessKey: env.s3.secretAccessKey || "",
    },
  });
}

export async function checkArtifactStorageReadiness() {
  if (hasS3Config()) {
    const client = getS3Client();
    await client.send(
      new HeadBucketCommand({
        Bucket: env.s3.bucket,
      }),
    );
    return true;
  }

  if (isProductionLike() && !isLocalProdMode()) {
    return false;
  }

  await mkdir(localRoot, { recursive: true });
  const probeKey = resolveLocalPath(`.readyz/${crypto.randomUUID()}.probe`);
  const probeBytes = new Uint8Array([111, 107]);
  await mkdir(path.dirname(probeKey), { recursive: true });
  await writeFile(probeKey, probeBytes);
  const probeRead = await readFile(probeKey);
  await rm(probeKey, { force: true });

  if (probeRead.toString("utf8") !== "ok") {
    throw new ArtifactStorageError("Local artifact storage is writable but failed readback verification.");
  }

  return true;
}

export async function storeArtifact(
  storageKey: string,
  fileName: string,
  bytes: Uint8Array,
  contentType: string,
) {
  if (isProductionLike() && !isLocalProdMode() && !hasS3Config()) {
    throw new ArtifactStorageError("S3-compatible artifact storage must be configured in production.");
  }

  if (hasS3Config()) {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: storageKey,
        Body: bytes,
        ContentType: contentType,
        Metadata: {
          originalname: fileName,
        },
      }),
    );
    return;
  }

  const outputPath = resolveLocalPath(storageKey);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
}

export async function getArtifactDownload(storageKey: string, contentType: string) {
  if (isProductionLike() && !isLocalProdMode() && !hasS3Config()) {
    throw new ArtifactStorageError("S3-compatible artifact storage must be configured in production.");
  }

  if (hasS3Config()) {
    const client = getS3Client();
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: env.s3.bucket,
        Key: storageKey,
      }),
      { expiresIn: 300 },
    );

    return {
      type: "redirect" as const,
      url,
    };
  }

  const outputPath = resolveLocalPath(storageKey);
  const body = await readFile(outputPath);

  return {
    type: "file" as const,
    body,
    contentType,
  };
}
