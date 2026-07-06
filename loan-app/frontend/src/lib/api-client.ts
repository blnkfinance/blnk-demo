import { backendFetch } from "./backend-client";

export type ApiErrorBody = {
  ok?: false;
  error?: string;
  field_errors?: Record<string, string>;
};

export type ApiFailure = {
  ok: false;
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

export const CONNECTIVITY_ERROR =
  "Could not reach the app backend. Check that it is running and CORS is configured.";

export async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function appendToken(path: string, token: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}token=${encodeURIComponent(token)}`;
}

function failureFromBody(
  status: number,
  body: ApiErrorBody | null,
  fallback: string
): ApiFailure {
  return {
    ok: false,
    status,
    message: body?.error ?? fallback,
    fieldErrors: body?.field_errors,
  };
}

type ApiRequestOptions = {
  path: string;
  fallbackError: string;
  validate?: (body: unknown) => boolean;
};

export async function apiRequest<T>(
  options: ApiRequestOptions
): Promise<ApiResult<T>> {
  try {
    const response = await backendFetch(options.path);
    const body = await parseJson<T & ApiErrorBody>(response);

    if (!response.ok) {
      return failureFromBody(response.status, body, options.fallbackError);
    }

    if (options.validate && !options.validate(body)) {
      return { ok: false, status: 500, message: "Invalid response" };
    }

    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, message: CONNECTIVITY_ERROR };
  }
}

type ApiMutationOptions = ApiRequestOptions & {
  init: RequestInit;
};

export async function apiMutation<T>(
  options: ApiMutationOptions
): Promise<ApiResult<T>> {
  try {
    const response = await backendFetch(options.path, options.init);
    const body = await parseJson<T & ApiErrorBody>(response);

    if (!response.ok) {
      return failureFromBody(response.status, body, options.fallbackError);
    }

    if (options.validate && !options.validate(body)) {
      return { ok: false, status: 500, message: "Invalid response" };
    }

    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, message: CONNECTIVITY_ERROR };
  }
}
