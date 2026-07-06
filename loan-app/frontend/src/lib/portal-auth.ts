import { backendFetch } from "./backend-client";
import { resolveBrandingPrimaryColor } from "./branding";

export type PortalSession = {
  installed_app_id: string;
  instance_id: string;
  blnkCloudApiOrigin: string;
  brandingPrimaryColor: string;
};

export type PortalAuthResult =
  | { ok: true; session: PortalSession }
  | { ok: false; kind: "auth"; status: number; message: string }
  | { ok: false; kind: "connectivity"; message: string };

type PortalVerifyResponse = {
  ok?: boolean;
  error?: string;
  installed_app_id?: string;
  instance_id?: string;
  blnk_cloud_api_origin?: string;
  branding_primary_color?: string;
};

export async function verifyPortalToken(
  token: string | null | undefined
): Promise<PortalAuthResult> {
  if (!token?.trim()) {
    return { ok: false, kind: "auth", status: 401, message: "Missing token" };
  }

  try {
    const response = await backendFetch(
      `/portal?token=${encodeURIComponent(token)}`
    );

    let body: PortalVerifyResponse | null = null;
    try {
      body = (await response.json()) as PortalVerifyResponse;
    } catch {
      body = null;
    }

    if (
      response.ok &&
      body?.ok &&
      body.installed_app_id &&
      body.instance_id &&
      body.blnk_cloud_api_origin
    ) {
      return {
        ok: true,
        session: {
          installed_app_id: body.installed_app_id,
          instance_id: body.instance_id,
          blnkCloudApiOrigin: body.blnk_cloud_api_origin,
          brandingPrimaryColor: resolveBrandingPrimaryColor(
            body.branding_primary_color
          ),
        },
      };
    }

    return {
      ok: false,
      kind: "auth",
      status: response.status,
      message: body?.error ?? "Session invalid",
    };
  } catch {
    return {
      ok: false,
      kind: "connectivity",
      message:
        "Could not reach the app backend. Check that it is running and CORS is configured.",
    };
  }
}
