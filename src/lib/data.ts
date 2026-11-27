import type { Avatar } from "@/lib/avatar";
import type { Stage, SubmissionStatus } from "@/lib/journey";
import type { Criterion, Score } from "@/lib/review/types";

export type Visibility = "private" | "projects" | "grades";
export type Membership = { id: string; name: string; organisation: string; role: "student" | "mentor"; status: "pending" | "active" };
export type Plot = {
  mine: boolean; name: string | null; avatar: Avatar | null; title: string | null; stage: Stage;
  repo_url: string | null; live_url: string | null; total: number | null;
};
export type Cohort = {
  id: string; name: string; track: string; deadline: string | null; max_attempts: number;
  criteria_template: string; visibility: Visibility; organisations: { name: string };
};
export type Project = {
  id: string; cohort_id: string; student_id: string; title: string; summary: string; features: string;
  status: "proposed" | "changes_requested" | "approved"; version: number; criteria: Criterion[] | null; mentor_note: string | null;
};
export type Grade = { submission_id: string; total: number; scores: Score[]; feedback: string; approved_at: string; readme_ok: boolean; live_ok: boolean };
export type Submission = {
  id: string; project_id: string; attempt: number; repo_url: string | null; zip_path: string | null; pinned_ref: string | null; live_url: string | null;
  status: SubmissionStatus; message: string | null; created_at: string; review_started_at: string | null;
  grades: Grade | null;
};

export const isPast = (iso: string | null) => Boolean(iso) && Date.now() > new Date(iso as string).getTime();

/** Supabase reports failures in the result; surface them so they reach the error page. */
export function rows<T>(result: { data: unknown; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
