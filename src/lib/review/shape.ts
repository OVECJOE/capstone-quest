import type { Criterion, Score } from "./types.ts";

/** Turns a model's criteria into a set the database accepts: unique names, whole points, total 100. */
export function normaliseCriteria(input: Criterion[]): Criterion[] {
  const seen = new Set<string>();
  const items = input
    .map((c) => ({ name: c.name.trim().slice(0, 80), description: c.description.trim().slice(0, 600), points: Math.max(0, c.points) }))
    // Scores are matched to criteria ignoring case, so names must differ by more than case.
    .filter((c) => c.name && c.points > 0 && !seen.has(c.name.toLowerCase()) && seen.add(c.name.toLowerCase()))
    .slice(0, 8);
  const total = items.reduce((sum, c) => sum + c.points, 0);
  if (!items.length || !Number.isFinite(total)) throw new Error("The draft had no usable criteria");
  const scaled = items.map((c) => ({ ...c, points: Math.max(1, Math.floor((c.points / total) * 100)) }));
  let gap = 100 - scaled.reduce((sum, c) => sum + c.points, 0);
  for (let i = 0; gap !== 0; i = (i + 1) % scaled.length) {
    if (gap > 0) { scaled[i].points++; gap--; }
    else if (scaled[i].points > 1) { scaled[i].points--; gap++; }
  }
  return scaled;
}

/** One score per criterion, in rubric order, inside its range. Missing ones are flagged for the mentor. */
export function normaliseScores(criteria: Criterion[], scores: Score[]): Score[] {
  return criteria.map((c) => {
    const match = scores.find((s) => s.name.trim().toLowerCase() === c.name.toLowerCase());
    if (!match || !Number.isFinite(match.score)) {
      return { name: c.name, score: 0, comment: "The AI draft did not score this. Please score it yourself." };
    }
    return { name: c.name, score: Math.min(c.points, Math.max(0, Math.round(match.score))), comment: match.comment };
  });
}
