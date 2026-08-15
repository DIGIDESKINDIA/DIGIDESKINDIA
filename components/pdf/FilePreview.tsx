"use client";

import { useState } from "react";

import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Maximize2,
    Loader2,
} from "lucide-react";

import {
    Document,
    Page,
    pdfjs,
} from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FilePreviewProps {

    file: string | File;

    className?: string;

}

export default function FilePreview({

    file,

    className,

}: FilePreviewProps) {

    const [pages, setPages] =
        useState(0);

    const [page, setPage] =
        useState(1);

    const [prevFile, setPrevFile] = useState(file);
    if (file !== prevFile) {
        setPrevFile(file);
        setPage(1);
    }

    const [zoom, setZoom] =
        useState(1);

    const [rotation, setRotation] =
        useState(0);

    const [loading, setLoading] =
        useState(true);

    return (

        <div
            className={`rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
        >

            {/* Toolbar */}

            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">

                <div className="flex items-center gap-2">

                    <button
                        onClick={() =>
                            setZoom((z) =>
                                Math.max(
                                    0.5,
                                    z - 0.25
                                )
                            )
                        }
                        className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ZoomOut size={18} />
                    </button>

                    <button
                        onClick={() =>
                            setZoom((z) =>
                                Math.min(
                                    3,
                                    z + 0.25
                                )
                            )
                        }
                        className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ZoomIn size={18} />
                    </button>

                    <button
                        onClick={() =>
                            setRotation(
                                (r) =>
                                    (r + 90) % 360
                            )
                        }
                        className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <RotateCw size={18} />
                    </button>

                </div>

                <div className="font-semibold">

                    {page} / {pages || "--"}

                </div>

                <button
                    onClick={() => {

                        const el =
                            document.getElementById(
                                "pdf-preview"
                            );

                        el?.requestFullscreen();

                    }}
                    className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >

                    <Maximize2 size={18} />

                </button>

            </div>

            {/* Preview */}

            <div
                id="pdf-preview"
                className="flex min-h-[650px] items-center justify-center overflow-auto bg-slate-100 p-8 dark:bg-slate-950"
            >

                <Document
                    file={file}
                    loading={
                        <Loader2
                            className="animate-spin"
                            size={40}
                        />
                    }
                    onLoadSuccess={({
                        numPages,
                    }) => {

                        setPages(
                            numPages
                        );

                        setLoading(
                            false
                        );

                    }}
                >

                    <Page
                        pageNumber={page}
                        rotate={
                            rotation
                        }
                        scale={zoom}
                    />

                </Document>

            </div>

            {/* Footer */}

            <div className="flex items-center justify-center gap-6 border-t border-slate-200 p-5 dark:border-slate-800">

                <button
                    disabled={page <= 1}
                    onClick={() =>
                        setPage(
                            page - 1
                        )
                    }
                    className="rounded-xl border px-4 py-2 disabled:opacity-40"
                >

                    <ChevronLeft
                        size={18}
                    />

                </button>

                <span className="font-semibold">

                    Page {page}

                </span>

                <button
                    disabled={
                        page >= pages
                    }
                    onClick={() =>
                        setPage(
                            page + 1
                        )
                    }
                    className="rounded-xl border px-4 py-2 disabled:opacity-40"
                >

                    <ChevronRight
                        size={18}
                    />

                </button>

            </div>

            {loading && (

                <div className="absolute inset-0 flex items-center justify-center">

                    <Loader2
                        className="animate-spin text-blue-600"
                        size={48}
                    />

                </div>

            )}

        </div>

    );

}