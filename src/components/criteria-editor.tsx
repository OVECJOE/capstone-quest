"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import type { Criterion } from "@/lib/review/types";

type Row = Criterion & { key: number };
const blank = (key: number): Row => ({ key, name: "", description: "", points: 0 });
const start = (initial: Criterion[] | null): Row[] =>
  initial?.length ? initial.map((c, key) => ({ ...c, key })) : [blank(0)];

export function CriteriaEditor({ initial }: { initial: Criterion[] | null }) {
  // Until the mentor types, the AI draft shows up as soon as it arrives. After that it never overwrites their work.
  const [edit, setEdit] = useState<{ list: Row[]; beforeDraft: boolean } | null>(null);
  const list = edit?.list ?? start(initial);
  const total = list.reduce((sum, c) => sum + c.points, 0);
  const update = (next: (rows: Row[]) => Row[]) =>
    setEdit((e) => ({ list: next(e?.list ?? start(initial)), beforeDraft: e?.beforeDraft ?? !initial?.length }));
  const change = (key: number, patch: Partial<Criterion>) => update((l) => l.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  return (
    <div className="flex flex-col gap-4">
      {edit?.beforeDraft && initial?.length ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-3 border-ink bg-lime px-5 py-3 font-bold">
          <span>The AI draft has arrived. Your own criteria are still here.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setEdit(null)}>Replace mine with the draft</Button>
        </div>
      ) : null}
      <input type="hidden" name="criteria" value={JSON.stringify(list.map(({ name, description, points }) => ({ name: name.trim(), description: description.trim(), points })))} />
      {list.map((c, index) => (
        <div key={c.key} className="flex flex-col gap-2 rounded-2xl border-3 border-ink bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-[3_1_220px]">
              <Field label={<Label htmlFor={`name-${c.key}`}>Criterion {index + 1}</Label>}>
                <Input id={`name-${c.key}`} value={c.name} maxLength={80} onChange={(e) => change(c.key, { name: e.target.value })} />
              </Field>
            </div>
            <div className="flex-[1_1_170px]">
              <Field label={<Label htmlFor={`points-${c.key}`}>Points</Label>}>
                <NumberInput id={`points-${c.key}`} min={1} max={100} value={c.points ? String(c.points) : ""} onValueChange={(v) => change(c.key, { points: Number(v) })} />
              </Field>
            </div>
          </div>
          <Label htmlFor={`description-${c.key}`}>What earns the points</Label>
          <Textarea id={`description-${c.key}`} value={c.description} maxLength={600} onChange={(e) => change(c.key, { description: e.target.value })} />
          {list.length > 1 ? <Button type="button" variant="link" size="sm" className="self-end" onClick={() => update((l) => l.filter((x) => x.key !== c.key))}>Remove this criterion</Button> : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" disabled={list.length >= 12}
          onClick={() => update((l) => [...l, blank(Math.max(...l.map((c) => c.key)) + 1)])}>Add a criterion</Button>
        <Badge variant={total === 100 ? "default" : "warning"}>Total {total} of 100</Badge>
      </div>
    </div>
  );
}
