"use client";

import { submitProject, submitZip } from "@/app/actions";
import { ActionForm, Field } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormState } from "@/lib/forms";
import { browserClient } from "@/lib/supabase/browser";

const MAX_BYTES = 20 * 1024 * 1024;

function LiveField({ id }: { id: string }) {
  return (
    <Field label={<Label htmlFor={id}>Live link, if you have one</Label>}>
      <Input id={id} name="live" type="url" placeholder="https://your-project.app" />
    </Field>
  );
}

export function SubmitForm({ cohortId, projectId, userId }: { cohortId: string; projectId: string; userId: string }) {
  // The file goes straight to storage; the server only receives where it landed.
  const upload = async (state: FormState, data: FormData): Promise<FormState> => {
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) return { error: "Choose a zip file." };
    if (!/\.zip$/i.test(file.name)) return { error: "The file must be a .zip file." };
    if (file.size > MAX_BYTES) return { error: "The zip must be under 20 MB. Leave out installed packages and media." };
    const path = `${cohortId}/${userId}/${crypto.randomUUID()}.zip`;
    const { error } = await browserClient().storage.from("submissions").upload(path, file, { contentType: "application/zip", upsert: false });
    if (error) {
      console.error(error);
      return { error: "The upload did not finish. Check your connection and try again." };
    }
    data.delete("file");
    data.set("path", path);
    return submitZip(state, data);
  };
  const hidden = <><input type="hidden" name="cohortId" value={cohortId} /><input type="hidden" name="projectId" value={projectId} /></>;

  return (
    <Tabs defaultValue="link">
      <TabsList aria-label="How to send your work">
        <TabsTrigger value="link">GitHub link</TabsTrigger>
        <TabsTrigger value="zip">Zip file</TabsTrigger>
      </TabsList>
      <TabsContent value="link">
        <ActionForm action={submitProject}>
          {hidden}
          <Field label={<Label htmlFor="repo">Public GitHub repository or gist link</Label>}>
            <Input id="repo" name="repo" type="url" required placeholder="https://github.com/you/project" />
          </Field>
          <LiveField id="live" />
          <Button size="lg" className="self-start">Launch my project</Button>
        </ActionForm>
      </TabsContent>
      <TabsContent value="zip">
        <ActionForm action={upload}>
          {hidden}
          <Field label={<Label htmlFor="file">Zip of your project, up to 20 MB</Label>} hint="Leave out node_modules, build folders and any file holding secrets.">
            <Input id="file" name="file" type="file" accept=".zip,application/zip" required className="py-3" />
          </Field>
          <LiveField id="zip-live" />
          <Button size="lg" className="self-start">Upload and launch</Button>
        </ActionForm>
      </TabsContent>
    </Tabs>
  );
}
