import Link from "next/link";
import { decideJoin, removeStudent, saveEmails, updateCohort } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui/field";
import { CohortWorld } from "@/components/cohort-world";
import { ExtLink } from "@/components/ext-link";
import { LiveRefresh } from "@/components/live-refresh";
import { Hero } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Disclosure } from "@/components/ui/disclosure";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Cohort, Plot, Project, Submission } from "@/lib/data";
import { isOpen, STATUS_NAMES } from "@/lib/journey";

export type Student = { user_id: string; profiles: { full_name: string | null; github_login: string | null } };

const row = "flex flex-wrap items-center justify-between gap-3 rounded-2xl border-3 border-ink bg-cream px-5 py-3";

export function MentorView({ cohort, projects, submissions, students, requests, emails, plots, invites }: {
  cohort: Cohort; projects: Project[]; submissions: Submission[]; students: Student[]; requests: Student[]; emails: string[];
  plots: Plot[]; invites: { student: string; mentor: string } | null;
}) {
  const name = (id: string) => {
    const profile = students.find((s) => s.user_id === id)?.profiles;
    return profile?.full_name || profile?.github_login || "Unnamed student";
  };
  const proposals = projects.filter((p) => p.status === "proposed");
  const waiting = submissions.filter((s) => isOpen(s.status)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const running = waiting.some((s) => s.status === "queued" || s.status === "reviewing");
  const first = proposals.length ? "ideas" : waiting.length ? "builds" : "people";

  return (
    <>
      {running ? <LiveRefresh seconds={10} /> : null}
      <Hero title="Mission control" text={`${proposals.length} ${proposals.length === 1 ? "proposal" : "proposals"} and ${waiting.length} ${waiting.length === 1 ? "review" : "reviews"} waiting for you.`} />
      <Tabs defaultValue={first}>
        <TabsList variant="bar" aria-label="Mission control">
          <TabsTrigger value="ideas">Ideas {proposals.length || ""}</TabsTrigger>
          <TabsTrigger value="builds">Builds {waiting.length || ""}</TabsTrigger>
          <TabsTrigger value="people">People{requests.length ? <Badge variant="warning">{requests.length} to approve</Badge> : null}</TabsTrigger>
          <TabsTrigger value="world">Cohort world</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
      <div className="mx-auto w-full max-w-4xl px-[4%]">
        <TabsContent value="ideas">
        <Card>
          <CardHeader><CardTitle>Ideas to approve</CardTitle><CardDescription>Check the idea and its criteria.</CardDescription></CardHeader>
          <CardContent>
            {proposals.length ? proposals.map((p) => (
              <div key={p.id} className={row}>
                <div className="min-w-0"><h3 className="text-xl break-words">{p.title}</h3><p className="wrap-anywhere">{name(p.student_id)}{p.criteria ? "" : ", criteria draft not ready"}</p></div>
                <Button asChild size="sm"><Link href={`/c/${cohort.id}/projects/${p.id}`}>Check idea</Link></Button>
              </div>
            )) : <p>Nothing waiting.</p>}
          </CardContent>
        </Card>
        </TabsContent>
        <TabsContent value="builds">
        <Card>
          <CardHeader><CardTitle>Builds to grade</CardTitle><CardDescription>Oldest first. Students see nothing until you approve.</CardDescription></CardHeader>
          <CardContent>
            {waiting.length ? waiting.map((s) => {
              const project = projects.find((p) => p.id === s.project_id);
              return (
                <div key={s.id} className={row}>
                  <div className="min-w-0"><h3 className="text-xl break-words">{project?.title}</h3><p className="wrap-anywhere">{project ? name(project.student_id) : ""}, attempt {s.attempt}</p></div>
                  <div className="flex items-center gap-3">
                    <Badge variant={s.status === "failed" ? "warning" : "secondary"}>{STATUS_NAMES[s.status]}</Badge>
                    <Button asChild size="sm"><Link href={`/c/${cohort.id}/review/${s.id}`}>Open</Link></Button>
                  </div>
                </div>
              );
            }) : <p>Nothing waiting.</p>}
          </CardContent>
        </Card>
        </TabsContent>
        <TabsContent value="people" >
        <div className="flex flex-col gap-8">
        {requests.length ? (
          <Card>
            <CardHeader><CardTitle>Waiting to join</CardTitle><CardDescription>They see nothing until you let them in.</CardDescription></CardHeader>
            <CardContent>
              {requests.map((r) => (
                <ActionForm key={r.user_id} action={decideJoin} className="gap-0">
                  <input type="hidden" name="cohortId" value={cohort.id} />
                  <input type="hidden" name="userId" value={r.user_id} />
                  <div className={row}>
                    <div className="min-w-0"><h3 className="text-xl wrap-anywhere">{r.profiles.full_name || r.profiles.github_login || "Unnamed"}</h3>
                      {r.profiles.github_login ? <ExtLink href={`https://github.com/${r.profiles.github_login}`} /> : null}</div>
                    <div className="flex gap-3">
                      <Button size="sm" name="decision" value="approve">Let in</Button>
                      <Button size="sm" variant="outline" name="decision" value="decline">Decline</Button>
                    </div>
                  </div>
                </ActionForm>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader><CardTitle>Students</CardTitle><CardDescription>{students.length} joined.</CardDescription></CardHeader>
          <CardContent>
            {students.map((student) => {
              const project = projects.find((p) => p.student_id === student.user_id);
              const latest = submissions.filter((s) => s.project_id === project?.id && s.grades).sort((a, b) => b.attempt - a.attempt)[0];
              return (
                <div key={student.user_id} className={row}>
                  <div className="min-w-0">
                    <h3 className="text-xl wrap-anywhere">{name(student.user_id)}</h3>
                    <p className="wrap-anywhere">{project ? project.title : "No idea yet"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                  {latest?.grades
                    ? <Button asChild size="sm" variant="outline"><Link href={`/c/${cohort.id}/review/${latest.id}`}>{latest.grades.total} out of 100</Link></Button>
                    : <Badge variant="muted">{project ? (project.status === "approved" ? (submissions.some((s) => s.project_id === project.id && isOpen(s.status)) ? "In review" : "Building") : project.status === "proposed" ? "Proposed" : "Revising") : "Not started"}</Badge>}
                  </div>
                  <Disclosure label="Remove">
                    <ActionForm action={removeStudent} className="gap-2">
                      <input type="hidden" name="cohortId" value={cohort.id} />
                      <input type="hidden" name="userId" value={student.user_id} />
                      <p>They lose access straight away and come off the email list. Their work is kept and returns if you let them back in.</p>
                      {/* Names can be long, so this button wraps instead of staying on one line. */}
                      <Button size="sm" className="max-w-full shrink self-start text-left whitespace-normal wrap-anywhere">Yes, remove {name(student.user_id)}</Button>
                    </ActionForm>
                  </Disclosure>
                </div>
              );
            })}
          </CardContent>
        </Card>
        {invites ? (
          <Card>
            <CardHeader><CardTitle>Invite links</CardTitle><CardDescription>Anyone with a link can join in that role.</CardDescription></CardHeader>
            <CardContent>
              <Field label={<Label htmlFor="invite-student">For students</Label>}><CopyField id="invite-student" value={invites.student} /></Field>
              <Field label={<Label htmlFor="invite-mentor">For mentors only</Label>}><CopyField id="invite-mentor" value={invites.mentor} /></Field>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader><CardTitle>Email list</CardTitle><CardDescription>Students whose GitHub email is on this list join without waiting.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={saveEmails}>
              <input type="hidden" name="cohortId" value={cohort.id} />
              <Field label={<Label htmlFor="emails">Email addresses</Label>} hint="Paste them one per line or separated by commas. Saving replaces the whole list.">
                <Textarea key={emails.join()} id="emails" name="emails" defaultValue={emails.join("\n")} />
              </Field>
              <Button className="self-start">Save list</Button>
            </ActionForm>
          </CardContent>
        </Card>
        </div>
        </TabsContent>
        <TabsContent value="world"><CohortWorld plots={plots} visibility={cohort.visibility} mentor /></TabsContent>
        <TabsContent value="rules">
        <Card>
          <CardHeader><CardTitle>Cohort rules</CardTitle><CardDescription>These apply to every student here.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={updateCohort}>
              <input type="hidden" name="cohortId" value={cohort.id} />
              <Field label={<Label htmlFor="deadline">Deadline, in your local time</Label>} hint="Leave empty for no deadline."><DateTimePicker id="deadline" name="deadline" defaultValue={cohort.deadline} /></Field>
              <Field label={<Label htmlFor="attempts">Attempts per student</Label>}><NumberInput id="attempts" name="attempts" min={1} max={20} required defaultValue={cohort.max_attempts} /></Field>
              <Field label={<Label htmlFor="template">What this track expects</Label>} hint="Used to draft each student’s marking criteria.">
                <Textarea id="template" name="template" maxLength={4000} defaultValue={cohort.criteria_template} />
              </Field>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 font-extrabold">What students see of each other</legend>
                <RadioGroup name="visibility" defaultValue={cohort.visibility} className="flex-col">
                  <RadioGroupItem value="private">Only their own work</RadioGroupItem>
                  <RadioGroupItem value="projects">Names, approved projects and links</RadioGroupItem>
                  <RadioGroupItem value="grades">Names, projects, links and grades</RadioGroupItem>
                </RadioGroup>
              </fieldset>
              <Button className="self-start">Save rules</Button>
            </ActionForm>
          </CardContent>
        </Card>
        </TabsContent>
      </div>
      </Tabs>
    </>
  );
}
