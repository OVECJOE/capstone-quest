"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Criterion } from "@/lib/review/types";

type Row = Criterion & { key: number };
const blank = (key: number): Row => ({ key, name: "", description: "", points: 0 });

export function CriteriaEditor({ initial }: { initial: Criterion[] | null }) {
  const [list, setList] = useState<Row[]>(() => (initial?.length ? initial.map((c, key) => ({ ...c, key })) : [blank(0)]));
  const total = list.reduce((sum, c) => sum + c.points, 0);
  const change = (key: number, patch: Partial<Criterion>) => setList((l) => l.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="criteria" value={JSON.stringify(list.map(({ name, description, points }) => ({ name: name.trim(), description: description.trim(), points })))} />
      {list.map((c, index) => (
        <div key={c.key} className="flex flex-col gap-2 rounded-2xl border-3 border-ink bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-0 flex-[3_1_220px] flex-col gap-1.5">
              <Label htmlFor={`name-${c.key}`}>Criterion {index + 1}</Label>
              <Input id={`name-${c.key}`} value={c.name} maxLength={80} onChange={(e) => change(c.key, { name: e.target.value })} />
            </div>
            <div className="flex flex-[1_1_90px] flex-col gap-1.5">
              <Label htmlFor={`points-${c.key}`}>Points</Label>
              <Input id={`points-${c.key}`} type="number" min={1} max={100} value={c.points || ""} onChange={(e) => change(c.key, { points: Math.trunc(Number(e.target.value)) })} />
            </div>
          </div>
          <Label htmlFor={`description-${c.key}`}>What earns the points</Label>
          <Textarea id={`description-${c.key}`} value={c.description} maxLength={600} onChange={(e) => change(c.key, { description: e.target.value })} />
          {list.length > 1 ? <Button type="button" variant="link" size="sm" className="self-end" onClick={() => setList((l) => l.filter((x) => x.key !== c.key))}>Remove this criterion</Button> : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" disabled={list.length >= 12}
          onClick={() => setList((l) => [...l, blank(Math.max(...l.map((c) => c.key)) + 1)])}>Add a criterion</Button>
        <Badge variant={total === 100 ? "default" : "warning"}>Total {total} of 100</Badge>
      </div>
    </div>
  );
}
