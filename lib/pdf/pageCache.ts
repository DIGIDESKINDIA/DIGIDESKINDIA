import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

export default class PdfPageCache {
  private pdf: PDFDocumentProxy | null = null;

  private pages = new Map<number, PDFPageProxy>();

  setDocument(pdf: PDFDocumentProxy) {
    this.pdf = pdf;
    this.pages.clear();
  }

  clear() {
    this.pages.clear();
    this.pdf = null;
  }

  async getPage(pageNumber: number): Promise<PDFPageProxy> {
    if (!this.pdf) {
      throw new Error("PDF document is not initialized.");
    }

    const cached = this.pages.get(pageNumber);

    if (cached) {
      return cached;
    }

    const page = await this.pdf.getPage(pageNumber);

    this.pages.set(pageNumber, page);

    return page;
  }

  has(pageNumber: number) {
    return this.pages.has(pageNumber);
  }

  get size() {
    return this.pages.size;
  }
}