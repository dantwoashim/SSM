"use server";

import { issueSessionCookie, clearSessionCookie } from "@/lib/session";
import { authenticateUser, ensureFounderUser } from "@/lib/data";

export async function loginAction(formData: FormData) {
  await ensureFounderUser();
  const email = formData.get("email")?.toString() || "";
  const password = formData.get("password")?.toString() || "";
  const user = await authenticateUser(email, password);

  if (!user) {
    throw new Error("Invalid credentials.");
  }

  await issueSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
}

export async function logoutAction() {
  await clearSessionCookie();
}
