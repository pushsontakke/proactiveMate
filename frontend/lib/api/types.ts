export type TaskStatus = "todo" | "started" | "done";
export type TaskPriority = 1 | 2 | 3;

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string;
  due_at: string | null;
  priority: TaskPriority;
  effort_min: number;
  status: TaskStatus;
  parent_task_id: number | null;
  ai_score: number | null;
  ai_score_stale: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  ai_reason?: string;
}

export interface AiMeta {
  model: string;
  degraded: boolean;
  latency_ms: number;
}

export interface AiResponse<T> {
  data: T;
  ai_meta: AiMeta;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  due_at: string;
  priority: TaskPriority;
  effort_min: number;
  tags: string[];
}

export type UpdateTaskRequest = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "due_at"
    | "priority"
    | "effort_min"
    | "status"
    | "tags"
  >
>;

export interface DecomposedTask {
  title: string;
  effort_min: number;
  due_at: string;
}

export interface CreateTaskResult {
  task: Task;
  subtasks: Task[];
}

export interface RescuePlanItem {
  task_id: number;
  label: "Protected window" | "Hard deadline" | "Yields (safe)";
  old_due_at: string;
  new_due_at: string;
  slot: {
    start: string;
    end: string;
  };
  reason: string;
}

export interface RescuePlan {
  items: RescuePlanItem[];
  summary: string;
}

export interface RescueRequest {
  confirm: boolean;
  items?: RescuePlanItem[];
}

export interface CalendarBlock {
  id: string;
  title: string;
  start: string;
  end: string;
  protected: boolean;
}

export interface ScheduleSuggestion {
  tasks: Task[];
  calendar_blocks: CalendarBlock[];
  workable_minutes: number;
}

export interface ProactiveMateApi {
  getTasks(): Promise<AiResponse<Task[]>>;
  createTask(
    input: CreateTaskRequest,
    options?: { aiPlan?: boolean },
  ): Promise<AiResponse<CreateTaskResult>>;
  updateTask(
    id: number,
    input: UpdateTaskRequest,
  ): Promise<AiResponse<Task>>;
  previewDecomposition(
    input: Pick<CreateTaskRequest, "title" | "due_at">,
  ): Promise<AiResponse<DecomposedTask[]>>;
  getRescuePlan(): Promise<AiResponse<RescuePlan>>;
  applyRescuePlan(items: RescuePlanItem[]): Promise<AiResponse<RescuePlan>>;
  getSchedule(): Promise<AiResponse<ScheduleSuggestion>>;
}
