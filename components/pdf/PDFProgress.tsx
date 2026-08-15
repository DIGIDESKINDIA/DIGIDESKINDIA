"use client";

import {
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Clock3,
} from "lucide-react";

export type ProgressStatus =
    | "waiting"
    | "uploading"
    | "processing"
    | "completed"
    | "failed";

interface PDFProgressProps {

    progress: number;

    status: ProgressStatus;

    title?: string;

    description?: string;

    estimatedSeconds?: number;

    showPercentage?: boolean;

    animated?: boolean;

}

export default function PDFProgress({

    progress,

    status,

    title = "Processing PDF",

    description,

    estimatedSeconds,

    showPercentage = true,

    animated = true,

}: PDFProgressProps) {

    const percentage = Math.min(
        100,
        Math.max(0, progress)
    );

    return (

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between">

                <div>

                    <h3 className="text-lg font-bold text-slate-800">

                        {title}

                    </h3>

                    {description && (

                        <p className="mt-1 text-sm text-slate-500">

                            {description}

                        </p>

                    )}

                </div>

                <StatusBadge
                    status={status}
                />

            </div>

            <div className="mt-6">

                <div className="mb-2 flex items-center justify-between text-sm">

                    <span className="font-medium text-slate-600">

                        {statusLabel(status)}

                    </span>

                    {showPercentage && (

                        <span className="font-bold text-blue-700">

                            {percentage}%

                        </span>

                    )}

                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                    <div

                        style={{
                            width: `${percentage}%`,
                        }}

                        className={`h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-700 transition-all duration-500 ${
                            animated
                                ? "animate-pulse"
                                : ""
                        }`}

                    />

                </div>

            </div>

            {estimatedSeconds !==
                undefined &&
                status !==
                    "completed" &&
                status !==
                    "failed" && (

                    <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">

                        <Clock3
                            size={16}
                        />

                        Approximately{" "}

                        <strong>

                            {estimatedSeconds}

                        </strong>

                        sec remaining

                    </div>

                )}

        </div>

    );

}

function StatusBadge({

    status,

}: {

    status: ProgressStatus;

}) {

    switch (status) {

        case "waiting":

            return (

                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">

                    Waiting

                </div>

            );

        case "uploading":

            return (

                <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">

                    <Loader2
                        className="animate-spin"
                        size={16}
                    />

                    Uploading

                </div>

            );

        case "processing":

            return (

                <div className="flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">

                    <Loader2
                        className="animate-spin"
                        size={16}
                    />

                    Processing

                </div>

            );

        case "completed":

            return (

                <div className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">

                    <CheckCircle2
                        size={16}
                    />

                    Completed

                </div>

            );

        case "failed":

            return (

                <div className="flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">

                    <AlertTriangle
                        size={16}
                    />

                    Failed

                </div>

            );

    }

}

function statusLabel(
    status: ProgressStatus
) {

    switch (status) {

        case "waiting":
            return "Waiting for upload";

        case "uploading":
            return "Uploading file";

        case "processing":
            return "Processing document";

        case "completed":
            return "Completed successfully";

        case "failed":
            return "Processing failed";

    }

}