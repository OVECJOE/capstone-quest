"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { failure, isId, text, type FormState } from "@/lib/forms";
import { safePath } from "@/lib/paths";
import { runCriteriaDraft, runReview } from "@/lib/review/engine";
import { createClient, requireUser } from "@/lib/supabase/server";

const refresh = (cohortId: string) => revalidatePath(`/c/${cohortId}`, "layout");

export async function signIn(_: FormState, data: FormData): Promise<FormState> {
  const next = safePath(data.get("next"));
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  const protocol = head.get("x-forwarded-proto") ?? "https";
  const supabase = await createClient();
  const { data: oauth, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${protocol}://${host}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !oauth.url) return failure(error ?? { message: "No sign-in address" });
  redirect(oauth.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function joinCohort(_: FormState, data: FormData): Promise<FormState> {
  // People often paste the whole invite link into the code box.
  const code = text(data, "code").replace(/\/+$/, "").split("/").pop() ?? "";
  if (!code) return { error: "Enter your invite code." };
  const { supabase } = await requireUser(`/join/${encodeURIComponent(code)}`);
  const { data: cohortId, error } = await supabase.rpc("join_cohort", { p_code: code });
  if (error) return failure(error);
  redirect(`/c/${cohortId}`);
}

export async function proposeProject(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  if (!isId(cohortId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const { data: project, error } = await supabase.rpc("propose_project", {
    p_cohort: cohortId, p_title: text(data, "title"), p_summary: text(data, "summary"), p_features: text(data, "features"),
  });
  if (error) return failure(error);
  after(() => runCriteriaDraft(project.id));
  refresh(cohortId);
  return { done: "Proposal sent. Your mentor will look at it soon." };
}

export async function submitProject(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const projectId = text(data, "projectId");
  if (!isId(cohortId) || !isId(projectId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const { data: submissionId, error } = await supabase.rpc("submit_project", {
    p_project: projectId, p_repo_url: text(data, "repo"), p_live_url: text(data, "live"),
  });
  if (error) return failure(error);
  after(() => runReview(submissionId));
  refresh(cohortId);
  return { done: "Launched. The review has started." };
}

export async function decideProject(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const projectId = text(data, "projectId");
  if (!isId(cohortId) || !isId(projectId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  let criteria: unknown;
  try {
    criteria = JSON.parse(text(data, "criteria"));
  } catch {
    return { error: "Reload the page and try again." };
  }
  const approve = data.get("decision") === "approve";
  const { error } = await supabase.rpc("decide_project", {
    p_project: projectId, p_version: Number(data.get("version")), p_approve: approve,
    p_criteria: criteria, p_note: text(data, "note"),
  });
  if (error) return failure(error);
  refresh(cohortId);
  redirect(`/c/${cohortId}`);
}

export async function redraftCriteria(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const projectId = text(data, "projectId");
  if (!isId(cohortId) || !isId(projectId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  // The draft runs with the service key, so confirm this person mentors the project's cohort first.
  const { data: project } = await supabase.from("projects").select("cohort_id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Not allowed" };
  const { data: mentor } = await supabase.rpc("is_mentor", { p_cohort: project.cohort_id });
  if (!mentor) return { error: "Not allowed" };
  after(() => runCriteriaDraft(projectId));
  return { done: "Drafting. Reload in about a minute." };
}

export async function rerunReview(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const submissionId = text(data, "submissionId");
  if (!isId(cohortId) || !isId(submissionId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const { data: row } = await supabase.from("submissions").select("status, projects(cohort_id)").eq("id", submissionId).maybeSingle();
  const cohort = (row?.projects as unknown as { cohort_id: string } | null)?.cohort_id;
  if (!row || !cohort) return { error: "Not allowed" };
  const { data: mentor } = await supabase.rpc("is_mentor", { p_cohort: cohort });
  if (!mentor) return { error: "Not allowed" };
  if (row.status === "graded" || row.status === "void") return { error: "This attempt is already closed." };
  after(() => runReview(submissionId));
  return { done: "Review requested. Reload in about two minutes." };
}

export async function approveGrade(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const submissionId = text(data, "submissionId");
  if (!isId(cohortId) || !isId(submissionId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const names = data.getAll("name").map(String);
  const scores = data.getAll("score").map(String);
  const comments = data.getAll("comment").map(String);
  if (scores.some((s) => !/^\d{1,3}$/.test(s.trim()))) return { error: "Every score needs a whole number." };
  const { error } = await supabase.rpc("approve_grade", {
    p_submission: submissionId,
    p_scores: names.map((name, i) => ({ name, score: Number(scores[i]), comment: (comments[i] ?? "").trim() })),
    p_feedback: text(data, "feedback"),
    p_readme_ok: data.get("readme_ok") === "on",
    p_live_ok: data.get("live_ok") === "on",
  });
  if (error) return failure(error);
  refresh(cohortId);
  redirect(`/c/${cohortId}`);
}

export async function voidSubmission(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const submissionId = text(data, "submissionId");
  if (!isId(cohortId) || !isId(submissionId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const { error } = await supabase.rpc("void_submission", { p_submission: submissionId, p_reason: text(data, "reason") });
  if (error) return failure(error);
  refresh(cohortId);
  redirect(`/c/${cohortId}`);
}

export async function updateCohort(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  if (!isId(cohortId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const attempts = Number(data.get("attempts"));
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 20) return { error: "Attempts must be between 1 and 20." };
  const { error } = await supabase.rpc("update_cohort", {
    p_cohort: cohortId, p_deadline: text(data, "deadline") || null, p_max_attempts: attempts, p_template: text(data, "template"),
    p_visibility: text(data, "visibility"),
  });
  if (error) return failure(error);
  refresh(cohortId);
  return { done: "Saved." };
}

export async function submitZip(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const projectId = text(data, "projectId");
  if (!isId(cohortId) || !isId(projectId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const { data: submissionId, error } = await supabase.rpc("submit_zip", {
    p_project: projectId, p_path: text(data, "path"), p_live_url: text(data, "live"),
  });
  if (error) return failure(error);
  after(() => runReview(submissionId));
  refresh(cohortId);
  return { done: "Launched. The review has started." };
}

export async function decideJoin(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const userId = text(data, "userId");
  if (!isId(cohortId) || !isId(userId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const { error } = await supabase.rpc("decide_join", { p_cohort: cohortId, p_user: userId, p_approve: data.get("decision") === "approve" });
  if (error) return failure(error);
  refresh(cohortId);
  return {};
}

export async function removeStudent(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  const userId = text(data, "userId");
  if (!isId(cohortId) || !isId(userId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const { error } = await supabase.rpc("remove_student", { p_cohort: cohortId, p_user: userId });
  if (error) return failure(error);
  refresh(cohortId);
  return {};
}

export async function saveEmails(_: FormState, data: FormData): Promise<FormState> {
  const cohortId = text(data, "cohortId");
  if (!isId(cohortId)) return { error: "Reload the page and try again." };
  const { supabase } = await requireUser(`/c/${cohortId}`);
  const emails = text(data, "emails").split(/[\s,;]+/).filter(Boolean);
  const { data: count, error } = await supabase.rpc("set_allowed_emails", { p_cohort: cohortId, p_emails: emails });
  if (error) return failure(error);
  refresh(cohortId);
  return { done: `Saved ${count} ${count === 1 ? "address" : "addresses"}.` };
}

export async function saveAvatar(_: FormState, data: FormData): Promise<FormState> {
  const { supabase } = await requireUser("/");
  const { error } = await supabase.rpc("set_avatar", { p_body: text(data, "body"), p_topper: text(data, "topper") });
  if (error) return failure(error);
  revalidatePath("/c/[cohortId]", "page");
  return { done: "Saved. Your character is ready." };
}
