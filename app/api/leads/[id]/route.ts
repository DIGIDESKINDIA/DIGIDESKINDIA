import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { isAuthenticated } from "@/lib/auth/session";

export const runtime = "nodejs";

const UpdateLeadSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  mobile: z
    .string()
    .trim()
    .min(10)
    .max(15)
    .optional(),
  service: z.string().trim().min(1).max(200).optional(),
  message: z.string().trim().max(2000).optional().nullable(),
  status: z
    .enum(["New", "Contacted", "Qualified", "Converted", "Lost"])
    .optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;

    await connectDB();

    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("[LEAD_GET]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lead.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const validatedData = UpdateLeadSchema.parse(body);

    await connectDB();

    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { $set: validatedData },
      { new: true }
    );

    if (!updatedLead) {
      return NextResponse.json(
        { success: false, message: "Lead not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead,
    });
  } catch (error) {
    console.error("[LEAD_PUT]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: error.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update lead.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;

    await connectDB();

    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return NextResponse.json(
        { success: false, message: "Lead not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lead deleted successfully.",
    });
  } catch (error) {
    console.error("[LEAD_DELETE]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete lead.",
      },
      { status: 500 }
    );
  }
}
