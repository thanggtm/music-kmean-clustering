"use client";
import { useRef, useState, useCallback } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle } from "lucide-react";

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
  error?: string | null;
  fileName?: string | null;
  onReset?: () => void;
}

export default function FileUpload({ onFile, loading, error, fileName, onReset }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const ok = /\.(xlsx|xls|csv)$/i.test(file.name);
      if (!ok) return;
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (fileName) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-orange-500/40 bg-orange-500/10">
        <FileSpreadsheet className="w-5 h-5 text-orange-400 shrink-0" />
        <span className="text-sm text-orange-300 font-medium truncate flex-1">{fileName}</span>
        <button
          onClick={onReset}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
          ${dragging
            ? "border-orange-400 bg-orange-500/10"
            : "border-zinc-600 hover:border-zinc-400 hover:bg-zinc-800/50"
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`p-4 rounded-full transition-colors ${dragging ? "bg-orange-500/20" : "bg-zinc-700/50"}`}>
            <Upload className={`w-7 h-7 ${dragging ? "text-orange-400" : "text-zinc-400"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {dragging ? "Drop your file here" : "Drag & drop your file here"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
          </div>
          <p className="text-xs text-zinc-600">Supports .xlsx, .xls, .csv</p>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/70 rounded-2xl">
            <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 text-xs text-zinc-400 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-zinc-300 text-sm">Expected file format</p>
          <a
            href="/sample-spotify-data.xlsx"
            download
            className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
          >
            Download sample
          </a>
        </div>
        <p>• First row = column headers</p>
        <p>• Required numeric columns: e.g. danceability, energy, tempo, valence…</p>
        <p>• Optional: an <code className="text-orange-400">id</code> column and a name/title column</p>
        <p>• Each subsequent row = one data item (song, product, etc.)</p>
      </div>
    </div>
  );
}
