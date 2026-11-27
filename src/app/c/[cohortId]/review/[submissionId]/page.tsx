import Link from "next/link";
import { notFound } from "next/navigation";
import { approveGrade, rerunReview, voidSubmission } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui/field";
import { ExtLink } from "@/components/ext-link";
import { LiveRefresh } from "@/components/live-refresh";
import { Rubric } from "@/components/rubric";
import { Header, Hero, Sky } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Disclosure } from "@/components/ui/disclosure";
import { NumberInput } from "@/components/ui/number-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { rows, type Project, type Submission } from "@/lib/data";
import { isId } from "@/lib/forms";
import { isOpen, STATUS_NAMES } from "@/lib/journey";
import { parseRepoLink } from "@/lib/review/links";
import type { ReviewDraft } from "@/lib/review/types";
import { requireUser } from "@/lib/supabase/server";

export const maxDuration = 300;

type Row = Submission & {
  projects: Project & { profiles: { full_name: string | null } | null };
  reviews: { draft: ReviewDraft; created_at: string } | null;
};

export default async function ReviewPage({ params }: PageProps<"/c/[cohortId]/review/[submissionId]">) {
  const { cohortId, submissionId } = await params;
  if (!isId(cohortId) || !isId(submissionId)) notFound();
  const { supabase } = await requireUser(`/c/${cohortId}/review/${submissionId}`);
  if (!rows<boolean>(await supabase.rpc("is_mentor", { p_cohort: cohortId }))) notFound();
  const row = rows<Row | null>(
    await supabase.from("submissions").select("*, projects(*, profiles(full_name)), reviews(draft, created_at), grades(*)").eq("id", submissionId).maybeSingle(),
  );
  if (!row || row.projects.cohort_id !== cohortId || !row.projects.criteria) notFound();

  const { projects: project, reviews: review } = row;
  const criteria = project.criteria!;
  const draft = review?.draft;
  const busy = row.status === "queued" || row.status === "reviewing";
  const gradable = row.status === "ready" || row.status === "failed";
  // A short-lived link, signed with the mentor's own access.
  const zipLink = row.zip_path
    ? (await supabase.storage.from("submissions").createSignedUrl(row.zip_path, 3600, { download: true })).data?.signedUrl
    : null;
  const parsed = row.repo_url ? parseRepoLink(row.repo_url) : null;
  const version = !parsed || !row.pinned_ref ? null
    : parsed.kind === "repo" ? `https://github.com/${parsed.owner}/${parsed.repo}/tree/${row.pinned_ref}`
    : `https://gist.github.com/${parsed.id}/${row.pinned_ref}`;
  const hidden = <><input type="hidden" name="cohortId" value={cohortId} /><input type="hidden" name="submissionId" value={row.id} /></>;

  return (
    <main>
      <Sky className="min-h-dvh pb-16">
        <Header signedIn />
        <Hero title={project.title} text={`${project.profiles?.full_name ?? "Student"}, attempt ${row.attempt}.`} />
        <div className="mx-auto flex max-w-4xl flex-col gap-8 px-[4%]">
          {busy ? <LiveRefresh /> : null}
          <Link href={`/c/${cohortId}`} className="font-extrabold underline underline-offset-4">Back to mission control</Link>
          <Card><CardContent>
            <Badge variant={row.status === "failed" ? "warning" : "secondary"} className="self-start">{STATUS_NAMES[row.status]}</Badge>
            <div>
              <h2 className="text-2xl">Their work</h2>
              {row.repo_url ? <ExtLink href={row.repo_url} /> : zipLink ? <a href={zipLink} className="font-extrabold underline underline-offset-4">Download their zip file</a> : <span>Zip file unavailable.</span>}
              <br />{row.live_url ? <ExtLink href={row.live_url} /> : <span>No live link.</span>}
              {version ? <><br /><ExtLink href={version} label="Open the frozen version that was reviewed" /></> : null}
            </div>
            <div><h2 className="text-2xl">What they promised</h2><p className="break-words whitespace-pre-wrap">{project.features}</p></div>
            {row.message ? <p className="font-bold break-words">{row.message}</p> : null}
          </CardContent></Card>

          <Tabs defaultValue={row.grades || !draft ? "grade" : "findings"}>
          <TabsList variant="bar" aria-label="Review">
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="grade">Grade</TabsTrigger>
            {isOpen(row.status) ? <TabsTrigger value="more">Run again or hand back</TabsTrigger> : null}
          </TabsList>
          <TabsContent value="findings">
          {draft ? (
            <Card>
              <CardHeader><CardTitle>What the review found</CardTitle><CardDescription>The code was read, not run. Check anything that matters.</CardDescription></CardHeader>
              <CardContent>
                {row.status === "failed" ? <p className="rounded-2xl border-3 border-ink bg-sun px-5 py-3 font-bold">The latest run failed. These notes are from an earlier run.</p> : null}
                {draft.concerns.length ? (
                  <div className="rounded-2xl border-3 border-ink bg-blush px-5 py-3">
                    <h3 className="text-xl">Look closely at</h3>
                    <ul className="list-disc pl-5">{draft.concerns.map((c, i) => <li key={i} className="break-words">{c}</li>)}</ul>
                  </div>
                ) : null}
                {draft.features.map((f, i) => (
                  <div key={i} className="rounded-2xl border-3 border-ink bg-cream px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="min-w-0 text-lg break-words">{f.feature}</h3>
                      <Badge variant={f.status === "found" ? "default" : f.status === "partial" ? "secondary" : "warning"}>{f.status === "found" ? "Found" : f.status === "partial" ? "Partly there" : "Not found"}</Badge>
                    </div>
                    <p className="break-words">{f.evidence}</p>
                  </div>
                ))}
                {draft.live ? (
                  <p className="break-words"><strong>Live link:</strong> {draft.live.error ?? `answered ${draft.live.status} in ${(draft.live.milliseconds / 1000).toFixed(1)} seconds${draft.live.title ? `, titled “${draft.live.title}”` : ""}`}. One plain request, without running the page’s scripts, so open it yourself too.</p>
                ) : null}
                <Disclosure label={`${draft.filesRead.length} files read, ${draft.filesSkipped} left out`}>
                  <ul>{draft.filesRead.map((f) => <li key={f} className="break-all">{f}</li>)}</ul>
                </Disclosure>
              </CardContent>
            </Card>
          ) : <Card><CardContent><p>{busy ? "The review is running. This page updates by itself." : "There is no AI draft for this attempt."}</p></CardContent></Card>}
          </TabsContent>

          <TabsContent value="grade">
          {busy ? <Card><CardContent><p>Grading opens when the review finishes.</p></CardContent></Card> : null}
          {row.status === "void" ? <Card><CardContent><p>This attempt was handed back without a grade.</p></CardContent></Card> : null}
          {gradable ? (
            <Card>
              <CardHeader><CardTitle>Your grade</CardTitle><CardDescription>Change anything. The student sees only what you approve.</CardDescription></CardHeader>
              <CardContent>
                <ActionForm action={approveGrade} requireClick key={review?.created_at ?? "manual"}>
                  {hidden}
                  {criteria.map((c, i) => {
                    const score = draft?.scores.find((s) => s.name === c.name);
                    return (
                      <div key={c.name} className="flex flex-col gap-2 rounded-2xl border-3 border-ink bg-white p-4">
                        <div><h3 className="text-xl">{c.name}</h3><p>{c.description}</p></div>
                        <input type="hidden" name="name" value={c.name} />
                        <Field label={<Label htmlFor={`score-${i}`}>Score out of {c.points}</Label>}>
                          <NumberInput id={`score-${i}`} name="score" min={0} max={c.points} required defaultValue={score?.score} />
                        </Field>
                        <Field label={<Label htmlFor={`comment-${i}`}>Comment</Label>}>
                          <Textarea id={`comment-${i}`} name="comment" maxLength={4000} defaultValue={score?.comment} />
                        </Field>
                      </div>
                    );
                  })}
                  <Field label={<Label htmlFor="feedback">Feedback to the student</Label>}>
                    <Textarea id="feedback" name="feedback" required maxLength={8000} defaultValue={draft?.feedback} />
                  </Field>
                  <fieldset className="flex flex-col gap-3">
                    <legend className="mb-3 font-extrabold">Tick what you checked yourself. These award badges.</legend>
                    <div className="flex items-center gap-3"><Checkbox id="readme_ok" name="readme_ok" /><Label htmlFor="readme_ok">Someone else could run it from the README</Label></div>
                    {row.live_url ? <div className="flex items-center gap-3"><Checkbox id="live_ok" name="live_ok" /><Label htmlFor="live_ok">I opened the live link and it works</Label></div> : null}
                  </fieldset>
                  <Button size="lg" className="self-start">Approve grade</Button>
                </ActionForm>
              </CardContent>
            </Card>
          ) : null}

          {row.grades ? (
            <Card>
              <CardHeader><CardTitle>{row.grades.total} out of 100</CardTitle><CardDescription>Approved. The student can see this.</CardDescription></CardHeader>
              <CardContent><p className="break-words whitespace-pre-wrap">{row.grades.feedback}</p><Rubric criteria={criteria} scores={row.grades.scores} /></CardContent>
            </Card>
          ) : null}
          </TabsContent>

          {isOpen(row.status) ? <TabsContent value="more">
            <Card><CardContent>
              <ActionForm action={rerunReview}>{hidden}
                <div><h2 className="text-2xl">Run the review again</h2><p>Replaces the draft above and uses your AI credit.{busy ? " Use this only if it has been stuck for over six minutes." : ""}</p></div>
                <Button variant="outline" className="self-start">Run again</Button>
              </ActionForm>
              <hr className="border-t-3 border-ink" />
              <ActionForm action={voidSubmission}>{hidden}
                <div><h2 className="text-2xl">Hand it back</h2><p>No grade, and the attempt does not count.</p></div>
                <Field label={<Label htmlFor="reason">Reason shown to the student</Label>}><Input id="reason" name="reason" required maxLength={500} /></Field>
                <Button variant="outline" className="self-start">Hand back without a grade</Button>
              </ActionForm>
            </CardContent></Card>
          </TabsContent> : null}
          </Tabs>
        </div>
      </Sky>
    </main>
  );
}
