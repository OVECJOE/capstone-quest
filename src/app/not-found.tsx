import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div><h1 className="text-4xl">There is nothing on this island</h1><p>The page may have moved, or you may not have access to it.</p></div>
      <Link href="/" className="font-extrabold underline underline-offset-4">Back to the start</Link>
    </main>
  );
}
