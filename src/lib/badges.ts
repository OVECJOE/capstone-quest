import type { SubmissionStatus } from "./journey.ts";

type Attempt = {
  attempt: number; status: SubmissionStatus;
  grades: { total: number; readme_ok: boolean; live_ok: boolean } | null;
};

/** Badges come straight from the work on record, so they can never drift from it. */
export function earnedBadges(projectStatus: string | null, submissions: Attempt[]) {
  const grades = [...submissions].sort((a, b) => a.attempt - b.attempt).flatMap((s) => (s.grades ? [s.grades] : []));
  return [
    { id: "approval", name: "First approval", how: "Get your project idea approved.", earned: projectStatus === "approved" },
    { id: "readme", name: "Clear README", how: "A mentor confirms others can run it.", earned: grades.some((g) => g.readme_ok) },
    { id: "comeback", name: "Comeback", how: "Resubmit and raise your grade.", earned: grades.some((g, i) => grades.slice(0, i).some((before) => g.total > before.total)) },
    { id: "live", name: "Live and working", how: "A mentor opens your live link and it works.", earned: grades.some((g) => g.live_ok) },
  ] as const;
}
