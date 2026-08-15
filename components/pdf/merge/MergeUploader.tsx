"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface MergeUploaderProps {
    upload: {
        addFiles(files: File[]): void;
    };
}

export default function MergeUploader({ upload }: MergeUploaderProps) {

    const onDrop =
        useCallback(

            (acceptedFiles: File[]) => {

                upload.addFiles(
                    acceptedFiles
                );

            },

            [upload]

        );

    const {

        getRootProps,

        getInputProps,

        isDragActive,

    } = useDropzone({

        onDrop,

        accept: {

            "application/pdf": [
                ".pdf",
            ],

        },

        multiple: true,

    });

    return (

        <Card className="border-dashed">

            <div

                {...getRootProps()}

                className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition

${

isDragActive

? "border-blue-600 bg-blue-50"

: "border-slate-300"

}`}

            >

                <input
                    {...getInputProps()}
                />

                <UploadCloud

                    size={60}

                    className="text-blue-600"

                />

                <h2 className="mt-6 text-2xl font-bold">

                    Drop PDF Files Here

                </h2>

                <p className="mt-3 text-slate-500">

                    or click to browse

                </p>

                <Button

                    className="mt-8"

                    size="lg"

                >

                    Select PDF Files

                </Button>

            </div>

        </Card>

    );

}