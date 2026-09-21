import { NextRequest, NextResponse } from "next/server";
import { buildServiceResponseForMessage } from "@/lib/ai/response-builder";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const message = typeof body?.message === "string" ? body.message.trim() : "";

        if (!message) {
            return NextResponse.json(
                { success: false, message: "Please enter a message." },
                { status: 400 }
            );
        }

        const reply = buildServiceResponseForMessage(message);

        return NextResponse.json({
            success: true,
            reply,
        });
    } catch (error: unknown) {
        console.error("AI API ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                message: "AI service is temporarily unavailable. Please try again.",
            },
            { status: 502 }
        );
    }
}

