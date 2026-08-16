import type {
  AiMeta,
  AiResponse,
  CreateTaskResult,
  DecomposedTask,
  ProactiveMateApi,
  RescuePlan,
  RescuePlanItem,
  ScheduleSuggestion,
  Task,
  TaskStatus,
} from "./types";

const minute = 60_000;
const hour = 60 * minute;
const now = Date.now();
const isoFromNow = (offsetMs: number) => new Date(now + offsetMs).toISOString();

const baseTasks: Task[] = [
  {
    id: 1,
    user_id: 1,
    title: "Finish the investor call deck",
    description: "Tighten the story, proof the metrics, and export the final deck.",
    due_at: isoFromNow(19 * hour),
    priority: 3,
    effort_min: 70,
    status: "todo",
    parent_task_id: null,
    ai_score: 88,
    ai_score_stale: true,
    tags: ["work", "protected"],
    created_at: isoFromNow(-30 * hour),
    updated_at: isoFromNow(-45 * minute),
    ai_reason: "High-impact work with one reliable focus window left.",
  },
  {
    id: 2,
    user_id: 1,
    title: "Pay rent + EMI confirmation",
    description: "Complete transfers and save both receipts.",
    due_at: isoFromNow(-2 * hour),
    priority: 3,
    effort_min: 12,
    status: "todo",
    parent_task_id: null,
    ai_score: 96,
    ai_score_stale: true,
    tags: ["personal", "hard-deadline"],
    created_at: isoFromNow(-72 * hour),
    updated_at: isoFromNow(-3 * hour),
    ai_reason: "Overdue, high priority, and quick to close.",
  },
  {
    id: 3,
    user_id: 1,
    title: "AgentAudit copy pass",
    description: "Review onboarding and empty-state copy.",
    due_at: isoFromNow(3 * hour),
    priority: 2,
    effort_min: 90,
    status: "todo",
    parent_task_id: null,
    ai_score: 61,
    ai_score_stale: true,
    tags: ["work", "flexible"],
    created_at: isoFromNow(-24 * hour),
    updated_at: isoFromNow(-6 * hour),
    ai_reason: "Useful today, but safe to yield to harder deadlines.",
  },
  {
    id: 4,
    user_id: 1,
    title: "Send client sync notes",
    description: "Share decisions and owners from the afternoon call.",
    due_at: isoFromNow(5 * hour),
    priority: 2,
    effort_min: 20,
    status: "started",
    parent_task_id: null,
    ai_score: 74,
    ai_score_stale: true,
    tags: ["work"],
    created_at: isoFromNow(-8 * hour),
    updated_at: isoFromNow(-20 * minute),
    ai_reason: "Already started and unblocks three collaborators.",
  },
  {
    id: 5,
    user_id: 1,
    title: "Outline onboarding experiment",
    description: "Define the hypothesis and primary success metric.",
    due_at: isoFromNow(27 * hour),
    priority: 2,
    effort_min: 45,
    status: "todo",
    parent_task_id: null,
    ai_score: 58,
    ai_score_stale: true,
    tags: ["product"],
    created_at: isoFromNow(-16 * hour),
    updated_at: isoFromNow(-10 * hour),
    ai_reason: "Important tomorrow; one focused block will finish it.",
  },
  {
    id: 6,
    user_id: 1,
    title: "Draft landing page proof points",
    description: "Turn customer quotes into three concise proof points.",
    due_at: isoFromNow(31 * hour),
    priority: 2,
    effort_min: 35,
    status: "todo",
    parent_task_id: 10,
    ai_score: 54,
    ai_score_stale: true,
    tags: ["launch"],
    created_at: isoFromNow(-22 * hour),
    updated_at: isoFromNow(-9 * hour),
    ai_reason: "A contained step toward Friday's launch goal.",
  },
  {
    id: 7,
    user_id: 1,
    title: "Review waitlist form",
    description: "Test validation, success copy, and mobile layout.",
    due_at: isoFromNow(35 * hour),
    priority: 2,
    effort_min: 25,
    status: "todo",
    parent_task_id: 10,
    ai_score: 49,
    ai_score_stale: true,
    tags: ["launch"],
    created_at: isoFromNow(-22 * hour),
    updated_at: isoFromNow(-9 * hour),
    ai_reason: "Short launch dependency with room tomorrow.",
  },
  {
    id: 8,
    user_id: 1,
    title: "Book dentist follow-up",
    description: "Call the clinic and choose a morning slot.",
    due_at: isoFromNow(-26 * hour),
    priority: 1,
    effort_min: 10,
    status: "todo",
    parent_task_id: null,
    ai_score: 67,
    ai_score_stale: true,
    tags: ["personal"],
    created_at: isoFromNow(-96 * hour),
    updated_at: isoFromNow(-48 * hour),
    ai_reason: "Overdue and very quick, but lower impact than today's work.",
  },
  {
    id: 9,
    user_id: 1,
    title: "Reconcile August expenses",
    description: "Match receipts and categorize card transactions.",
    due_at: isoFromNow(29 * hour),
    priority: 1,
    effort_min: 40,
    status: "todo",
    parent_task_id: null,
    ai_score: 35,
    ai_score_stale: true,
    tags: ["admin"],
    created_at: isoFromNow(-48 * hour),
    updated_at: isoFromNow(-20 * hour),
    ai_reason: "Low urgency and flexible around protected work.",
  },
  {
    id: 10,
    user_id: 1,
    title: "Ship waitlist MVP",
    description: "Publish the landing page and connect the waitlist.",
    due_at: isoFromNow(52 * hour),
    priority: 3,
    effort_min: 180,
    status: "started",
    parent_task_id: null,
    ai_score: 72,
    ai_score_stale: true,
    tags: ["goal", "launch"],
    created_at: isoFromNow(-60 * hour),
    updated_at: isoFromNow(-11 * hour),
    ai_reason: "A major goal already broken into manageable steps.",
  },
  {
    id: 11,
    user_id: 1,
    title: "Read pricing interview notes",
    description: "Highlight objections and repeated language.",
    due_at: isoFromNow(46 * hour),
    priority: 1,
    effort_min: 30,
    status: "todo",
    parent_task_id: null,
    ai_score: 29,
    ai_score_stale: true,
    tags: ["research"],
    created_at: isoFromNow(-12 * hour),
    updated_at: isoFromNow(-12 * hour),
    ai_reason: "Valuable context, but it can wait until core work is safe.",
  },
  {
    id: 12,
    user_id: 1,
    title: "Confirm Saturday run",
    description: "Reply with the route and meeting time.",
    due_at: isoFromNow(7 * hour),
    priority: 1,
    effort_min: 5,
    status: "done",
    parent_task_id: null,
    ai_score: 45,
    ai_score_stale: true,
    tags: ["personal"],
    created_at: isoFromNow(-6 * hour),
    updated_at: isoFromNow(-1 * hour),
    ai_reason: "Completed.",
  },
  {
    id: 13,
    user_id: 1,
    title: "Prepare product demo data",
    description: "Create a clean sample workspace for Monday.",
    due_at: isoFromNow(63 * hour),
    priority: 2,
    effort_min: 50,
    status: "todo",
    parent_task_id: null,
    ai_score: 31,
    ai_score_stale: true,
    tags: ["work"],
    created_at: isoFromNow(-4 * hour),
    updated_at: isoFromNow(-4 * hour),
    ai_reason: "Enough runway remains after tomorrow's commitments.",
  },
  {
    id: 14,
    user_id: 1,
    title: "Water balcony plants",
    description: "Quick reset between focus blocks.",
    due_at: null,
    priority: 1,
    effort_min: 8,
    status: "todo",
    parent_task_id: null,
    ai_score: 12,
    ai_score_stale: true,
    tags: ["home"],
    created_at: isoFromNow(-18 * hour),
    updated_at: isoFromNow(-18 * hour),
    ai_reason: "No deadline; keep it as a low-energy reset.",
  },
];

