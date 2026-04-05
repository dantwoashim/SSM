import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@assurance/core"],
  serverExternalPackages: [
    "@electric-sql/pglite",
    "postgres",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
};

export default nextConfig;
