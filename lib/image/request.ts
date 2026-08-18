import { ValidationError } from "@/lib/pdf/errors";

import {
  type ImageUploadFile,
  validateImageFile,
} from "./validation";

export async function readSingleImageFile(
  formData: FormData,
  fieldName = "file"
): Promise<ImageUploadFile> {
  const upload = formData.get(fieldName) as File | null;

  if (!upload) {
    throw new ValidationError("Image file is required.");
  }

  const buffer = Buffer.from(await upload.arrayBuffer());

  const file: ImageUploadFile = {
    name: upload.name,
    type: upload.type,
    size: upload.size,
    buffer,
  };

  validateImageFile(file);

  return file;
}

export async function readMultipleImageFiles(
  formData: FormData,
  fieldName = "files"
): Promise<ImageUploadFile[]> {
  const uploads = formData.getAll(fieldName) as File[];

  if (!uploads.length) {
    throw new ValidationError("At least one image is required.");
  }

  const files: ImageUploadFile[] = [];

  for (const upload of uploads) {
    if (!upload) {
      continue;
    }

    const file: ImageUploadFile = {
      name: upload.name,
      type: upload.type,
      size: upload.size,
      buffer: Buffer.from(await upload.arrayBuffer()),
    };

    validateImageFile(file);
    files.push(file);
  }

  if (!files.length) {
    throw new ValidationError("At least one image is required.");
  }

  return files;
}
