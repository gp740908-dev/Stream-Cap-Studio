/**
 * StreamCap Studio — API Client
 * Thin wrapper around fetch that handles auth headers and error parsing.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("streamcap_token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail ?? detail;
    } catch {}
    throw new Error(detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<string> {
  const form = new URLSearchParams({ username, password, grant_type: "password" });
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  const token: string = data.access_token;
  localStorage.setItem("streamcap_token", token);
  // Also set cookie so middleware can detect auth on server side
  document.cookie = `streamcap_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
  return token;
}

export function logout(): void {
  localStorage.removeItem("streamcap_token");
  document.cookie = "streamcap_token=; path=/; max-age=0";
  window.location.href = "/login";
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

import type {
  Job,
  JobListResponse,
  CreateJobPayload,
  WatermarkPreset,
  AppSettings,
  SystemResources,
} from "./types";

export const jobs = {
  list: (params?: { status?: string; search?: string; page?: number }) =>
    apiFetch<JobListResponse>(
      `/jobs?${new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()}`
    ),

  get: (id: string) => apiFetch<Job>(`/jobs/${id}`),

  create: (payload: CreateJobPayload) =>
    apiFetch<Job>("/jobs", { method: "POST", body: JSON.stringify(payload) }),

  delete: (id: string, deleteFile = false) =>
    apiFetch<void>(`/jobs/${id}?delete_file=${deleteFile}`, { method: "DELETE" }),

  getLog: (id: string) => apiFetch<{ id: string; log: string | null }>(`/jobs/${id}/log`),

  downloadUrl: (id: string) => `${API_BASE}/jobs/${id}/download`,
};

// ─── Watermarks ───────────────────────────────────────────────────────────────

export const watermarks = {
  list: () => apiFetch<WatermarkPreset[]>("/watermarks"),

  create: (formData: FormData) =>
    apiFetch<WatermarkPreset>("/watermarks", { method: "POST", body: formData }),

  update: (id: string, payload: Partial<WatermarkPreset>) =>
    apiFetch<WatermarkPreset>(`/watermarks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/watermarks/${id}`, { method: "DELETE" }),

  previewUrl: (id: string) => `${API_BASE}/watermarks/${id}/preview`,
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = {
  get: () => apiFetch<AppSettings>("/settings"),

  update: (payload: Partial<AppSettings>) =>
    apiFetch<AppSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  testTelegram: () => apiFetch<{ success: boolean; message: string }>("/settings/telegram/test", {
    method: "POST",
  }),
};

// ─── System ───────────────────────────────────────────────────────────────────

export const system = {
  resources: () => apiFetch<SystemResources>("/system/resources"),
};
