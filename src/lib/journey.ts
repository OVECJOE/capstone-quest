export const STAGES = ["idea", "rules", "build", "review", "grade"] as const;
export type Stage = (typeof STAGES)[number];
export type SubmissionStatus = "queued" | "reviewing" | "ready" | "failed" | "void" | "graded";

export const STAGE_NAMES: Record<Stage, { pill: string; pin: string }> = {
  idea: { pill: "Idea", pin: "Your idea" },
  rules: { pill: "Criteria", pin: "Your criteria" },
  build: { pill: "Submit", pin: "Submit your build" },
  review: { pill: "Review", pin: "Mentor review" },
  grade: { pill: "Grade", pin: "Final grade" },
};

export const STATUS_NAMES: Record<SubmissionStatus, string> = {
  queued: "In line for review",
  reviewing: "Being reviewed",
  ready: "Waiting for a mentor",
  failed: "Needs a mentor",
  void: "Handed back",
  graded: "Graded",
};

export const isOpen = (status: SubmissionStatus) => ["queued", "reviewing", "ready", "failed"].includes(status);

/** Where a student is on the map, and which islands are behind them. */
export function journey(projectStatus: string | null, submissions: { attempt: number; status: SubmissionStatus }[]) {
  const counted = submissions.filter((s) => s.status !== "void").sort((a, b) => b.attempt - a.attempt);
  const graded = counted.some((s) => s.status === "graded");
  let current: Stage = "idea";
  if (projectStatus === "approved") {
    current = !counted.length ? "build" : isOpen(counted[0].status) ? "review" : "grade";
  }
  const done: Stage[] = [];
  if (projectStatus === "approved") done.push("idea", "rules");
  if (counted.length) done.push("build");
  if (graded && current === "grade") done.push("review", "grade");
  return { current, done };
}
