import { z } from "zod";

const idempotencyInstall = z
  .string()
  .refine((v) => v.startsWith("install:"), { message: "idempotency_key must start with install:" });

const idempotencyUninstall = z
  .string()
  .refine((v) => v.startsWith("uninstall:"), { message: "idempotency_key must start with uninstall:" });

export const InstallCallbackSchema = z.object({
  installed_app_id: z.string().min(1),
  app_id: z.string().min(1),
  instance_id: z.string().min(1),
  api_key: z.string().min(1),
  api_key_prefix: z.string().min(1),
  granted_permissions: z.array(z.string()),
  idempotency_key: idempotencyInstall,
});

export const UninstallCallbackSchema = z.object({
  installed_app_id: z.string().min(1),
  app_id: z.string().min(1),
  instance_id: z.string().min(1),
  uninstalled_at: z.string().optional(),
  idempotency_key: idempotencyUninstall,
});

export const PortalLaunchSchema = z.object({
  installed_app_id: z.string().min(1),
  app_id: z.string().min(1),
  instance_id: z.string().min(1),
});

export type InstallCallback = z.infer<typeof InstallCallbackSchema>;
export type UninstallCallback = z.infer<typeof UninstallCallbackSchema>;
export type PortalLaunch = z.infer<typeof PortalLaunchSchema>;

export function parseCallbackBody(body: unknown):
  | { kind: "install"; data: InstallCallback }
  | { kind: "uninstall"; data: UninstallCallback }
  | { kind: "unknown" } {
  if (typeof body !== "object" || body === null) {
    return { kind: "unknown" };
  }
  const record = body as Record<string, unknown>;
  const idem = record.idempotency_key;
  if (typeof idem !== "string") {
    return { kind: "unknown" };
  }
  if (idem.startsWith("install:")) {
    const parsed = InstallCallbackSchema.safeParse(body);
    return parsed.success ? { kind: "install", data: parsed.data } : { kind: "unknown" };
  }
  if (idem.startsWith("uninstall:")) {
    const parsed = UninstallCallbackSchema.safeParse(body);
    return parsed.success ? { kind: "uninstall", data: parsed.data } : { kind: "unknown" };
  }
  return { kind: "unknown" };
}
