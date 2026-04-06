import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@assurance/core", "@assurance/service"],
  allowedDevOrigins: ["http://localhost:3001", "http://127.0.0.1:3001"],
  serverExternalPackages: [
    "@electric-sql/pglite",
    "postgres",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
};

export default nextConfig;
