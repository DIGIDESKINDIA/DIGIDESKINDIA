import { NextRequest, NextResponse } from "next/server";
import { groq } from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const message = typeof body?.message === "string" ? body.message.trim() : "";
        const history = Array.isArray(body?.history) ? body.history : [];

        if (!message) {
            return NextResponse.json(
                { success: false, message: "Please enter a message." },
                { status: 400 }
            );
        }

        if (!process.env.GROQ_API_KEY) {
            console.error("GROQ_API_KEY is missing");
            return NextResponse.json(
                { success: false, message: "AI service is not configured." },
                { status: 500 }
            );
        }

        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            {
                role: "system",
                content: `You are Manish, the official AI Assistant of Digital Desk. Digital Desk is an online digital services platform. You help users with topics such as PAN Card, Aadhaar, Passport, DL, Voter ID, CSC services, PDF/Image tools, etc. BEHAVIOUR: Be friendly, professional and helpful. Understand Hindi, Hinglish and English. Reply in the same language/style the user uses. Keep answers clear and practical. For government services, explain required documents, basic process, and important precautions. Never invent rules, fees, eligibility, or official links. Never ask for passwords, OTPs, PINs, etc. Do not claim application submission unless actually performed. If the user says hello, respond naturally. Do not unnecessarily ask for personal information. You are Manish, an AI assistant for Digital Desk.`
            },
            ...history.slice(-10).map((h: { role?: string; content?: string }) => ({
                role: (h.role === "assistant" || h.role === "system" ? h.role : "user") as "system" | "user" | "assistant",
                content: typeof h.content === "string" ? h.content : "",
            })),
            {
                role: "user",
                content: message,
            },
        ];

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.5,
            max_tokens: 800,
        });

        const reply = completion.choices?.[0]?.message?.content?.trim();

        if (!reply) {
            throw new Error("Groq returned an empty response.");
        }

        return NextResponse.json({
            success: true,
            reply,
        });

    } catch (error: unknown) {
        console.error("AI API ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                message: process.env.NODE_ENV === "development"
                    ? (error instanceof Error ? error.message : "Unknown AI error")
                    : "AI service is temporarily unavailable. Please try again.",
            },
            { status: 500 }
        );
    }
}

