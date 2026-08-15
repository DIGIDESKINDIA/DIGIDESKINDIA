// File: lib/api/pdf.ts

export interface PDFApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  downloadUrl?: string;
}

async function postForm<T>(
  endpoint: string,
  form: FormData
): Promise<PDFApiResponse<T>> {
  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      json.message ?? "Request failed."
    );
  }

  return json;
}

export const PDFApi = {
  merge(form: FormData) {
    return postForm(
      "/api/pdf/merge",
      form
    );
  },

  split(form: FormData) {
    return postForm(
      "/api/pdf/split",
      form
    );
  },

  compress(form: FormData) {
    return postForm(
      "/api/pdf/compress",
      form
    );
  },

  rotate(form: FormData) {
    return postForm(
      "/api/pdf/rotate",
      form
    );
  },

  extract(form: FormData) {
    return postForm(
      "/api/pdf/extract",
      form
    );
  },

  watermark(form: FormData) {
    return postForm(
      "/api/pdf/watermark",
      form
    );
  },

  encrypt(form: FormData) {
    return postForm(
      "/api/pdf/encrypt",
      form
    );
  },

  decrypt(form: FormData) {
    return postForm(
      "/api/pdf/decrypt",
      form
    );
  },

  thumbnail(form: FormData) {
    return postForm(
      "/api/pdf/thumbnail",
      form
    );
  },

  convert(form: FormData) {
    return postForm(
      "/api/pdf/convert",
      form
    );
  },

  ocr(form: FormData) {
    return postForm(
      "/api/pdf/ocr",
      form
    );
  },
};