"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div><h1 className="text-4xl">That did not load</h1><p>Please try again in a moment.</p></div>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
