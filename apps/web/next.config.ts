import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@assurance/core", "@assurance/service"],
  allowedDevOrigins: ["http://localhost:3001", "http://127.0.0.1:3001"],
  outputFileTracingRoot: path.resolve(configDir, "../.."),
  serverExternalPackages: [
    "@electric-sql/pglite",
    "postgres",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
};

export default nextConfig;
