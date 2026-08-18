import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth/session";

export const runtime = "nodejs";

function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || process.env.NEXT_PUBLIC_ADMIN_USERNAME || "",
    password: process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required." },
        { status: 400 }
      );
    }

    const { username: adminUser, password: adminPass } = getAdminCredentials();

    if (!adminUser || !adminPass) {
      return NextResponse.json(
        { success: false, message: "Admin credentials are not configured." },
        { status: 500 }
      );
    }

    // Constant-time comparison.
    const userMatch = username.length === adminUser.length
      ? Array.from(username).every((c, i) => c === adminUser[i])
      : false;
    const passMatch = password.length === adminPass.length
      ? Array.from(password).every((c, i) => c === adminPass[i])
      : false;

    if (!userMatch || !passMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid login." },
        { status: 401 }
      );
    }

    const token = await createSessionToken();
    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({ success: true });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("[AUTH_LOGIN]", error);
    return NextResponse.json(
      { success: false, message: "Login failed." },
      { status: 500 }
    );
  }
}
