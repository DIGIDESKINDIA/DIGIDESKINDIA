"use client";

import { useCallback, useRef } from "react";
import {
    UploadCloud,
    FileText,
    X,
} from "lucide-react";

export interface UploadFile {

    id: string;

    file: File;

    size: number;

    name: string;

    progress?: number;

}

interface Props {

    files: UploadFile[];

    setFiles: (
        files: UploadFile[]
    ) => void;

    multiple?: boolean;

    accept?: string;

    maxSize?: number;

}

export default function PDFUploader({

    files,

    setFiles,

    multiple = true,

    accept = ".pdf",

    maxSize: _maxSize,

}: Props) {

    const inputRef =
        useRef<HTMLInputElement>(null);

    const onFiles = useCallback(

        (list: FileList | null) => {

            if (!list) return;

            const uploaded: UploadFile[] = [];

            Array.from(list).forEach((file) => {

                if (file.size <= 0) {
                    return;
                }

                uploaded.push({

                    id:
                        crypto.randomUUID(),

                    file,

                    size:
                        file.size,

                    name:
                        file.name,

                    progress: 0,

                });

            });

            if (multiple)

                setFiles([
                    ...files,
                    ...uploaded,
                ]);

            else if (uploaded.length)

                setFiles([
                    uploaded[0],
                ]);

        },

        [
            files,
            multiple,
            setFiles,
        ]

    );

    return (

        <div className="space-y-5">

            <div

                onDragOver={(e) =>
                    e.preventDefault()
                }

                onDrop={(e) => {

                    e.preventDefault();

                    onFiles(
                        e.dataTransfer.files
                    );

                }}

                onClick={() =>
                    inputRef.current?.click()
                }

                className="cursor-pointer rounded-3xl border-2 border-dashed border-blue-300 bg-blue-50 p-10 transition hover:border-blue-600 hover:bg-blue-100"

            >

                <div className="flex flex-col items-center gap-4">

                    <UploadCloud

                        className="text-blue-700"

                        size={54}

                    />

                    <h3 className="text-xl font-bold">

                        Drag & Drop PDF Here

                    </h3>

                    <p className="text-sm text-slate-500">

                        or click to browse

                    </p>

                </div>

                <input

                    ref={inputRef}

                    hidden

                    multiple={multiple}

                    accept={accept}

                    type="file"

                    onChange={(e) =>
                        onFiles(
                            e.target.files
                        )
                    }

                />

            </div>

            {files.length > 0 && (

                <div className="space-y-3">

                    {files.map((item) => (

                        <div

                            key={item.id}

                            className="rounded-2xl border bg-white p-4 shadow"

                        >

                            <div className="flex items-center justify-between">

                                <div className="flex items-center gap-3">

                                    <FileText

                                        className="text-red-600"

                                        size={24}

                                    />

                                    <div>

                                        <h4 className="font-semibold">

                                            {item.name}

                                        </h4>

                                        <p className="text-xs text-slate-500">

                                            {(
                                                item.size /
                                                1024 /
                                                1024
                                            ).toFixed(
                                                2
                                            )}{" "}
                                            MB

                                        </p>

                                    </div>

                                </div>

                                <button

                                    onClick={() =>

                                        setFiles(

                                            files.filter(

                                                (f) =>

                                                    f.id !==
                                                    item.id

                                            )

                                        )

                                    }

                                    className="rounded-lg p-2 hover:bg-red-50"

                                >

                                    <X
                                        size={18}
                                    />

                                </button>

                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">

                                <div

                                    style={{
                                        width: `${item.progress ?? 0}%`,
                                    }}

                                    className="h-full bg-blue-600 transition-all"

                                />

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}