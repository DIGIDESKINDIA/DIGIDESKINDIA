"use client";

import { useMemo, useState } from "react";

import useUpload from "@/hooks/useUpload";
import usePDFTask from "@/hooks/usePDFTask";
import useDownload from "@/hooks/useDownload";

import type { MergeSettingsValues } from "@/components/pdf/merge/MergeSettings";

const defaultSettings: MergeSettingsValues = {
  outputName: "merged.pdf",
  optimize: true,
  linearize: true,
  bookmarks: true,
  metadata: true,
  compression: "medium",
  pdfVersion: "auto",
};

export default function useMergePDF() {
  const upload = useUpload();

  const task = usePDFTask({
    endpoint: "merge",
  });

  const download = useDownload();

  const [settings, setSettings] =
    useState(defaultSettings);

  const totalSize = useMemo(
    () =>
      upload.files.reduce(
        (sum, file) =>
          sum + file.file.size,
        0
      ),
    [upload.files]
  );

  const totalFiles =
    upload.files.length;

  async function merge() {
    if (!upload.files.length)
      return;

    const form = new FormData();

    upload.files.forEach((item) => {
      form.append(
        "files",
        item.file
      );
    });

    form.append(
      "outputName",
      settings.outputName
    );

    form.append(
      "compression",
      settings.compression
    );

    form.append(
      "pdfVersion",
      settings.pdfVersion
    );

    form.append(
      "optimize",
      String(settings.optimize)
    );

    form.append(
      "linearize",
      String(settings.linearize)
    );

    form.append(
      "bookmarks",
      String(settings.bookmarks)
    );

    form.append(
      "metadata",
      String(settings.metadata)
    );

    await task.run(form);
  }

  async function save() {
    if (
      !task.result?.downloadUrl
    )
      return;

    await download.download({
      url: task.result.downloadUrl,
      filename:
        settings.outputName,
    });
  }

  return {
    upload,

    task,

    download,

    settings,

    setSettings,

    totalFiles,

    totalSize,

    merge,

    save,
  };
}