let tasks = baseTasks.map((task) => ({ ...task, tags: [...task.tags] }));

const degradedMeta: AiMeta = {
  model: "deterministic-v1",
  degraded: true,
  latency_ms: 42,
};

const delay = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));

function currentMode() {
  return process.env.NEXT_PUBLIC_MOCK_STATE ?? "degraded";
}

async function respond<T>(data: T): Promise<AiResponse<T>> {
  await delay();
  if (currentMode() === "error") {
    throw new Error("The planning service is taking a quiet moment.");
  }
  return {
    data,
    ai_meta:
      currentMode() === "degraded"
        ? degradedMeta
        : { model: "gemini-mock", degraded: false, latency_ms: 186 },
  };
}

function rescueItems(): RescuePlanItem[] {
  const investor = tasks.find((task) => task.id === 1)!;
  const rent = tasks.find((task) => task.id === 2)!;
  const audit = tasks.find((task) => task.id === 3)!;
  return [
    {
      task_id: investor.id,
      label: "Protected window",
      old_due_at: investor.due_at!,
      new_due_at: isoFromNow(8 * hour),
      slot: { start: isoFromNow(8 * hour), end: isoFromNow(8 * hour + 70 * minute) },
      reason: "Your strongest completion window protects the highest-impact work.",
    },
    {
      task_id: rent.id,
      label: "Hard deadline",
      old_due_at: rent.due_at!,
      new_due_at: isoFromNow(30 * minute),
      slot: { start: isoFromNow(18 * minute), end: isoFromNow(30 * minute) },
      reason: "Close the overdue payment before starting another deep task.",
    },
    {
      task_id: audit.id,
      label: "Yields (safe)",
      old_due_at: audit.due_at!,
      new_due_at: isoFromNow(25 * hour),
      slot: { start: isoFromNow(23.5 * hour), end: isoFromNow(25 * hour) },
      reason: "This flexible review can move without blocking anyone today.",
    },
  ];
}

