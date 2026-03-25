"use client";

import * as React from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // bytes
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  onFiles,
  className,
  disabled = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function validate(fileList: File[]): File[] {
    const valid: File[] = [];
    for (const file of fileList) {
      if (file.size > maxSize) {
        setError(`${file.name} exceeds ${formatSize(maxSize)} limit`);
        return valid;
      }
      valid.push(file);
    }
    setError(null);
    return valid;
  }

  function handleFiles(fileList: FileList) {
    const incoming = Array.from(fileList);
    const validated = validate(incoming);
    if (validated.length > 0) {
      const next = multiple ? [...files, ...validated] : validated;
      setFiles(next);
      onFiles(next);
    }
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onFiles(next);
    setError(null);
  }

  return (
    <div data-slot="file-upload" className={cn("space-y-3", className)}>
      <div
        data-slot="file-upload-dropzone"
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-foreground/10 hover:border-foreground/20",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-8 text-foreground/30" />
        <p className="text-sm text-foreground/60">
          Drop files here or <span className="font-medium text-primary">browse</span>
        </p>
        <p className="text-xs text-foreground/40">Max {formatSize(maxSize)}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div data-slot="file-upload-error" className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div data-slot="file-upload-list" className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-md bg-foreground/5 px-3 py-2"
            >
              <div className="flex-1 truncate text-sm">{file.name}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground/40">{formatSize(file.size)}</span>
                <Button variant="ghost" size="icon-xs" onClick={() => removeFile(i)}>
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { FileUpload };
export type { FileUploadProps };
