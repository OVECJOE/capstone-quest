import { joinCohort, signIn } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Header, Hero, Sky } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentUser } from "@/lib/supabase/server";

export default async function Join({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const { userId } = await currentUser();
  return (
    <main>
      <Sky className="min-h-dvh pb-16">
        <Header signedIn={Boolean(userId)} />
        <Hero title="You're invited" text="Join your cohort to start your project journey. A mentor may need to let you in." />
        <div className="mx-auto max-w-xl px-[4%]">
          <Card><CardContent>
            <ActionForm action={userId ? joinCohort : signIn}>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="next" value={`/join/${encodeURIComponent(code)}`} />
              <Button size="lg">{userId ? "Join the cohort" : "Sign in with GitHub to join"}</Button>
            </ActionForm>
          </CardContent></Card>
        </div>
      </Sky>
    </main>
  );
}
