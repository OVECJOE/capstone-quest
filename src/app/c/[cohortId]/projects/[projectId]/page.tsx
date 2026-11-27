import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { decideProject, redraftCriteria } from "@/app/actions";
import { ActionForm, Field } from "@/components/action-form";
import { CriteriaEditor } from "@/components/criteria-editor";
import { LiveRefresh } from "@/components/live-refresh";
import { Header, Hero, Sky } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rows, type Project } from "@/lib/data";
import { isId } from "@/lib/forms";
import { requireUser } from "@/lib/supabase/server";

export const maxDuration = 300;

export default async function ProposalPage({ params }: PageProps<"/c/[cohortId]/projects/[projectId]">) {
  const { cohortId, projectId } = await params;
  if (!isId(cohortId) || !isId(projectId)) notFound();
  const { supabase } = await requireUser(`/c/${cohortId}/projects/${projectId}`);
  if (!rows<boolean>(await supabase.rpc("is_mentor", { p_cohort: cohortId }))) notFound();
  const project = rows<(Project & { profiles: { full_name: string | null } | null }) | null>(
    await supabase.from("projects").select("*, profiles(full_name)").eq("id", projectId).eq("cohort_id", cohortId).maybeSingle(),
  );
  if (!project) notFound();
  if (project.status !== "proposed") redirect(`/c/${cohortId}`);
  const hidden = <><input type="hidden" name="cohortId" value={cohortId} /><input type="hidden" name="projectId" value={project.id} /></>;

  return (
    <main>
      <Sky className="min-h-dvh pb-16">
        <Header signedIn />
        <Hero title={project.title} text={`Proposed by ${project.profiles?.full_name ?? "a student"}.`} />
        <div className="mx-auto flex max-w-4xl flex-col gap-8 px-[4%]">
          <Link href={`/c/${cohortId}`} className="font-extrabold underline underline-offset-4">Back to mission control</Link>
          <Card><CardContent>
            <div><h2 className="text-2xl">The idea</h2><p className="break-words whitespace-pre-wrap">{project.summary}</p></div>
            <div><h2 className="text-2xl">Promised features</h2><p className="break-words whitespace-pre-wrap">{project.features}</p></div>
          </CardContent></Card>
          <Card>
            <CardHeader>
              <CardTitle>Marking criteria</CardTitle>
              <CardDescription>{project.criteria ? "Drafted by AI from the track and this proposal. Edit anything." : "The AI draft is not ready. It usually takes under a minute. You can also write them yourself."}</CardDescription>
            </CardHeader>
            <CardContent>
              {!project.criteria ? (
                <>
                  <LiveRefresh seconds={8} />
                  <ActionForm action={redraftCriteria}>{hidden}<Button variant="outline" size="sm" className="self-start">Draft them again</Button></ActionForm>
                </>
              ) : null}
              {/* The key swaps in the draft when it arrives, and a new version when the student edits. */}
              <ActionForm action={decideProject} key={`${project.version}-${project.criteria ? "drafted" : "empty"}`}>
                {hidden}
                <input type="hidden" name="version" value={project.version} />
                <CriteriaEditor initial={project.criteria} />
                <Field label={<Label htmlFor="note">Note to the student</Label>} hint="Required when you ask for changes.">
                  <Textarea id="note" name="note" maxLength={2000} />
                </Field>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" name="decision" value="approve">Approve idea and criteria</Button>
                  <Button size="lg" variant="outline" name="decision" value="changes">Ask for changes</Button>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </Sky>
    </main>
  );
}
