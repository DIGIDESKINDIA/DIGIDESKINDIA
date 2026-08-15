"use client";

import MergeFileItem from "./MergeFileItem";

interface Props {
  files: File[];
  setFiles: (files: File[]) => void;
}

export default function MergeFileList({
  files,
  setFiles,
}: Props) {

  if (!files.length) return null;

  return (

    <div className="mt-8 space-y-4">

      {files.map((file, index) => (

        <MergeFileItem
          key={`${file.name}-${index}`}
          file={file}
          index={index}
          total={files.length}
          onRemove={() =>
            setFiles(
              files.filter((_, i) => i !== index)
            )
          }
        />

      ))}

    </div>

  );
}