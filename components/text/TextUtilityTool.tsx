"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { Download, FileText, UploadCloud } from "lucide-react";
import { analyzeText } from "@/lib/tools/word-counter/wordCounter";
import { saveAs } from "file-saver";

type Mode = "words" | "case";

type Props = { mode: Mode };

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);
}

export default function TextUtilityTool({ mode }: Props) {
  const [value, setValue] = useState("");
  const [convertedValue, setConvertedValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileMessage, setFileMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transformed = mode === "case" ? value : "";
  const statistics = useMemo(() => analyzeText(value), [value]);

  async function extractPdfText(file: File): Promise<string> {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
    const data = await file.arrayBuffer();
    const document = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }

    return pages.join("\n\n").trim();
  }

  async function extractDocxText(file: File): Promise<string> {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const documentXml = await zip.file("word/document.xml")?.async("text");

    if (!documentXml) {
      throw new Error("This Word file does not contain readable document text.");
    }

    const xml = new DOMParser().parseFromString(documentXml, "application/xml");
    return Array.from(xml.getElementsByTagName("w:p"))
      .map((paragraph) => Array.from(paragraph.getElementsByTagName("w:t")).map((text) => text.textContent ?? "").join(""))
      .join("\n")
      .trim();
  }

  async function readFile(file: File) {
    setFileMessage("");
    setIsReadingFile(true);

    try {
      const extension = file.name.toLowerCase().split(".").pop();
      let extractedText = "";

      if (extension === "txt") {
        extractedText = await file.text();
      } else if (extension === "pdf") {
        extractedText = await extractPdfText(file);
      } else if (extension === "docx") {
        extractedText = await extractDocxText(file);
      } else {
        throw new Error("Please upload a PDF, DOCX, or TXT file.");
      }

      if (!extractedText) {
        throw new Error("No selectable text was found. Scanned PDFs need OCR before counting.");
      }

      setValue(extractedText);
      setConvertedValue(mode === "case" ? extractedText : "");
      setFileMessage(`${file.name} loaded successfully.`);
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : "Could not read this file.");
    } finally {
      setIsReadingFile(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void readFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  }

  async function downloadAsDocx() {
    const JSZip = (await import("jszip")).default;
    const paragraphs = value.split(/\r?\n/).map((paragraph) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`).join("");
    const zip = new JSZip();

    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`);
    zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);

    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    saveAs(blob, "case-converted-text.docx");
  }

  async function downloadAsPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const lines = pdf.splitTextToSize(value, pageWidth - 96);
    let y = 48;

    pdf.setFontSize(12);
    for (const line of lines) {
      if (y > pageHeight - 48) {
        pdf.addPage();
        y = 48;
      }
      pdf.text(line, 48, y);
      y += 18;
    }

    saveAs(pdf.output("blob"), "case-converted-text.pdf");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">DigiDesk Utilities</p>
          <h1 className="mt-3 text-4xl font-black">{mode === "words" ? "Word Counter" : "Case Converter"}</h1>
        </div>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          {
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`mb-4 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors ${isDragging ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40" : "border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/60 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:bg-slate-800"}`}
            >
              <UploadCloud className="h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" />
              <span>
                <strong className="block text-sm text-slate-900 dark:text-slate-100">{isReadingFile ? "Reading file..." : "Drop a file here or click to upload"}</strong>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">PDF, DOCX, or TXT files</span>
              </span>
              <FileText className="hidden h-5 w-5 text-slate-400 sm:block" aria-hidden="true" />
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onClick={(event) => event.stopPropagation()} onChange={handleFileChange} className="sr-only" />
            </div>
          }
          <textarea
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (mode === "case") setConvertedValue(event.target.value);
            }}
            placeholder={mode === "words" ? "Type or paste your text here" : "Enter text to convert"}
            aria-label={mode === "words" ? "Text to analyze" : "Text to convert"}
            className="min-h-[260px] w-full resize-y rounded-2xl border border-slate-300 bg-white p-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900"
          />
          {fileMessage ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300" role="status">{fileMessage}</p> : null}
          {mode === "words" ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-4" aria-live="polite">
              {[
                ["Words", statistics.words],
                ["Characters", statistics.characters],
                ["Characters (no spaces)", statistics.charactersNoSpaces],
                ["Sentences", statistics.sentences],
                ["Paragraphs", statistics.paragraphs],
                ["Reading time", `${statistics.readingTimeMinutes} min`],
                ["Avg. words / sentence", statistics.averageWordsPerSentence],
                ["Avg. characters / word", statistics.averageCharactersPerWord],
              ].map(([label, result], index) => (
                <div key={String(label)} className={`rounded-xl p-4 ${index === 0 ? "bg-blue-50 dark:bg-blue-950/50" : "bg-slate-50 dark:bg-slate-800"}`}>
                  <strong className={`block text-2xl ${index === 0 ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-slate-100"}`}>{result}</strong>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {["UPPERCASE", "lowercase", "Sentence Case Fixer"].map((label) => <button key={label} type="button" onClick={() => {
                  const result = label === "UPPERCASE"
                    ? value.toUpperCase()
                    : label === "lowercase"
                      ? value.toLowerCase()
                      : value.toLocaleLowerCase().replace(/(^|[.!?]\s+|\n+)([^\p{L}]*)(\p{L})/gu, (_, separator, prefix, letter) => `${separator}${prefix}${letter.toLocaleUpperCase()}`);
                  setValue(result);
                  setConvertedValue(result);
                }} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-bold text-blue-700 hover:bg-blue-100">{label}</button>)}
              <output className="col-span-full whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm">{convertedValue || transformed || "Converted text will appear here."}</output>
                <div className="col-span-full grid gap-3 sm:grid-cols-2">
                  <button type="button" disabled={!value || isReadingFile} onClick={() => void downloadAsDocx()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <Download className="h-4 w-4" aria-hidden="true" /> Download DOCX
                  </button>
                  <button type="button" disabled={!value || isReadingFile} onClick={() => void downloadAsPdf()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <Download className="h-4 w-4" aria-hidden="true" /> Download PDF
                  </button>
                </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
