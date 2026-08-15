"use client";

import {
    useCallback,
    useMemo,
    useState,
} from "react";

import {
    UploadCloud,
    AlertCircle,
    CheckCircle2,
    FileText,
} from "lucide-react";

export interface DropzoneFile {

    id: string;

    file: File;

}

interface PDFDropzoneProps {

    onFiles: (
        files: File[]
    ) => void;

    multiple?: boolean;

    maxFiles?: number;

    maxSize?: number;

    accept?: string[];

}

export default function PDFDropzone({

    onFiles,

    multiple = true,

    maxFiles = 50,

    maxSize = 100 * 1024 * 1024,

    accept = ["application/pdf"],

}: PDFDropzoneProps) {

    const [dragging, setDragging] =
        useState(false);

    const [error, setError] =
        useState("");

    const accepted =
        useMemo(
            () => accept.join(","),
            [accept]
        );

    const validateFiles =
        useCallback(

            (incoming: File[]) => {

                setError("");

                if (
                    incoming.length >
                    maxFiles
                ) {

                    setError(
                        `Maximum ${maxFiles} files allowed.`
                    );

                    return;
                }

                const unique =
                    new Map<
                        string,
                        File
                    >();

                for (const file of incoming) {

                    if (
                        !accept.includes(
                            file.type
                        )
                    ) {

                        setError(
                            `${file.name} is not supported.`
                        );

                        return;
                    }

                    if (
                        file.size >
                        maxSize
                    ) {

                        setError(
                            `${file.name} exceeds the maximum size.`
                        );

                        return;
                    }

                    unique.set(
                        `${file.name}-${file.size}`,
                        file
                    );

                }

                onFiles(
                    Array.from(
                        unique.values()
                    )
                );

            },

            [
                accept,
                maxFiles,
                maxSize,
                onFiles,
            ]

        );

    const handleDrop = (
        e: React.DragEvent<HTMLLabelElement>
    ) => {

        e.preventDefault();

        setDragging(false);

        validateFiles(
            Array.from(
                e.dataTransfer.files
            )
        );

    };

    return (

        <div className="w-full">

            <label
                htmlFor="pdf-upload"
                onDragOver={(e) => {

                    e.preventDefault();

                    setDragging(true);

                }}
                onDragLeave={() =>
                    setDragging(false)
                }
                onDrop={handleDrop}
                className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300

${
    dragging

        ? "border-blue-600 bg-blue-50 scale-[1.01]"

        : "border-slate-300 bg-white hover:border-blue-500 hover:bg-slate-50"
}`}

            >

                {dragging ? (

                    <UploadCloud
                        size={70}
                        className="text-blue-600 animate-bounce"
                    />

                ) : (

                    <FileText
                        size={70}
                        className="text-red-600"
                    />

                )}

                <h2 className="mt-6 text-2xl font-bold">

                    Drop PDF Files Here

                </h2>

                <p className="mt-2 text-sm text-slate-500">

                    or click to browse files

                </p>

                <div className="mt-8 grid grid-cols-3 gap-6 text-center">

                    <div>

                        <CheckCircle2
                            className="mx-auto text-green-600"
                            size={24}
                        />

                        <p className="mt-2 text-xs">

                            Max {maxFiles} Files

                        </p>

                    </div>

                    <div>

                        <CheckCircle2
                            className="mx-auto text-green-600"
                            size={24}
                        />

                        <p className="mt-2 text-xs">

                            {(maxSize / 1024 / 1024).toFixed(0)} MB

                        </p>

                    </div>

                    <div>

                        <CheckCircle2
                            className="mx-auto text-green-600"
                            size={24}
                        />

                        <p className="mt-2 text-xs">

                            Secure Upload

                        </p>

                    </div>

                </div>

                <input

                    id="pdf-upload"

                    hidden

                    type="file"

                    multiple={multiple}

                    accept={accepted}

                    onChange={(e) =>

                        validateFiles(

                            Array.from(
                                e.target.files ?? []
                            )

                        )

                    }

                />

            </label>

            {error && (

                <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

                    <AlertCircle
                        size={18}
                        className="text-red-600"
                    />

                    <p className="text-sm text-red-700">

                        {error}

                    </p>

                </div>

            )}

        </div>

    );

}