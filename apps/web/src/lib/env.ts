const appUrl = process.env.APP_URL || "http://localhost:3000";

export const env = {
  appUrl,
  sessionSecret: process.env.SESSION_SECRET || "change-me-before-production",
  jobExecutorToken: process.env.JOB_EXECUTOR_TOKEN || "",
  founderEmail: process.env.FOUNDER_EMAIL || "founder@example.com",
  founderPassword: process.env.FOUNDER_PASSWORD || "ChangeMe123!",
  founderName: process.env.FOUNDER_NAME || "Founder",
  allowLocalProd: process.env.ALLOW_LOCAL_PROD || "",
  notificationEmail: process.env.NOTIFICATION_EMAIL || "",
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  resendApiKey: process.env.RESEND_API_KEY || "",
  mailFrom: process.env.MAIL_FROM || "",
  mailReplyTo: process.env.MAIL_REPLY_TO || "",
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || "auto",
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
};

export function isProductionLike() {
  return process.env.NODE_ENV === "production";
}

export function isLocalProdMode() {
  return env.allowLocalProd === "1";
}

function shouldValidateProductionRuntime() {
  return isProductionLike();
}

export function assertAppUrlConfigured() {
  if (!shouldValidateProductionRuntime()) {
    return;
  }

  if (!env.appUrl || env.appUrl.includes("localhost")) {
    throw new Error("APP_URL must be a real public URL in production.");
  }
}

export function assertDatabaseConfigured() {
  if (!shouldValidateProductionRuntime()) {
    return;
  }

  if (isLocalProdMode()) {
    return;
  }

  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL must be set in production.");
  }
}

export function assertSessionConfigured() {
  if (!shouldValidateProductionRuntime()) {
    return;
  }

  if (env.sessionSecret === "change-me-before-production") {
    throw new Error("SESSION_SECRET must be changed before production.");
  }
}

export function assertJobExecutorConfigured() {
  if (!shouldValidateProductionRuntime()) {
    return;
  }

  if (env.redisUrl && !env.jobExecutorToken) {
    throw new Error("JOB_EXECUTOR_TOKEN must be set when REDIS_URL is enabled in production.");
  }
}

export function assertFounderBootstrapConfigured() {
  if (!shouldValidateProductionRuntime()) {
    return;
  }

  if (env.founderEmail === "founder@example.com") {
    throw new Error("FOUNDER_EMAIL must be changed before production.");
  }

  if (env.founderPassword === "ChangeMe123!") {
    throw new Error("FOUNDER_PASSWORD must be changed before production.");
  }
}
