import { Hero } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { earnedBadges } from "@/lib/badges";

const ICONS = {
  approval: "M36 55l14 14 27-30",
  readme: "M38 38h36M38 54h36M38 70h22",
  comeback: "M38 56a18 18 0 1 0 8-15M45 28v15h15",
  live: "M32 62l16-16 12 12 20-22",
};
const FILLS = { approval: "#21E065", readme: "#E4FF5C", comeback: "#FFD84A", live: "#7FD6F2" };

export function Badges({ badges }: { badges: ReturnType<typeof earnedBadges> }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <>
      <Hero title="Your badge shelf" text={`${earned} of ${badges.length} earned. Each one comes from real work.`} />
      <div className="mx-auto w-full max-w-4xl px-[4%]">
        <Card><CardContent>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6">
            {badges.map((b) => (
              <li key={b.id} className="flex flex-col items-center gap-3 text-center">
                <svg width="112" height="120" viewBox="0 0 112 120" aria-hidden="true" className="transition-transform duration-200 hover:scale-110 hover:-rotate-12">
                  <circle cx="56" cy="64" r="50" fill="#05331D" />
                  <circle cx="56" cy="54" r="50" fill={b.earned ? FILLS[b.id] : "#D8E4DC"} stroke="#05331D" strokeWidth="4" />
                  <circle cx="56" cy="54" r="38" fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="0.7" />
                  <path d={ICONS[b.id]} fill="none" stroke="#05331D" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div><h2 className="text-xl">{b.name}</h2><p className="text-[15px]">{b.how}</p></div>
                <Badge variant={b.earned ? "secondary" : "muted"}>{b.earned ? "Earned" : "Locked"}</Badge>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      </div>
    </>
  );
}
