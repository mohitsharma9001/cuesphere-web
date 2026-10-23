"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadProfilePhotoAction } from "@/app/actions/profile-actions";

export function AvatarUpload({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (photoUrl: string) => void;
  name: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    // Checked here too: a bigger upload never reaches the action (4 MB request limit).
    if (file.size > 4 * 1024 * 1024 - 64 * 1024) {
      toast.error("Photos must be 4 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await uploadProfilePhotoAction(form);
      if (result.success) onChange(result.photoUrl);
      else toast.error(result.error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-background/40 transition-colors hover:border-primary/50",
          value && "border-solid border-primary/40"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={name} className="size-full object-cover" />
        ) : (
          <Camera className="size-6 text-muted-foreground group-hover:text-primary" />
        )}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100",
            uploading && "opacity-100"
          )}
        >
          {uploading ? <Loader2 className="size-5 animate-spin" /> : "Change"}
        </span>
      </button>
      <div>
        <p className="text-sm font-medium text-foreground">Profile Photo <span className="font-normal text-muted-foreground">(optional)</span></p>
        <p className="text-xs text-muted-foreground">JPG or PNG, at least 300x300px, up to 4 MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
