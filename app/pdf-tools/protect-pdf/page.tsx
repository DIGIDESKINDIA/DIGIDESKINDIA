"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import { Lock } from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import Toolbar from "@/components/pdf/Toolbar";
import ProgressBar from "@/components/pdf/ProgressBar";
import LoadingOverlay from "@/components/pdf/LoadingOverlay";
import SettingsPanel from "@/components/pdf/SettingsPanel";
import EmptyState from "@/components/pdf/EmptyState";
import ErrorCard from "@/components/pdf/ErrorCard";
import SuccessCard from "@/components/pdf/SuccessCard";

export default function ProtectPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  async function protectPdf() {
    if (!file) {
      toast.error("Please select a PDF.");
      return;
    }

    if (!password.trim()) {
      toast.error("Enter a password.");
      return;
    }

    setProcessing(true);
    setBlob(null);
    setError("");
    setProgress(5);

    try {
      const timer = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + 5));
      }, 150);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", password);

      const response = await fetch("/api/pdf/protect", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to protect PDF.");
      }

      const result = await response.blob();
      setBlob(result);
      setProgress(100);
      toast.success("PDF protected successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Protection failed.");
    } finally {
      setProcessing(false);
    }
  }

  function download() {
    if (!blob) return;
    saveAs(blob, "Protected.pdf");
  }

  function reset() {
    setFile(null);
    setBlob(null);
    setError("");
    setProgress(0);
    setPassword("");
  }

  return (
    <OperationLayout
      title="Protect PDF"
      description="Add password protection to your PDF using the existing PDF security engine."
      icon={<Lock size={56} />}
    >
      <PdfToolLayout
        title="Protect PDF"
        description="Upload a PDF, set a password, and download the protected file."
        sidebar={
          <div className="space-y-6">
            <ProgressBar
              progress={progress}
              status={processing ? "processing" : blob ? "completed" : "idle"}
              title="Protection Progress"
              description="Applying password protection to your PDF."
            />

            <SettingsPanel
              title="Security Settings"
              description="Choose the password for the protected document."
            >
              <div>
                <label className="mb-2 block text-sm font-semibold">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                />
              </div>
            </SettingsPanel>
          </div>
        }
      >
        <UploadZone
          multiple={false}
          maxFiles={1}
          accept=".pdf"
          value={file ? [file] : []}
          onFilesChange={(files) => setFile(files[0] ?? null)}
        />

        {!file && (
          <EmptyState
            title="Upload PDF"
            description="Choose a PDF document to protect with a password."
          />
        )}

        <Toolbar
          title="Protect PDF"
          processing={processing}
          canProcess={!!file && !!password.trim()}
          onProcess={protectPdf}
          onReset={reset}
          onDownload={blob ? download : undefined}
        />

        {error && (
          <ErrorCard title="Protection Failed" message={error} onRetry={protectPdf} />
        )}

        {blob && (
          <SuccessCard
            title="PDF Protected Successfully"
            message="Your protected PDF is ready for download."
            fileName="Protected.pdf"
            fileSize={blob.size}
            buttonText="Download PDF"
            onDownload={download}
            onContinue={reset}
          />
        )}
      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Protecting PDF"
        description="Please wait while DigiDesk India applies password protection."
      />
    </OperationLayout>
  );
}