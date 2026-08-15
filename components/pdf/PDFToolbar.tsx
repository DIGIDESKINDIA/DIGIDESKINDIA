"use client";

import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  Printer,
  Share2,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  Monitor,
  Columns,
} from "lucide-react";

export interface PDFToolbarProps {
  zoom: number;
  canUndo?: boolean;
  canRedo?: boolean;
  fullscreen?: boolean;
  disabled?: boolean;

  onZoomIn(): void;
  onZoomOut(): void;

  onRotateLeft(): void;
  onRotateRight(): void;

  onUndo?(): void;
  onRedo?(): void;

  onDownload?(): void;
  onPrint?(): void;
  onShare?(): void;

  onFitWidth?(): void;
  onFitPage?(): void;

  onToggleFullscreen?(): void;

  rightSlot?: React.ReactNode;
}

export default function PDFToolbar({
  zoom,

  canUndo = false,
  canRedo = false,

  fullscreen = false,
  disabled = false,

  onZoomIn,
  onZoomOut,

  onRotateLeft,
  onRotateRight,

  onUndo,
  onRedo,

  onDownload,
  onPrint,
  onShare,

  onFitWidth,
  onFitPage,

  onToggleFullscreen,

  rightSlot,
}: PDFToolbarProps) {
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="flex flex-wrap items-center gap-2">

        <ToolbarButton
          tooltip="Undo"
          disabled={!canUndo || disabled}
          onClick={onUndo}
        >
          <Undo2 size={18} />
        </ToolbarButton>

        <ToolbarButton
          tooltip="Redo"
          disabled={!canRedo || disabled}
          onClick={onRedo}
        >
          <Redo2 size={18} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          tooltip="Zoom Out"
          disabled={disabled}
          onClick={onZoomOut}
        >
          <ZoomOut size={18} />
        </ToolbarButton>

        <div className="min-w-[80px] text-center text-sm font-bold">

          {Math.round(zoom * 100)}%

        </div>

        <ToolbarButton
          tooltip="Zoom In"
          disabled={disabled}
          onClick={onZoomIn}
        >
          <ZoomIn size={18} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          tooltip="Rotate Left"
          disabled={disabled}
          onClick={onRotateLeft}
        >
          <RotateCcw size={18} />
        </ToolbarButton>

        <ToolbarButton
          tooltip="Rotate Right"
          disabled={disabled}
          onClick={onRotateRight}
        >
          <RotateCw size={18} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          tooltip="Fit Width"
          disabled={disabled}
          onClick={onFitWidth}
        >
          <Columns size={18} />
        </ToolbarButton>

        <ToolbarButton
          tooltip="Fit Page"
          disabled={disabled}
          onClick={onFitPage}
        >
          <Monitor size={18} />
        </ToolbarButton>

      </div>

      <div className="flex flex-wrap items-center gap-2">

        {rightSlot}

        {onPrint && (
          <ToolbarButton
            tooltip="Print"
            disabled={disabled}
            onClick={onPrint}
          >
            <Printer size={18} />
          </ToolbarButton>
        )}

        {onShare && (
          <ToolbarButton
            tooltip="Share"
            disabled={disabled}
            onClick={onShare}
          >
            <Share2 size={18} />
          </ToolbarButton>
        )}

        {onDownload && (
          <ToolbarButton
            tooltip="Download"
            disabled={disabled}
            onClick={onDownload}
            primary
          >
            <Download size={18} />
          </ToolbarButton>
        )}

        {onToggleFullscreen && (
          <ToolbarButton
            tooltip="Fullscreen"
            disabled={disabled}
            onClick={onToggleFullscreen}
          >
            {fullscreen ? (
              <Minimize2 size={18} />
            ) : (
              <Maximize2 size={18} />
            )}
          </ToolbarButton>
        )}

      </div>

    </div>
  );
}

interface ButtonProps {
  children: React.ReactNode;
  tooltip: string;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function ToolbarButton({
  children,
  tooltip,
  primary = false,
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      title={tooltip}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 transition-all

${
  primary
    ? "border-blue-700 bg-blue-700 text-white hover:bg-blue-800"
    : "border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
}

disabled:cursor-not-allowed
disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="mx-1 h-8 w-px bg-slate-300 dark:bg-slate-700" />
  );
}