import { Badge } from "@/components/ui/badge";
import type { Criterion, Score } from "@/lib/review/types";

export function Rubric({ criteria, scores }: { criteria: Criterion[]; scores?: Score[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {criteria.map((c) => {
        const score = scores?.find((s) => s.name === c.name);
        return (
          <li key={c.name} className="rounded-2xl border-3 border-ink bg-cream px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl">{c.name}</h3>
              <Badge variant="secondary">{score ? `${score.score} of ${c.points}` : `${c.points} points`}</Badge>
            </div>
            <p className="break-words whitespace-pre-wrap">{score ? score.comment : c.description}</p>
          </li>
        );
      })}
    </ul>
  );
}
