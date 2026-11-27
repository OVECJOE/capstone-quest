import { proposeProject } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui/field";
import { Badges } from "@/components/badges";
import { CharacterPicker } from "@/components/character-picker";
import { CohortWorld } from "@/components/cohort-world";
import { SubmitForm } from "@/components/submit-form";
import { ExtLink } from "@/components/ext-link";
import { JourneyBoard } from "@/components/journey-board";
import { LiveRefresh } from "@/components/live-refresh";
import { LocalTime } from "@/components/local-time";
import { Rubric } from "@/components/rubric";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Avatar } from "@/lib/avatar";
import { earnedBadges } from "@/lib/badges";
import { isPast, type Cohort, type Plot, type Project, type Submission } from "@/lib/data";
import { isOpen, journey, STATUS_NAMES, type Stage } from "@/lib/journey";

function ProposalForm({ cohortId, project }: { cohortId: string; project: Project | null }) {
  return (
    <ActionForm action={proposeProject}>
      <input type="hidden" name="cohortId" value={cohortId} />
      <Field label={<Label htmlFor="title">Project name</Label>}>
        <Input id="title" name="title" required minLength={3} maxLength={120} defaultValue={project?.title} />
      </Field>
      <Field label={<Label htmlFor="summary">What are you building, and for whom?</Label>}>
        <Textarea id="summary" name="summary" required minLength={20} maxLength={3000} defaultValue={project?.summary} />
      </Field>
      <Field label={<Label htmlFor="features">Features you promise to deliver</Label>} hint="One per line. Your marking criteria come from these.">
        <Textarea id="features" name="features" required minLength={10} maxLength={3000} defaultValue={project?.features} />
      </Field>
      <Button size="lg" className="self-start">{project ? "Send the new version" : "Send my idea"}</Button>
    </ActionForm>
  );
}

const Proposal = ({ project }: { project: Project }) => (
  <div className="rounded-2xl border-3 border-ink bg-cream px-5 py-4">
    <h3 className="text-2xl">{project.title}</h3>
    <p className="break-words whitespace-pre-wrap">{project.summary}</p>
    <h4 className="mt-3 font-extrabold">Promised features</h4>
    <p className="break-words whitespace-pre-wrap">{project.features}</p>
  </div>
);

const Note = ({ children }: { children: string }) => (
  <p className="rounded-2xl border-3 border-ink bg-lime px-5 py-3 font-bold break-words whitespace-pre-wrap">Mentor’s note: {children}</p>
);

