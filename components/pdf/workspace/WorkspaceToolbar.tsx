"use client";

import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Undo2,
  Redo2,
  Scan,
  Move,
  Maximize2,
} from "lucide-react";
import { ReactNode } from "react";

interface ToolButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

function ToolButton({ icon, label, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
    >
      {icon}
    </button>
  );
}

interface WorkspaceToolbarProps {
  zoom: number;

  onZoomIn(): void;

  onZoomOut(): void;

  onFitWidth?(): void;

  onRotateLeft?(): void;

  onRotateRight?(): void;

  onUndo?(): void;

  onRedo?(): void;

  onPanMode?(): void;

  onSelectMode?(): void;

  onFullscreen?(): void;
}

export default function WorkspaceToolbar({
  zoom,

  onZoomIn,

  onZoomOut,

  onFitWidth,

  onRotateLeft,

  onRotateRight,

  onUndo,

  onRedo,

  onPanMode,

  onSelectMode: _onSelectMode,

  onFullscreen,
}: WorkspaceToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950">

      {/* Undo / Redo */}

      <div className="flex gap-2">

        <ToolButton
          label="Undo"
          icon={<Undo2 size={18} />}
          onClick={onUndo}
        />

        <ToolButton
          label="Redo"
          icon={<Redo2 size={18} />}
          onClick={onRedo}
        />

      </div>

      <div className="h-8 w-px bg-slate-300 dark:bg-slate-700" />

      {/* Zoom */}

      <div className="flex items-center gap-2">

        <ToolButton
          label="Zoom Out"
          icon={<ZoomOut size={18} />}
          onClick={onZoomOut}
        />

        <span className="min-w-[70px] text-center text-sm font-bold">

          {zoom}%

        </span>

        <ToolButton
          label="Zoom In"
          icon={<ZoomIn size={18} />}
          onClick={onZoomIn}
        />

      </div>

      <div className="h-8 w-px bg-slate-300 dark:bg-slate-700" />

      {/* Rotate */}

      <div className="flex gap-2">

        <ToolButton
          label="Rotate Left"
          icon={<RotateCcw size={18} />}
          onClick={onRotateLeft}
        />

        <ToolButton
          label="Rotate Right"
          icon={<RotateCw size={18} />}
          onClick={onRotateRight}
        />

      </div>

      <div className="h-8 w-px bg-slate-300 dark:bg-slate-700" />

      {/* View */}

      <div className="flex gap-2">

        <ToolButton
          label="Fit Width"
          icon={<Scan size={18} />}
          onClick={onFitWidth}
        />

        <ToolButton
          label="Pan Mode"
          icon={<Move size={18} />}
          onClick={onPanMode}
        />

        <ToolButton
          label="Fullscreen"
          icon={<Maximize2 size={18} />}
          onClick={onFullscreen}
        />

      </div>

    </div>
  );
}