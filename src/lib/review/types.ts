export type Criterion = { name: string; description: string; points: number };
export type Score = { name: string; score: number; comment: string };
export type FeatureCheck = { feature: string; status: "found" | "partial" | "missing"; evidence: string };
export type ReviewDraft = {
  scores: Score[];
  feedback: string;
  features: FeatureCheck[];
  concerns: string[];
  live: LiveCheck | null;
  filesRead: string[];
  filesSkipped: number;
};
export type LiveCheck = {
  ok: boolean;
  status: number | null;
  finalUrl: string;
  milliseconds: number;
  title: string;
  excerpt: string;
  error: string | null;
};
export type SourceFile = { path: string; content: string };
export type Source = {
  description: string;
  allPaths: string[];
  files: SourceFile[];
  skipped: number;
};

/** The student's link is the problem, so the attempt is handed back to them. */
export class InputError extends Error {}
