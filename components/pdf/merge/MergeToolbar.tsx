"use client";

interface Props {
  files: File[];
  clear: () => void;
}

export default function MergeToolbar({
  files,
  clear,
}: Props) {

  if (!files.length) return null;

  return (

    <div className="mt-8 flex items-center justify-between rounded-2xl bg-white p-5 shadow">

      <div>

        <h3 className="font-bold">

          {files.length} PDF Selected

        </h3>

      </div>

      <button
        onClick={clear}
        className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
      >

        Remove All

      </button>

    </div>

  );
}