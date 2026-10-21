import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { KEYS, storage } from './storage';

/**
 * Thin JSON client for the Physio360 API using a Sanctum bearer token.
 * The server address is configurable on the sign-in screen (each clinic may
 * self-host); the default comes from app.json "extra.apiUrl".
 */

const DEFAULT_SERVER: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

let server = DEFAULT_SERVER;
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function defaultServer(): string {
  return DEFAULT_SERVER;
}

export function currentServer(): string {
  return server;
}

export function setServer(url: string): void {
  server = url.trim().replace(/\/+$/, '') || DEFAULT_SERVER;
}

export function setToken(value: string | null): void {
  token = value;
}

export function authHeader(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Turns a server-relative path (e.g. a photo_url) into a full URL. */
export function absoluteUrl(path: string): string {
  return /^https?:/.test(path) ? path : `${server}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiUrl(path: string): string {
  return `${server}/api${path.startsWith('/') ? path : `/${path}`}`;
}

export function handleUnauthorized(handler: () => void): void {
  onUnauthorized = handler;
}

export async function loadConnection(): Promise<{ token: string | null }> {
  const [savedServer, savedToken] = await Promise.all([storage.get(KEYS.server), storage.get(KEYS.token)]);
  if (savedServer) setServer(savedServer);
  setToken(savedToken);
  return { token: savedToken };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public fields: Record<string, string[]> = {},
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }

  field(name: string): string | undefined {
    return this.fields[name]?.[0];
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return params ? `${path}${path.includes('?') ? '&' : '?'}${params}` : path;
}

export async function toApiError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* not JSON */
  }
  const fields = (body.errors as Record<string, string[]>) ?? {};
  let message = (body.message as string) ?? 'Something went wrong. Please try again.';
  if (res.status === 422 && Object.keys(fields).length) message = Object.values(fields)[0]?.[0] ?? message;
  if (res.status === 403 && (!body.message || body.message === 'This action is unauthorized.')) message = 'You do not have permission to do that.';
  if (res.status === 404) message = 'Not found.';
  if (res.status === 429) message = 'Too many attempts. Please wait a moment.';
  if (res.status >= 500) message = 'The server had a problem. Please try again.';
  return new ApiError(res.status, message, body.code as string | undefined, fields, body);
}

export async function request<T = unknown>(method: string, path: string, opts: { body?: unknown; query?: Query; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(withQuery(path, opts.query)), {
      method,
      headers: {
        Accept: 'application/json',
        ...(opts.form ? {} : { 'Content-Type': 'application/json' }),
        ...authHeader(),
      },
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError(0, `Cannot reach the clinic server (${server}). Check your connection.`);
  }
  if (res.status === 401 && token) {
    onUnauthorized?.();
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
  upload: <T = unknown>(path: string, form: FormData) => request<T>('POST', path, { form }),
};

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}
