import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { draftCriteria, reviewProject } from "./ai";
import { readSource } from "./github";
import { checkLive } from "./live";
import { lateReadWarning } from "./late";
import { InputError, type Criterion } from "./types";
import { readZip } from "./zip";

export async function runCriteriaDraft(projectId: string) {
  try {
    const db = adminClient();
    const { data: project, error } = await db
      .from("projects")
      .select("title, summary, features, status, version, criteria, cohorts(track, criteria_template)")
      .eq("id", projectId)
      .single();
    if (error) throw error;
    if (project.status !== "proposed" || project.criteria) return;
    const cohort = project.cohorts as unknown as { track: string; criteria_template: string };
    const criteria = await draftCriteria(project, cohort.track, cohort.criteria_template);
    // The version filter drops a draft for a proposal the student has since edited.
    const saved = await db.from("projects").update({ criteria })
      .eq("id", projectId).eq("version", project.version).eq("status", "proposed").is("criteria", null);
    if (saved.error) throw saved.error;
  } catch (error) {
    console.error("Criteria draft failed", projectId, error);
  }
}

// The platform stops the route at 300 seconds. Give up earlier, so the failure is still recorded.
const REVIEW_TIME_LIMIT = 270_000;

export async function runReview(submissionId: string) {
  const signal = AbortSignal.timeout(REVIEW_TIME_LIMIT);
  const db = adminClient();
  const claim = await db.rpc("claim_review", { p_submission: submissionId });
  if (claim.error) return console.error("Could not claim review", submissionId, claim.error);
  if (!claim.data) return;

  const finish = async (status: "ready" | "failed" | "void", message: string | null) => {
    const done = await db.from("submissions").update({ status, message }).eq("id", submissionId).eq("status", "reviewing");
    if (done.error) console.error("Could not close review", submissionId, done.error);
  };

  // Handing back is only for work that was never read. A failed re-run must not wipe an earlier draft.
  let reviewedBefore = false;
  try {
    const earlier = await db.from("reviews").select("submission_id").eq("submission_id", submissionId).maybeSingle();
    if (earlier.error) throw earlier.error;
    reviewedBefore = Boolean(earlier.data);
    const { data, error } = await db
      .from("submissions")
      .select("repo_url, zip_path, live_url, pinned_ref, pinned_at, created_at, projects(title, summary, features, criteria)")
      .eq("id", submissionId)
      .single();
    if (error) throw error;
    const project = data.projects as unknown as { title: string; summary: string; features: string; criteria: Criterion[] };
    let pinnedAt: string | null = data.pinned_at;
    const pin = async (ref: string) => {
      pinnedAt = new Date().toISOString();
      const saved = await db.from("submissions").update({ pinned_ref: ref, pinned_at: pinnedAt })
        .eq("id", submissionId).is("pinned_ref", null);
      if (saved.error) throw saved.error;
    };
    const read = async () => {
      if (!data.zip_path) return readSource(data.repo_url, data.pinned_ref, pin);
      const file = await db.storage.from("submissions").download(data.zip_path);
      if (file.error) throw file.error;
      return readZip(new Uint8Array(await file.data.arrayBuffer()));
    };
    const [source, live] = await Promise.all([read(), data.live_url ? checkLive(data.live_url) : null]);
    const draft = await reviewProject({ proposal: project, criteria: project.criteria, source, live, signal });
    const late = lateReadWarning(data.created_at, pinnedAt);
    if (late) draft.concerns.unshift(late);
    const saved = await db.from("reviews").upsert({ submission_id: submissionId, draft, created_at: new Date().toISOString() });
    if (saved.error) throw saved.error;
    await finish("ready", null);
  } catch (error) {
    console.error("Review failed", submissionId, error);
    if (error instanceof InputError && !reviewedBefore) await finish("void", `${error.message} This attempt was not counted.`);
    else await finish("failed", "The automatic review hit a problem. Your mentor can run it again.");
  }
}
