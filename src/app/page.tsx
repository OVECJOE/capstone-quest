import Link from "next/link";
import { redirect } from "next/navigation";
import { joinCohort, signIn } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui/field";
import { Header, Hero, Sky } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tilt } from "@/components/tilt";
import { World } from "@/components/world";
import { rows, type Membership } from "@/lib/data";
import { safePath } from "@/lib/paths";
import { currentUser } from "@/lib/supabase/server";

export default async function Home({ searchParams }: PageProps<"/">) {
  const query = await searchParams;
  const next = safePath(query.next);
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const session = configured ? await currentUser() : null;

  let cohorts: Membership[] = [];
  if (session?.userId) {
    if (next !== "/") redirect(next);
    cohorts = rows<Membership[]>(await session.supabase.rpc("my_cohorts"));
  }

  return (
    <main>
      <Sky className="pb-16">
        <Header signedIn={Boolean(session?.userId)} />
        <Hero title="Build it, launch it, level up" text="Share your capstone project, get a careful review and earn a grade your mentor stands behind." />
        <Tilt><World current="idea" done={[]} /></Tilt>
        <div className="mx-auto max-w-2xl px-[4%] pt-4">
          <Card>
            {!session ? (
              <CardHeader>
                <CardTitle>Almost ready</CardTitle>
                <CardDescription>Add the Supabase settings listed in the setup guide, then restart the app.</CardDescription>
              </CardHeader>
            ) : !session.userId ? (
              <>
                <CardHeader>
                  <CardTitle>Start your quest</CardTitle>
                  <CardDescription>Sign in with the GitHub account that holds your project.</CardDescription>
                </CardHeader>
                <CardContent>
                  {query.signin === "failed" ? <p className="font-extrabold">Sign-in did not finish. Please try again.</p> : null}
                  <ActionForm action={signIn}>
                    <input type="hidden" name="next" value={next} />
                    <Button size="lg">Sign in with GitHub</Button>
                  </ActionForm>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>{cohorts.length ? "Your cohorts" : "Join your cohort"}</CardTitle>
                  <CardDescription>{cohorts.length ? "Pick up where you left off." : "Your mentor has an invite link or code for you."}</CardDescription>
                </CardHeader>
                <CardContent>
                  {cohorts.map((c) => (
                    <Link key={c.id} href={`/c/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-3 border-ink bg-cream px-5 py-3 hover:bg-lime">
                      <span className="font-display text-xl font-semibold">{c.organisation}, {c.name}</span>
                      <Badge variant={c.status === "pending" ? "warning" : "default"}>{c.status === "pending" ? "Waiting for approval" : c.role === "mentor" ? "Mentor" : "Student"}</Badge>
                    </Link>
                  ))}
                  <ActionForm action={joinCohort}>
                    <Field label={<Label htmlFor="code">Invite code or link</Label>}>
                      <Input id="code" name="code" required />
                    </Field>
                    <Button variant="outline">Join cohort</Button>
                  </ActionForm>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </Sky>
    </main>
  );
}
