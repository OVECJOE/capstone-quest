import { LiveRefresh } from "@/components/live-refresh";
import { Header, Hero, Sky } from "@/components/shell";
import { Tilt } from "@/components/tilt";
import { World } from "@/components/world";

export function Waiting({ chip }: { chip: string }) {
  return (
    <main>
      <Sky className="min-h-dvh pb-16">
        <Header signedIn chip={chip} />
        <Hero title="Your request is in" text="A mentor needs to let you in. This page opens by itself once they do." />
        <LiveRefresh seconds={20} />
        <Tilt><World current="idea" done={[]} /></Tilt>
      </Sky>
    </main>
  );
}