export function StudentView({ cohort, project, submissions, plots, avatar, userId }: {
  cohort: Cohort; project: Project | null; submissions: Submission[]; plots: Plot[]; avatar: Avatar | null; userId: string;
}) {
  const sorted = [...submissions].sort((a, b) => b.attempt - a.attempt);
  const { current, done } = journey(project?.status ?? null, sorted);
  const approved = project?.status === "approved";
  const used = sorted.filter((s) => s.status !== "void").length;
  const open = sorted.find((s) => isOpen(s.status));
  const closed = isPast(cohort.deadline);
  const graded = sorted.find((s) => s.status === "graded" && s.grades);
  const canSubmit = approved && !open && !closed && used < cohort.max_attempts;
  const handedBack = sorted[0]?.status === "void" ? sorted[0] : null;

  const hero: Record<Stage, [string, string]> = {
    idea: project?.status === "proposed"
      ? ["Your idea is with your mentor", "You will move on as soon as it is approved."]
      : ["Every quest starts with an idea", "Tell your mentor what you want to build."],
    rules: ["Your criteria are set", "Read what your project will be marked on."],
    build: ["Your project is ready for lift-off", "Two islands cleared. Send your build to reach mentor review."],
    review: ["Your build is in flight", "It is being checked before your mentor signs it off."],
    grade: ["You reached the summit", "Your mentor has approved a grade."],
  };

  const panels = {
    idea: !project || project.status === "changes_requested" ? {
      title: project ? "Your mentor asked for changes" : "Propose your project",
      text: project ? "Update your idea and send it again." : "Choose something you can finish and show.",
      body: <>{project?.mentor_note ? <Note>{project.mentor_note}</Note> : null}<ProposalForm cohortId={cohort.id} project={project} /></>,
    } : project.status === "proposed" ? {
      title: "Waiting for your mentor", text: "Changing the proposal sends it back to the start of the line.",
      body: <>
        <LiveRefresh seconds={30} />
        <Proposal project={project} />
        <Disclosure label="Change my proposal"><ProposalForm cohortId={cohort.id} project={project} /></Disclosure>
      </>,
    } : {
      title: "Idea approved", text: "This is what you promised to build.",
      body: <>{project.mentor_note ? <Note>{project.mentor_note}</Note> : null}<Proposal project={project} /></>,
    },
    rules: approved && project.criteria
      ? { title: "Your marking criteria", text: "Approved by your mentor. They add up to 100 points.", body: <Rubric criteria={project.criteria} /> }
      : { title: "Not unlocked yet", text: "Criteria appear once your mentor approves your idea." },
    build: {
      title: !approved ? "Not unlocked yet" : canSubmit ? "Send your build" : open ? "Your build is already in" : closed ? "The deadline has passed" : "All attempts used",
      text: !approved ? "Get your idea approved first." : canSubmit
        ? "Your code is read and your live link is loaded before a mentor sees the draft review."
        : open ? "Follow it on the review step." : "Your latest approved grade counts.",
      body: approved ? <>
        {handedBack ? <p className="rounded-2xl border-3 border-ink bg-blush px-5 py-3 font-bold break-words">Attempt handed back: {handedBack.message}</p> : null}
        {canSubmit ? <SubmitForm cohortId={cohort.id} projectId={project.id} userId={userId} /> : null}
        <p className="text-[15px] font-bold">
          {used} of {cohort.max_attempts} attempts used. A mentor approves every grade.
          {cohort.deadline ? <> Deadline: <LocalTime iso={cohort.deadline} />.</> : null}
        </p>
      </> : null,
    },
    review: {
      title: open ? STATUS_NAMES[open.status] : sorted.length ? "Your attempts" : "Mentor review waits ahead",
      text: sorted.length ? "Comments appear once your mentor approves the grade." : "Send a build to get here.",
      body: <>
        {/* Check often while the review runs, and rarely while a person has it. */}
        {open ? <LiveRefresh key={open.status} seconds={open.status === "queued" || open.status === "reviewing" ? 6 : 60} /> : null}
        {sorted.map((s) => (
          <div key={s.id} className="flex flex-col gap-1 rounded-2xl border-3 border-ink bg-cream px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl">Attempt {s.attempt}</h3>
              <Badge variant={s.status === "graded" ? "default" : "secondary"}>{STATUS_NAMES[s.status]}</Badge>
            </div>
            {s.repo_url ? <ExtLink href={s.repo_url} /> : <span className="font-extrabold">Zip file upload</span>}
            {s.live_url ? <ExtLink href={s.live_url} /> : null}
            {s.message ? <p className="break-words">{s.message}</p> : null}
          </div>
        ))}
      </>,
    },
    grade: graded?.grades && project?.criteria ? {
      title: `${graded.grades.total} out of 100`, text: `Attempt ${graded.attempt}. Your latest approved grade counts.`,
      body: <>
        <p className="rounded-2xl border-3 border-ink bg-lime px-5 py-4 font-bold break-words whitespace-pre-wrap">{graded.grades.feedback}</p>
        <Rubric criteria={project.criteria} scores={graded.grades.scores} />
      </>,
    } : { title: "Not unlocked yet", text: "Your grade appears when your mentor approves it." },
  };

  const stuck = current === "build" && !canSubmit;
  const [title, text] = stuck ? ["Submissions are closed", closed ? "The deadline has passed." : "All your attempts are used."] : hero[current];
  const badges = earnedBadges(project?.status ?? null, sorted);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <Tabs defaultValue="journey">
      <TabsList variant="bar" aria-label="Your cohort">
        <TabsTrigger value="journey">My journey</TabsTrigger>
        <TabsTrigger value="badges">Badges {earned}/{badges.length}</TabsTrigger>
        <TabsTrigger value="world">Cohort world</TabsTrigger>
        <TabsTrigger value="character">My character</TabsTrigger>
      </TabsList>
      <TabsContent value="journey">
        <JourneyBoard key={current} hero={{ title, text }} current={current} done={done} panels={panels} avatar={avatar} />
      </TabsContent>
      <TabsContent value="badges"><Badges badges={badges} /></TabsContent>
      <TabsContent value="world"><CohortWorld plots={plots} visibility={cohort.visibility} /></TabsContent>
      <TabsContent value="character"><CharacterPicker initial={avatar} /></TabsContent>
    </Tabs>
  );
}
