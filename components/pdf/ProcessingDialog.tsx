"use client";

import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock3,
  X,
} from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

export type ProcessingStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

interface ProcessingDialogProps {
  open: boolean;

  title?: string;

  currentStep: string;

  progress: number;

  status: ProcessingStatus;

  queue?: number;

  eta?: number;

  error?: string;

  onCancel?: () => void;

  onClose?: () => void;
}

export default function ProcessingDialog({
  open,
  title = "Processing Document",
  currentStep,
  progress,
  status,
  queue,
  eta,
  error,
  onCancel,
  onClose,
}: ProcessingDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
        >
          <motion.div
            initial={{
              scale: 0.95,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            exit={{
              scale: 0.95,
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900"
          >
            {status !== "processing" &&
              status !== "uploading" &&
              onClose && (
                <button
                  onClick={onClose}
                  className="absolute right-5 top-5 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              )}

            <div className="flex flex-col items-center text-center">
              <StatusIcon status={status} />

              <h2 className="mt-5 text-2xl font-bold">
                {title}
              </h2>

              <p className="mt-3 text-slate-500">
                {currentStep}
              </p>

              <div className="mt-8 w-full">
                <div className="mb-2 flex justify-between text-sm font-medium">
                  <span>
                    {progress}%
                  </span>

                  {eta &&
                    status !==
                      "completed" &&
                    status !==
                      "failed" && (
                      <span className="flex items-center gap-1">
                        <Clock3
                          size={14}
                        />

                        {eta}s
                      </span>
                    )}
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600"
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: `${progress}%`,
                    }}
                    transition={{
                      duration: 0.4,
                    }}
                  />
                </div>
              </div>

              {queue !==
                undefined &&
                status !==
                  "completed" &&
                status !==
                  "failed" && (
                  <div className="mt-6 rounded-xl bg-slate-100 px-5 py-3 text-sm dark:bg-slate-800">
                    Queue Position :{" "}
                    <strong>
                      #{queue}
                    </strong>
                  </div>
                )}

              {status ===
                "failed" &&
                error && (
                  <div className="mt-6 w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-red-700 dark:border-red-900 dark:bg-red-950">
                    {error}
                  </div>
                )}

              {(status ===
                "processing" ||
                status ===
                  "uploading") &&
                onCancel && (
                  <button
                    onClick={
                      onCancel
                    }
                    className="mt-8 rounded-2xl bg-red-600 px-8 py-3 font-semibold text-white transition hover:bg-red-700"
                  >
                    Cancel
                  </button>
                )}

              {status ===
                "completed" &&
                onClose && (
                  <button
                    onClick={
                      onClose
                    }
                    className="mt-8 rounded-2xl bg-green-600 px-8 py-3 font-semibold text-white transition hover:bg-green-700"
                  >
                    Continue
                  </button>
                )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusIcon({
  status,
}: {
  status: ProcessingStatus;
}) {
  switch (status) {
    case "uploading":
    case "processing":
      return (
        <div className="rounded-full bg-blue-100 p-6 text-blue-700 dark:bg-blue-900/30">
          <Loader2
            size={52}
            className="animate-spin"
          />
        </div>
      );

    case "completed":
      return (
        <div className="rounded-full bg-green-100 p-6 text-green-700 dark:bg-green-900/30">
          <CheckCircle2
            size={52}
          />
        </div>
      );

    case "failed":
      return (
        <div className="rounded-full bg-red-100 p-6 text-red-700 dark:bg-red-900/30">
          <AlertTriangle
            size={52}
          />
        </div>
      );
  }
}