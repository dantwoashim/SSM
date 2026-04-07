import { z } from "zod";
import {
  ActionValidationError,
  makeValidationError,
  safeRedirectTarget,
  stringValue,
} from "./common";

export function parseLoginForm(formData: FormData) {
  const schema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(10).max(128),
    redirectTo: z.string().max(2048).optional().default(""),
  });
  const result = schema.safeParse({
    email: stringValue(formData, "email").toLowerCase(),
    password: formData.get("password")?.toString() || "",
    redirectTo: stringValue(formData, "redirectTo"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return {
    email: result.data.email,
    password: result.data.password,
    redirectTo: safeRedirectTarget(result.data.redirectTo),
  };
}

export function parseAcceptInviteForm(formData: FormData) {
  const schema = z.object({
    token: z.string().min(20).max(128),
    password: z
      .string()
      .min(10)
      .max(128)
      .refine((value) => /[A-Z]/.test(value), "Password must include an uppercase letter.")
      .refine((value) => /[a-z]/.test(value), "Password must include a lowercase letter.")
      .refine((value) => /[0-9]/.test(value), "Password must include a number.")
      .optional(),
    mode: z.enum(["create-account", "claim-access"]).default("create-account"),
  });

  const result = schema.safeParse({
    token: stringValue(formData, "token"),
    password: stringValue(formData, "password") || undefined,
    mode: stringValue(formData, "mode") || "create-account",
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  if (result.data.mode === "create-account" && !result.data.password) {
    throw new ActionValidationError("Password is required.");
  }

  return result.data;
}
