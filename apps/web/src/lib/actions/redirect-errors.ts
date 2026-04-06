import { isRedirectError } from "next/dist/client/components/redirect-error";

export function rethrowIfRedirectError(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}
