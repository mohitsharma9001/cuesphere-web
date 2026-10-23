import "server-only";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, API_BASE } from "@/lib/api/config";

export class ApiRequestError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | null | undefined | string[]>;

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Send the signed-in user's token (default true). Public reads can pass false. */
  auth?: boolean;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return url;
}

async function accessToken(): Promise<string | undefined> {
  try {
    return (await cookies()).get(ACCESS_COOKIE)?.value;
  } catch {
    return undefined; // outside a request scope
  }
}

/** Server-side call to the CueSphere API. Unwraps `{ success, data }` and
 * throws ApiRequestError (with the API's message) on any non-2xx response. */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, headers = {} } = options;
  const token = auth ? await accessToken() : undefined;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const res = await fetch(buildUrl(path, query), {
    method,
    cache: "no-store",
    headers: {
      ...(body !== undefined && !isForm ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as { success?: boolean; data?: T; message?: string } | null;
  if (!res.ok || json?.success === false) {
    throw new ApiRequestError(res.status, json?.message ?? `Request failed (${res.status})`, json);
  }
  return json?.data as T;
}

/** Like api(), but resolves 404 to undefined — for "find one" lookups. */
export async function apiMaybe<T>(path: string, options?: ApiOptions): Promise<T | undefined> {
  try {
    return await api<T>(path, options);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return undefined;
    throw error;
  }
}

/** Like api(), but returns `{ error }` instead of throwing — matches the
 * `{ error?: string }` shape many services and actions already return. */
export async function apiResult<T = unknown>(path: string, options?: ApiOptions): Promise<{ data?: T; error?: string }> {
  try {
    return { data: await api<T>(path, options) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Something went wrong." };
  }
}
