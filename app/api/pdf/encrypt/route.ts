// File: app/api/pdf/encrypt/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { encryptPDF } from "@/lib/pdf";

export const runtime = "nodejs";

const UPLOAD_DIR = "storage/uploads";

const PERMISSIONS = [
  "print",
  "copy",
  "modify",
  "annotate",
] as const;

type Permission =
  (typeof PERMISSIONS)[number];

export async function POST(
  request: NextRequest
) {
  try {
    const form =
      await request.formData();

    const file =
      form.get("file") as File | null;

    const userPassword = String(
      form.get("userPassword") ?? ""
    );

    const ownerPassword = String(
      form.get("ownerPassword") ??
        userPassword
    );

    const permissions =
      form.getAll(
        "permissions"
      ) as string[];

    if (!file) {
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
      !userPassword.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User password is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      userPassword.length < 4
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must contain at least 4 characters.",
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

    const uploadName =
      `${crypto.randomUUID()}-${file.name}`;

    const uploadPath =
      path.join(
        UPLOAD_DIR,
        uploadName
      );

    await fs.writeFile(
      uploadPath,
      Buffer.from(
        await file.arrayBuffer()
      )
    );

    const result =
      await encryptPDF({

        file: {

          id:
            crypto.randomUUID(),

          name:
            file.name,

          size:
            file.size,

          type:
            file.type,

          path:
            uploadPath,

        },

        password:
          userPassword,

        ownerPassword,

        permissions:
          permissions.filter(
            (
              permission
            ): permission is Permission =>
              PERMISSIONS.includes(
                permission as Permission
              )
          ),

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

            : "Encryption failed.",

      },

      {

        status: 500,

      }

    );

  }

}