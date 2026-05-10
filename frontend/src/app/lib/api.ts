import type {
  Analysis,
  DoctorReport,
  SessionRecord,
  SessionMetrics,
  TrendsPoint,
  User
} from "./types";

const API_PREFIX = "/api/v1";

type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json().catch(() => ({}))) as ApiErrorEnvelope & T;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }
  return payload as T;
}

export async function signUp(input: { display_name: string; email: string; password: string }) {
  return requestJson<{ user: User }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function signIn(input: { email: string; password: string }) {
  return requestJson<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function signInWithFirebaseToken(input: { id_token: string }) {
  return requestJson<{ user: User }>("/auth/firebase", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function signOut() {
  return requestJson<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export async function getMe() {
  return requestJson<{ user: User }>("/auth/me");
}

export async function createSession(input: {
  metrics: SessionMetrics;
  sessionId: string;
  audioBlob: Blob | null;
}) {
  const formData = new FormData();
  formData.append("metrics", JSON.stringify(input.metrics));
  formData.append("session_id", input.sessionId);
  if (input.audioBlob) {
    formData.append("audio", input.audioBlob, "voice.webm");
  }

  const response = await fetch(`${API_PREFIX}/sessions`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  const payload = (await response.json().catch(() => ({}))) as ApiErrorEnvelope & {
    id: string;
    analysis: Analysis;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Unable to create session.");
  }
  return payload;
}

export async function getSessions() {
  return requestJson<{ sessions: SessionRecord[] }>("/sessions");
}

export async function getSessionById(sessionId: string) {
  return requestJson<{ session: SessionRecord }>(`/sessions/${sessionId}`);
}

export async function getSessionTrends() {
  return requestJson<{ trends: TrendsPoint[]; latest: Analysis | null }>("/sessions/trends");
}

export async function generateSessionReport(sessionId: string) {
  return requestJson<{ report: DoctorReport }>(`/sessions/${sessionId}/report`, {
    method: "POST"
  });
}

export async function downloadSessionReportPdf(sessionId: string) {
  const response = await fetch(`${API_PREFIX}/sessions/${sessionId}/report/pdf`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
    throw new Error(payload.error?.message ?? "Unable to download the report PDF.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return { blob, filename: fileNameMatch?.[1] ?? `neurowatch-session-${sessionId}-clinical-report.pdf` };
}
