import { ExtLink } from "@/components/ext-link";
import { Hero } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Box, Guide, Island } from "@/components/world";
import type { Plot, Visibility } from "@/lib/data";
import { STAGE_NAMES, type Stage } from "@/lib/journey";

const TOWERS: Record<Stage, { height: number; roof: string }> = {
  idea: { height: 12, roof: "#FFF8E6" },
  rules: { height: 26, roof: "#FFF8E6" },
  build: { height: 36, roof: "#E4FF5C" },
  review: { height: 64, roof: "#21E065" },
  grade: { height: 92, roof: "#FFD21F" },
};
const PROGRESS: Record<Stage, string> = { idea: "Shaping an idea", rules: "Setting criteria", build: "Building", review: "In review", grade: "Graded" };
const SEEN: Record<Visibility, string> = {
  private: "Your mentor keeps this cohort private, so you only see your own plot.",
  projects: "Names, approved projects and links are shared.",
  grades: "Projects, links and grades are shared.",
};

function Town({ plot }: { plot: Plot }) {
  const tower = TOWERS[plot.stage];
  return (
    <li className="flex flex-col items-center gap-1 rounded-[28px] p-3 text-center transition-transform duration-200 hover:-translate-y-2">
      <svg viewBox="0 0 220 275" role="img" aria-label={`${STAGE_NAMES[plot.stage].pill} stage`} className="h-auto w-full max-w-60">
        <Island x={110} y={150} w={92} top={plot.mine ? "#E4FF5C" : "#21E065"} />
        <Box x={132} y={140} w={28} h={tower.height} top="#FFFFFF" left="#FFF8E6" right="#E9D9AE" />
        <Box x={132} y={140 - tower.height} w={18} h={14} top={tower.roof} left={tower.roof} right="#12B552" />
        <g transform="translate(66 168) scale(0.55)"><Guide avatar={plot.avatar} /></g>
      </svg>
      <h2 className="text-xl break-words">{plot.mine ? "Your plot" : (plot.name ?? "Unnamed student")}</h2>
      {plot.title ? <p className="break-words">{plot.title}</p> : null}
      <div className="flex flex-wrap justify-center gap-2">
        <Badge variant="secondary">{PROGRESS[plot.stage]}</Badge>
        {plot.total !== null ? <Badge>{plot.total} out of 100</Badge> : null}
      </div>
      <div className="flex gap-4 text-[15px] [&_a]:text-cream">
        {plot.repo_url ? <ExtLink href={plot.repo_url} label="Code" /> : null}
        {plot.live_url ? <ExtLink href={plot.live_url} label="Live site" /> : null}
      </div>
    </li>
  );
}

export function CohortWorld({ plots, visibility, mentor }: { plots: Plot[]; visibility: Visibility; mentor?: boolean }) {
  return (
    <>
      {mentor ? null : <Hero title="The cohort world" text={SEEN[visibility]} />}
      <div className="mx-auto w-full max-w-6xl px-[4%]">
        <div className="rounded-[40px] border-4 border-ink bg-ink px-4 py-8 text-cream">
          {plots.length ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">{plots.map((p, i) => <Town key={i} plot={p} />)}</ul>
          ) : <p className="text-center">No students have joined yet.</p>}
        </div>
      </div>
    </>
  );
}
