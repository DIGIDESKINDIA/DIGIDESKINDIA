import {
  PDFDocument,
} from "pdf-lib";

import {
  ImageToPdfOptions,
} from "./types";

import {
  ValidationError,
  PdfEngineError,
} from "./errors";

const SUPPORTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export async function imageToPdf({
  images,
  pageSize = "Auto",
  margin = 20,
}: ImageToPdfOptions): Promise<Uint8Array> {
  if (!images.length) {
    throw new ValidationError(
      "No image selected."
    );
  }

  const pdf =
    await PDFDocument.create();

  try {
    for (const image of images) {
      if (
        !SUPPORTED_TYPES.includes(
          image.name.endsWith(".png")
            ? "image/png"
            : image.name.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg"
        )
      ) {
        throw new ValidationError(
          `"${image.name}" is not a supported image.`
        );
      }

      let embedded;

      if (
        image.name
          .toLowerCase()
          .endsWith(".png")
      ) {
        embedded =
          await pdf.embedPng(
            image.buffer
          );
      } else {
        embedded =
          await pdf.embedJpg(
            image.buffer
          );
      }

      const imgWidth =
        embedded.width;

      const imgHeight =
        embedded.height;

      let pageWidth =
        imgWidth +
        margin * 2;

      let pageHeight =
        imgHeight +
        margin * 2;

      if (
        pageSize === "A4"
      ) {
        pageWidth = 595;
        pageHeight = 842;
      }

      if (
        pageSize ===
        "Letter"
      ) {
        pageWidth = 612;
        pageHeight = 792;
      }

      const page =
        pdf.addPage([
          pageWidth,
          pageHeight,
        ]);

      const scale = Math.min(
        (pageWidth -
          margin * 2) /
          imgWidth,
        (pageHeight -
          margin * 2) /
          imgHeight
      );

      const width =
        imgWidth * scale;

      const height =
        imgHeight * scale;

      page.drawImage(
        embedded,
        {
          x:
            (pageWidth -
              width) /
            2,
          y:
            (pageHeight -
              height) /
            2,
          width,
          height,
        }
      );
    }

    pdf.setProducer(
      "DigiDesk India"
    );

    pdf.setCreator(
      "DigiDesk India PDF Engine"
    );

    pdf.setCreationDate(
      new Date()
    );

    pdf.setModificationDate(
      new Date()
    );

    return await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
      objectsPerTick: 100,
    });
  } catch (error) {
    throw new PdfEngineError(
      error instanceof Error
        ? error.message
        : "Unable to convert images to PDF."
    );
  }
}