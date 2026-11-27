import Link from "next/link";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

export function Header({ chip, signedIn }: { chip?: string; signedIn?: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-[4%] py-5">
      <Link href="/" className="rounded-xl outline-none focus-visible:outline-4 focus-visible:outline-offset-3 focus-visible:outline-ink">
        <Wordmark className="h-12 w-auto max-w-full sm:h-14" />
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        {chip ? <span className="rounded-full border-3 border-ink bg-cream px-4 py-1.5 text-[15px] font-extrabold">{chip}</span> : null}
        {signedIn ? (
          <form action={signOut}><Button variant="dark" size="sm">Sign out</Button></form>
        ) : null}
      </div>
    </header>
  );
}

export function Sky({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-linear-to-b from-green via-[#9BF5B4] to-cream", className)}>{children}</div>;
}

export function Hero({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-[4%] pt-2 pb-6 text-center">
      <h1 className="max-w-5xl text-[clamp(38px,5.6vw,72px)] leading-none tracking-tight text-balance">{title}</h1>
      <p className="text-xl font-bold text-pretty">{text}</p>
    </div>
  );
}
