import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "identity-go-live-assurance-web",
  });
}
