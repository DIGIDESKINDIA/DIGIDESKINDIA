import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { isAuthenticated } from "@/lib/auth/session";

export const runtime = "nodejs";

// Validation schemas
const CreateLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be under 200 characters"),
  mobile: z.string().trim().min(10, "Mobile must be at least 10 digits").max(15, "Mobile must be under 15 characters"),
  service: z.string().trim().min(1, "Service is required").max(200, "Service must be under 200 characters"),
  message: z.string().trim().max(2000, "Message must be under 2000 characters").optional().nullable(),
});

const UpdateLeadStatusSchema = z.object({
  id: z.string().min(1, "Lead ID is required"),
  status: z.enum(["New", "Contacted", "Qualified", "Converted", "Lost"]).refine(
    (val) => ["New", "Contacted", "Qualified", "Converted", "Lost"].includes(val),
    "Invalid status value"
  ),
});

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    await connectDB();

    const leads = await Lead.find().sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    console.error("[LEADS_GET]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch leads.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validatedData = CreateLeadSchema.parse(body);

    await connectDB();

    const lead = await Lead.create(validatedData);

    return NextResponse.json({
      success: true,
      lead,
    }, { status: 201 });
  } catch (error) {
    console.error("[LEADS_POST]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: error.issues.map(e => ({
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
        message: "Failed to create lead.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validate input
    const validatedData = UpdateLeadStatusSchema.parse(body);

    await connectDB();

    const updatedLead = await Lead.findByIdAndUpdate(
      validatedData.id,
      { status: validatedData.status },
      { new: true }
    );

    if (!updatedLead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead,
    });
  } catch (error) {
    console.error("[LEADS_PUT]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: error.issues.map(e => ({
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

export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { id } = z.object({
      id: z.string().min(1, "Lead ID is required"),
    }).parse(body);

    await connectDB();

    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lead deleted successfully.",
    });
  } catch (error) {
    console.error("[LEADS_DELETE]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: error.issues.map((e: z.ZodIssue) => ({
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
        message: "Failed to delete lead.",
      },
      { status: 500 }
    );
  }
}