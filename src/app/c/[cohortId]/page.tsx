import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MentorView, type Student } from "@/components/mentor-view";
import { Header, Sky } from "@/components/shell";
import { StudentView } from "@/components/student-view";
import { Waiting } from "@/components/waiting";
import type { Avatar } from "@/lib/avatar";
import { rows, type Cohort, type Membership, type Plot, type Project, type Submission } from "@/lib/data";
import { isId } from "@/lib/forms";
import { requireUser } from "@/lib/supabase/server";

// Reviews run after the response, inside this route's time limit.
export const maxDuration = 300;

export default async function CohortPage({ params }: PageProps<"/c/[cohortId]">) {
  const { cohortId } = await params;
  if (!isId(cohortId)) notFound();
  const { supabase, userId } = await requireUser(`/c/${cohortId}`);

  const membership = rows<Membership[]>(await supabase.rpc("my_cohorts")).find((m) => m.id === cohortId);
  if (!membership) notFound();
  if (membership.status === "pending") {
    return <Waiting chip={`${membership.organisation}, ${membership.name}`} />;
  }
  const mentor = membership.role === "mentor";
  const cohort = rows<Cohort>(await supabase.from("cohorts").select("*, organisations(name)").eq("id", cohortId).single());

  // A mentor's access covers the whole cohort. A student's view is narrowed to their own project.
  let projectQuery = supabase.from("projects").select("*").eq("cohort_id", cohortId).order("updated_at");
  if (!mentor) projectQuery = projectQuery.eq("student_id", userId);
  let projects = rows<Project[]>(await projectQuery);
  const people = mentor
    ? rows<(Student & { status: string })[]>(
        await supabase.from("memberships").select("user_id, status, profiles(full_name, github_login)").eq("cohort_id", cohortId).eq("role", "student").order("created_at"),
      )
    : [];
  // A removed student's work is kept, but stays off the mentor's lists until they are let back in.
  if (mentor) projects = projects.filter((p) => people.some((s) => s.user_id === p.student_id && s.status === "active"));
  const submissions = projects.length
    ? rows<Submission[]>(await supabase.from("submissions").select("*, grades(*)").in("project_id", projects.map((p) => p.id)))
    : [];

  const plots = rows<Plot[]>(await supabase.rpc("cohort_world", { p_cohort: cohortId }));
  const me = rows<{ avatar: Avatar | null }>(await supabase.from("profiles").select("avatar").eq("id", userId).single());
  let body = <StudentView cohort={cohort} project={projects[0] ?? null} submissions={submissions} plots={plots} avatar={me.avatar} userId={userId} />;
  if (mentor) {
    const emails = rows<{ email: string }[]>(
      await supabase.from("cohort_allowed_emails").select("email").eq("cohort_id", cohortId).order("email"),
    ).map((e) => e.email);
    const codes = rows<{ student_code: string; mentor_code: string } | null>(
      await supabase.from("cohort_invites").select("student_code, mentor_code").eq("cohort_id", cohortId).maybeSingle(),
    );
    const head = await headers();
    const origin = `${head.get("x-forwarded-proto") ?? "https"}://${head.get("x-forwarded-host") ?? head.get("host")}`;
    const invites = codes ? { student: `${origin}/join/${codes.student_code}`, mentor: `${origin}/join/${codes.mentor_code}` } : null;
    body = <MentorView cohort={cohort} projects={projects} submissions={submissions} plots={plots} invites={invites} emails={emails}
      students={people.filter((p) => p.status === "active")} requests={people.filter((p) => p.status === "pending")} />;
  }

  return (
    <main>
      <Sky className="min-h-dvh pb-16">
        <Header signedIn chip={`${cohort.organisations.name}, ${cohort.name}`} />
        {body}
      </Sky>
    </main>
  );
}
