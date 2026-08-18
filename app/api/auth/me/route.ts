import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await isAuthenticated();

  return NextResponse.json({ success: true, authenticated });
}