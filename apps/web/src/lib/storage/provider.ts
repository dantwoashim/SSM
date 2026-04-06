import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isLocalProdMode, isProductionLike, env } from "../env";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(moduleDir, "../../../../../");
const stateRoot = env.stateRoot ? path.resolve(env.stateRoot) : repositoryRoot;
const localRoot = path.join(stateRoot, "storage");

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
  return true;
}

export async function storeArtifact(
  storageKey: string,
  fileName: string,
  bytes: Uint8Array,
  contentType: string,
) {
  if (isProductionLike() && !isLocalProdMode() && !hasS3Config()) {
    throw new Error("S3-compatible artifact storage must be configured in production.");
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

  const outputPath = path.join(localRoot, storageKey);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
}

export async function getArtifactDownload(storageKey: string, contentType: string) {
  if (isProductionLike() && !isLocalProdMode() && !hasS3Config()) {
    throw new Error("S3-compatible artifact storage must be configured in production.");
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

  const outputPath = path.join(localRoot, storageKey);
  const body = await readFile(outputPath);

  return {
    type: "file" as const,
    body,
    contentType,
  };
}