function taskSort(a: Task, b: Task) {
  if (a.status === "done" && b.status !== "done") return 1;
  if (a.status !== "done" && b.status === "done") return -1;
  return (b.ai_score ?? 0) - (a.ai_score ?? 0);
}

export const mockApi: ProactiveMateApi = {
  async getTasks() {
    const visible = currentMode() === "empty" ? [] : [...tasks].sort(taskSort);
    return respond(visible);
  },

  async createTask(input, options) {
    const createdAt = new Date().toISOString();
    const parent: Task = {
      id: Math.max(...tasks.map((task) => task.id)) + 1,
      user_id: 1,
      ...input,
      status: "todo",
      parent_task_id: null,
      ai_score: 50,
      ai_score_stale: true,
      created_at: createdAt,
      updated_at: createdAt,
      ai_reason: "New task awaiting the next full ranking pass.",
    };
    const decomposition = options?.aiPlan
      ? (await mockApi.previewDecomposition({ title: input.title, due_at: input.due_at })).data
      : [];
    const subtasks = decomposition.map<Task>((subtask, index) => ({
      ...parent,
      id: parent.id + index + 1,
      title: subtask.title,
      description: `A focused step toward “${parent.title}”.`,
      due_at: subtask.due_at,
      effort_min: subtask.effort_min,
      parent_task_id: parent.id,
      ai_score: 55 - index * 4,
    }));
    tasks = [parent, ...subtasks, ...tasks];
    return respond<CreateTaskResult>({ task: parent, subtasks });
  },

  async updateTask(id, input) {
    const task = tasks.find((item) => item.id === id);
    if (!task) throw new Error("Task not found.");
    const updated: Task = { ...task, ...input, updated_at: new Date().toISOString() };
    tasks = tasks.map((item) => (item.id === id ? updated : item));
    return respond(updated);
  },

  async previewDecomposition(input) {
    const deadline = new Date(input.due_at).getTime();
    const step = Math.max((deadline - Date.now()) / 4, hour);
    const title = input.title.trim() || "the goal";
    const result: DecomposedTask[] = [
      { title: `Clarify the outcome for ${title}`, effort_min: 25, due_at: new Date(deadline - step * 3).toISOString() },
      { title: `Build the first complete pass`, effort_min: 60, due_at: new Date(deadline - step * 2).toISOString() },
      { title: `Review, tighten, and deliver`, effort_min: 40, due_at: new Date(deadline - step).toISOString() },
    ];
    return respond(result);
  },

  async getRescuePlan() {
    return respond<RescuePlan>({
      items: rescueItems(),
      summary: "Three deliberate moves recover the day without sacrificing the work that matters most.",
    });
  },

  async applyRescuePlan(items) {
    tasks = tasks.map((task) => {
      const move = items.find((item) => item.task_id === task.id);
      return move ? { ...task, due_at: move.new_due_at, updated_at: new Date().toISOString() } : task;
    });
    return respond<RescuePlan>({ items, summary: "Plan applied. Your protected work now has room." });
  },

  async getSchedule() {
    const active = tasks.filter((task) => task.status !== ("done" satisfies TaskStatus));
    const suggestion: ScheduleSuggestion = {
      tasks: active.slice(0, 5),
      calendar_blocks: [
        {
          id: "calendar-standup",
          title: "Standup + client sync",
          start: isoFromNow(90 * minute),
          end: isoFromNow(180 * minute),
          protected: true,
        },
      ],
      workable_minutes: 245,
    };
    return respond(suggestion);
  },
};
