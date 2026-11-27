"use client";

import { useState } from "react";
import { Hero } from "@/components/shell";
import { Tilt } from "@/components/tilt";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { World } from "@/components/world";
import type { Avatar } from "@/lib/avatar";
import { STAGE_NAMES, STAGES, type Stage } from "@/lib/journey";

type Panel = { title: string; text: string; body?: React.ReactNode };

export function JourneyBoard({ hero, current, done, panels, avatar }: {
  hero: { title: string; text: string }; current: Stage; done: Stage[]; panels: Record<Stage, Panel>; avatar: Avatar | null;
}) {
  const [picked, setPicked] = useState<Stage>(current);
  return (
    <>
      <Hero {...hero} />
      <Tilt><World current={current} done={done} onPick={setPicked} avatar={avatar} /></Tilt>
      <div className="mx-auto w-full max-w-4xl px-[4%] pt-4">
        <Card>
          <CardContent>
            <Tabs value={picked} onValueChange={(value) => setPicked(value as Stage)}>
              <TabsList aria-label="Steps">
                {STAGES.map((stage) => (
                  <TabsTrigger key={stage} value={stage}>{done.includes(stage) ? "✓ " : ""}{STAGE_NAMES[stage].pill}</TabsTrigger>
                ))}
              </TabsList>
              {STAGES.map((stage) => (
                <TabsContent key={stage} value={stage}>
                  <div className="mt-3 mb-1"><h2 className="text-3xl">{panels[stage].title}</h2><p>{panels[stage].text}</p></div>
                  {panels[stage].body}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
