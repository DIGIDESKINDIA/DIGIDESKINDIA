// File: app/api/pdf/watermark/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { watermarkPDF } from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

const VALID_POSITIONS = [
  "center",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "tile",
] as const;

type Position =
  (typeof VALID_POSITIONS)[number];

export async function POST(
  request: NextRequest
) {
  try {
    const form =
      await request.formData();

    const pdf =
      form.get("file") as File | null;

    const image =
      form.get("image") as File | null;

    const text = String(
      form.get("text") ?? ""
    );

    const opacity = Number(
      form.get("opacity") ?? 0.25
    );

    const rotation = Number(
      form.get("rotation") ?? 45
    );

    const fontSize = Number(
      form.get("fontSize") ?? 40
    );

    const color = String(
      form.get("color") ?? "#888888"
    );

    const position = String(
      form.get("position") ??
        "center"
    ) as Position;

    if (!pdf) {
      return NextResponse.json(
        {
          success: false,
          message:
            "PDF file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !text.trim() &&
      !image
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Provide watermark text or image.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !VALID_POSITIONS.includes(
        position
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid watermark position.",
        },
        {
          status: 400,
        }
      );
    }

    await fs.mkdir(
      UPLOAD_DIR,
      {
        recursive: true,
      }
    );

    const pdfName =
      `${crypto.randomUUID()}-${pdf.name}`;

    const pdfPath =
      path.join(
        UPLOAD_DIR,
        pdfName
      );

    await fs.writeFile(
      pdfPath,
      Buffer.from(
        await pdf.arrayBuffer()
      )
    );

    let imagePath:
      | string
      | undefined;

    if (image) {
      const imageName =
        `${crypto.randomUUID()}-${image.name}`;

      imagePath =
        path.join(
          UPLOAD_DIR,
          imageName
        );

      await fs.writeFile(
        imagePath,
        Buffer.from(
          await image.arrayBuffer()
        )
      );
    }

    const result =
      await watermarkPDF({
        file: {
          id: crypto.randomUUID(),
          name: pdf.name,
          size: pdf.size,
          type: pdf.type,
          path: pdfPath,
        },

        text,

        imagePath,

        opacity,

        rotation,

        fontSize,

        color,

        position,
      });

    return NextResponse.json(
      result
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Watermark failed.",
      },
      {
        status: 500,
      }
    );
  }
}