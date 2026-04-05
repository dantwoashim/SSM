"use server";

import { redirect } from "next/navigation";
import { issueSessionCookie, clearSessionCookie } from "@/lib/session";
import { enforceRateLimit, authenticateUser, ensureFounderUser } from "@/lib/data";
import { env } from "@/lib/env";
import { assertSameOriginRequest, getRequestIp } from "@/lib/request-context";
import { parseLoginForm, validationMessage } from "@/lib/validation";

export async function loginAction(formData: FormData) {
  try {
    await assertSameOriginRequest();
    const ip = await getRequestIp();
    await enforceRateLimit({
      route: "login",
      bucketKey: `login:${ip}`,
      limit: 15,
      windowMs: 15 * 60 * 1000,
    });
    const parsed = parseLoginForm(formData);
    let user = await authenticateUser(parsed.email, parsed.password);

    if (!user && parsed.email === env.founderEmail.toLowerCase()) {
      await ensureFounderUser();
      user = await authenticateUser(parsed.email, parsed.password);
    }

    if (!user) {
      return {
        ok: false as const,
        error: "Invalid credentials.",
        email: parsed.email,
      };
    }

    await issueSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      sessionVersion: user.sessionVersion,
    });

    return {
      ok: true as const,
      error: "",
      email: user.email,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: validationMessage(error),
      email: formData.get("email")?.toString() || "",
    };
  }
}

export async function logoutAction() {
  await assertSameOriginRequest();
  await clearSessionCookie();
}

export async function loginAndRedirectAction(formData: FormData) {
  const result = await loginAction(formData);

  if (result.ok) {
    redirect((await parseLoginForm(formData)).redirectTo || "/app");
  }

  const redirectTo = (await parseLoginForm(formData)).redirectTo;
  const params = new URLSearchParams({
    error: result.error || "Unable to sign in.",
  });

  if (redirectTo) {
    params.set("redirectTo", redirectTo);
  }

  redirect(`/login?${params.toString()}`);
}
