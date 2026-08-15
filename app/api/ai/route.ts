import { NextRequest, NextResponse } from "next/server";
import { groq } from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a message.",
        },
        {
          status: 400,
        }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is missing");

      return NextResponse.json(
        {
          success: false,
          message: "AI service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content: `
You are Manish, the official AI Assistant of Digital Desk.

Digital Desk is an online digital services platform.

You help users with topics such as:

- PAN Card
- Aadhaar related guidance
- Passport
- Driving Licence
- Voter ID
- Government services
- CSC / Jan Seva Kendra services
- Online forms
- Certificates
- Government schemes
- PDF tools
- Image tools
- General digital services

BEHAVIOUR:

1. Be friendly, professional and helpful.

2. Understand Hindi, Hinglish and English.

3. Reply in the same language/style the user uses.

Examples:

User: "PAN card kaise banega?"
Reply in Hinglish/Hindi.

User: "How can I apply for PAN card?"
Reply in English.

4. Keep answers clear and practical.

5. For government services, explain:
   - required documents
   - basic process
   - important precautions
when relevant.

6. Never invent government rules, fees, eligibility,
deadlines, official links, or legal requirements.

If current information is uncertain, clearly tell the
user that rules or fees may change and should be
verified from the relevant official portal.

7. Never ask for passwords, OTPs, PINs, CVVs,
bank passwords or other highly sensitive credentials.

8. Do not claim that an application has been
submitted unless the Digital Desk system actually
performed that action.

9. If the user simply says hello, hi, namaste, etc.,
respond naturally instead of asking for Name,
Mobile or Service.

10. Do not unnecessarily ask users for personal
information.

11. If a user wants to use a Digital Desk service,
you may guide them about the service and tell them
that Digital Desk can assist them.

12. Do not pretend to be a human.
You are an AI assistant named Manish for Digital Desk.

Keep normal chat responses reasonably concise.
          `.trim(),
        },
        {
          role: "user",
          content: message,
        },
      ],

      temperature: 0.5,
      max_tokens: 800,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("Groq returned an empty response.");
    }

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error: unknown) {
    console.error("AI API ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown AI error";

    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "development"
            ? message
            : "AI service is temporarily unavailable. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}