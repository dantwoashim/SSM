export type LogLevel = "info" | "warn" | "error";

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return error;
}

export function logEvent(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}

export function logError(event: string, error: unknown, data: Record<string, unknown> = {}) {
  logEvent("error", event, {
    ...data,
    error: normalizeError(error),
  });
}
