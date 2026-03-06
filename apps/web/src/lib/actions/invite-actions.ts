"use server";

import { issueSessionCookie } from "@/lib/session";
import { acceptInvite } from "@/lib/data";

export async function acceptInviteAction(formData: FormData) {
  const token = formData.get("token")?.toString() || "";
  const password = formData.get("password")?.toString() || "";

  if (password.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must include upper, lower, and numeric characters.");
  }

  const accepted = await acceptInvite({
    token,
    password,
  });

  await issueSessionCookie({
    userId: accepted.user.id,
    email: accepted.user.email,
    role: accepted.user.role,
    name: accepted.user.name,
  });

  return accepted.engagementId ? `/app/engagements/${accepted.engagementId}` : "/app";
}
