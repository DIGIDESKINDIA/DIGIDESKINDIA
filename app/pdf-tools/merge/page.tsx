"use client";

import MergeUploader from "@/components/pdf/merge/MergeUploader";
import MergeWorkspace from "@/components/pdf/merge/MergeWorkspace";
import MergeSettings from "@/components/pdf/merge/MergeSettings";

import ProcessingDialog from "@/components/pdf/ProcessingDialog";
import DownloadCard from "@/components/pdf/DownloadCard";

import useMergePDF from "@/hooks/useMergePDF";

export default function MergePDFPage() {

    const merge = useMergePDF();

    return (

        <>

            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
                <div className="flex flex-col gap-3">
                    <h1 className="text-3xl font-bold">Merge PDF</h1>
                    <p className="text-slate-600">Combine multiple PDF files into one document.</p>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        <MergeUploader upload={merge.upload} />
                        <MergeWorkspace
                            files={merge.upload.files}
                            setFiles={merge.upload.setFiles}
                            loading={merge.task.busy}
                            onMerge={merge.merge}
                        />
                    </div>

                    <div className="space-y-6">
                        <MergeSettings value={merge.settings} onChange={merge.setSettings} />
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-semibold">Summary</h2>
                            <div className="mt-4 space-y-2 text-sm text-slate-600">
                                <div>Files: {merge.totalFiles}</div>
                                <div>Size: {(merge.totalSize / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                        </div>
                        {merge.task.completed && merge.task.result?.downloadUrl ? (
                            <DownloadCard
                                fileName={merge.settings.outputName}
                                fileSize={merge.totalSize}
                                downloadUrl={merge.task.result.downloadUrl}
                                onProcessAgain={() => {
                                    merge.upload.clear();
                                    merge.task.reset();
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            </div>

            <ProcessingDialog

                open={merge.task.busy}

                title="Merging PDF"

                currentStep="Combining your PDF files..."

                progress={
                    merge.task.progress
                }

                status={
                    merge.task.status
                }

                onCancel={
                    merge.task.cancel
                }

                onClose={
                    merge.task.reset
                }

            />

        </>

    );

}