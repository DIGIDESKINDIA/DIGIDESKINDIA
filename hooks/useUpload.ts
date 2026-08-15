export type UploadStatus = "waiting" | "uploading" | "completed" | "error";

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: UploadStatus;
}

export interface UseUpload {
  files: UploadFile[];
  selected?: UploadFile;
  totalFiles: number;
  totalSize: number;
  addFiles(files: File[]): void;
  setFiles(files: UploadFile[]): void;
  removeFile(id: string): void;
  clearFiles(): void;
  clear(): void;
  renameFile(id: string, name: string): void;
  duplicateFile(id: string): void;
  replaceFile(id: string, file: File): void;
  moveFile(oldIndex: number, newIndex: number): void;
  selectFile(id: string): void;
  updateProgress(id: string, progress: number): void;
  updateStatus(id: string, status: UploadStatus): void;
}

export default function useUpload() {
  return {
    files: [],
    selected: undefined,
    totalFiles: 0,
    totalSize: 0,
    addFiles: () => {},
    setFiles: () => {},
    removeFile: () => {},
    clearFiles: () => {},
    clear: () => {},
    renameFile: () => {},
    duplicateFile: () => {},
    replaceFile: () => {},
    moveFile: () => {},
    selectFile: () => {},
    updateProgress: () => {},
    updateStatus: () => {},
  } as UseUpload;
}