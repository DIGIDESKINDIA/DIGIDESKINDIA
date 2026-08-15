"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import { Unlock } from "lucide-react";

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

export default function UnlockPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  async function unlockPdf() {
    if (!file) {
      toast.error("Please select a PDF.");
      return;
    }

    if (!password.trim()) {
      toast.error("Enter the current password.");
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

      const response = await fetch("/api/pdf/unlock", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to unlock PDF.");
      }

      const result = await response.blob();
      setBlob(result);
      setProgress(100);
      toast.success("PDF unlocked successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlock failed.");
    } finally {
      setProcessing(false);
    }
  }

  function download() {
    if (!blob) return;
    saveAs(blob, "Unlocked.pdf");
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
      title="Unlock PDF"
      description="Remove password protection from a PDF using the existing security engine."
      icon={<Unlock size={56} />}
    >
      <PdfToolLayout
        title="Unlock PDF"
        description="Upload a password-protected PDF, enter the password, and download the unlocked file."
        sidebar={
          <div className="space-y-6">
            <ProgressBar
              progress={progress}
              status={processing ? "processing" : blob ? "completed" : "idle"}
              title="Unlock Progress"
              description="Removing password protection from your PDF."
            />

            <SettingsPanel
              title="Security Settings"
              description="Enter the password required to open the document."
            >
              <div>
                <label className="mb-2 block text-sm font-semibold">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter current password"
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
            description="Choose a locked PDF document to remove its password."
          />
        )}

        <Toolbar
          title="Unlock PDF"
          processing={processing}
          canProcess={!!file && !!password.trim()}
          onProcess={unlockPdf}
          onReset={reset}
          onDownload={blob ? download : undefined}
        />

        {error && <ErrorCard title="Unlock Failed" message={error} onRetry={unlockPdf} />}

        {blob && (
          <SuccessCard
            title="PDF Unlocked Successfully"
            message="Your unlocked PDF is ready for download."
            fileName="Unlocked.pdf"
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
        title="Unlocking PDF"
        description="Please wait while DigiDesk India removes the password protection."
      />
    </OperationLayout>
  );
}