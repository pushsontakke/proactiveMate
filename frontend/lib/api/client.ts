import type {
  AiResponse,
  CreateTaskResult,
  DecomposedTask,
  ProactiveMateApi,
  RescuePlan,
  RescuePlanItem,
  ScheduleSuggestion,
  Task,
  UpdateTaskRequest,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`ProactiveMate API request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export const realApi: ProactiveMateApi = {
  getTasks: () => apiFetch<AiResponse<Task[]>>("/tasks/?sort=ai_priority"),

  createTask: (input, options) =>
    apiFetch<AiResponse<CreateTaskResult>>(
      `/tasks/${options?.aiPlan ? "?ai_plan=true" : ""}`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  updateTask: (id, input) =>
    apiFetch<AiResponse<Task>>(`/tasks/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(input satisfies UpdateTaskRequest),
    }),

  previewDecomposition: (input) =>
    apiFetch<AiResponse<DecomposedTask[]>>("/tasks/decompose/", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getRescuePlan: () =>
    apiFetch<AiResponse<RescuePlan>>("/tasks/rescue/", {
      method: "POST",
      body: JSON.stringify({ confirm: false }),
    }),

  applyRescuePlan: (items: RescuePlanItem[]) =>
    apiFetch<AiResponse<RescuePlan>>("/tasks/rescue/", {
      method: "POST",
      body: JSON.stringify({ confirm: true, items }),
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),

  getSchedule: () =>
    apiFetch<AiResponse<ScheduleSuggestion>>("/schedule/suggest/", {
      method: "POST",
      body: JSON.stringify({ range: "today" }),
    }),
};
