"use client";

import {
    CheckCircle2,
    Clock3,
    Loader2,
    AlertTriangle,
    Trash2,
    Download,
    GripVertical,
    FileText,
} from "lucide-react";

export type UploadStatus =
    | "waiting"
    | "uploading"
    | "processing"
    | "completed"
    | "failed";

export interface QueueItem {

    id: string;

    file: File;

    progress: number;

    status: UploadStatus;

    downloadUrl?: string;

    message?: string;

}

interface UploadQueueProps {

    files: QueueItem[];

    onRemove: (
        id: string
    ) => void;

    onRetry?: (
        id: string
    ) => void;

}

export default function UploadQueue({

    files,

    onRemove,

    onRetry,

}: UploadQueueProps) {

    if (!files.length)
        return null;

    return (

        <div className="space-y-4">

            {files.map((item) => (

                <div

                    key={item.id}

                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"

                >

                    <div className="flex items-start justify-between">

                        <div className="flex items-center gap-4">

                            <GripVertical
                                size={18}
                                className="text-slate-400"
                            />

                            <FileText
                                size={28}
                                className="text-red-600"
                            />

                            <div>

                                <h4 className="font-semibold text-slate-800">

                                    {item.file.name}

                                </h4>

                                <p className="text-xs text-slate-500">

                                    {(item.file.size / 1024 / 1024).toFixed(2)} MB

                                </p>

                            </div>

                        </div>

                        <button

                            onClick={() =>
                                onRemove(item.id)
                            }

                            className="rounded-lg p-2 transition hover:bg-red-50"

                        >

                            <Trash2
                                size={18}
                                className="text-red-600"
                            />

                        </button>

                    </div>

                    <div className="mt-5">

                        <div className="mb-2 flex justify-between text-sm">

                            <span>

                                {statusLabel(item.status)}

                            </span>

                            <span>

                                {item.progress}%

                            </span>

                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">

                            <div

                                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300"

                                style={{
                                    width: `${item.progress}%`,
                                }}

                            />

                        </div>

                    </div>

                    <div className="mt-4 flex items-center justify-between">

                        <StatusIcon
                            status={item.status}
                        />

                        <div className="flex gap-3">

                            {item.status ===
                                "completed" &&
                                item.downloadUrl && (

                                    <a

                                        href={
                                            item.downloadUrl
                                        }

                                        download

                                        className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"

                                    >

                                        <Download
                                            size={16}
                                        />

                                        Download

                                    </a>

                                )}

                            {item.status ===
                                "failed" &&
                                onRetry && (

                                    <button

                                        onClick={() =>
                                            onRetry(item.id)
                                        }

                                        className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"

                                    >

                                        Retry

                                    </button>

                                )}

                        </div>

                    </div>

                </div>

            ))}

        </div>

    );

}

function statusLabel(
    status: UploadStatus
) {

    switch (status) {

        case "waiting":
            return "Waiting";

        case "uploading":
            return "Uploading";

        case "processing":
            return "Processing";

        case "completed":
            return "Completed";

        case "failed":
            return "Failed";

    }

}

function StatusIcon({

    status,

}: {

    status: UploadStatus;

}) {

    switch (status) {

        case "waiting":

            return (

                <div className="flex items-center gap-2 text-slate-500">

                    <Clock3 size={18} />

                    Waiting

                </div>

            );

        case "uploading":

            return (

                <div className="flex items-center gap-2 text-blue-600">

                    <Loader2
                        className="animate-spin"
                        size={18}
                    />

                    Uploading

                </div>

            );

        case "processing":

            return (

                <div className="flex items-center gap-2 text-violet-600">

                    <Loader2
                        className="animate-spin"
                        size={18}
                    />

                    Processing

                </div>

            );

        case "completed":

            return (

                <div className="flex items-center gap-2 text-green-600">

                    <CheckCircle2
                        size={18}
                    />

                    Completed

                </div>

            );

        case "failed":

            return (

                <div className="flex items-center gap-2 text-red-600">

                    <AlertTriangle
                        size={18}
                    />

                    Failed

                </div>

            );

    }

}