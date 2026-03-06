import type { ClaimedFeature } from "@assurance/core";

export function now() {
  return new Date().toISOString();
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function parseFeatureString(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as ClaimedFeature[];
}
