"use client";

import { useState } from "react";
import { saveAvatar } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Hero } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Guide } from "@/components/world";
import { BODY_COLOURS, DEFAULT_AVATAR, TOPPERS, type Avatar } from "@/lib/avatar";

export function CharacterPicker({ initial }: { initial: Avatar | null }) {
  const [avatar, setAvatar] = useState<Avatar>(initial ?? DEFAULT_AVATAR);
  return (
    <>
      <Hero title="Meet your builder" text="This character walks your map and lives on your plot." />
      <div className="mx-auto w-full max-w-4xl px-[4%]">
        <Card><CardContent>
          <div className="flex flex-wrap items-center gap-8">
            <svg viewBox="-70 -195 140 215" role="img" aria-label={`${BODY_COLOURS[avatar.body].name} builder with ${TOPPERS[avatar.topper].toLowerCase()}`} className="mx-auto h-64 w-auto">
              <Guide avatar={avatar} />
            </svg>
            <ActionForm action={saveAvatar} className="min-w-0 flex-[1_1_300px]">
              <fieldset><legend className="mb-2 font-extrabold">Body colour</legend>
                <RadioGroup name="body" value={avatar.body} onValueChange={(body) => setAvatar((a) => ({ ...a, body: body as Avatar["body"] }))}>
                  {Object.entries(BODY_COLOURS).map(([key, colour]) => (
                    <RadioGroupItem key={key} value={key} className="flex items-center gap-2">
                      <span aria-hidden="true" className="size-5 rounded-full border-2 border-ink" style={{ background: colour.left }} />{colour.name}
                    </RadioGroupItem>
                  ))}
                </RadioGroup>
              </fieldset>
              <fieldset><legend className="mb-2 font-extrabold">On top</legend>
                <RadioGroup name="topper" value={avatar.topper} onValueChange={(topper) => setAvatar((a) => ({ ...a, topper: topper as Avatar["topper"] }))}>
                  {Object.entries(TOPPERS).map(([key, name]) => <RadioGroupItem key={key} value={key}>{name}</RadioGroupItem>)}
                </RadioGroup>
              </fieldset>
              <Button className="self-start">Save my builder</Button>
            </ActionForm>
          </div>
        </CardContent></Card>
      </div>
    </>
  );
}
