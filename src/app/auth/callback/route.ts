import { NextResponse, type NextRequest } from "next/server";
import { safePath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safePath(request.nextUrl.searchParams.get("next"));
  const head = request.headers;
  const origin = `${head.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")}://${head.get("x-forwarded-host") ?? head.get("host")}`;
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error(error);
  }
  return NextResponse.redirect(new URL("/?signin=failed", origin));
}
