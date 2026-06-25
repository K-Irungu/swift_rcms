"use client";

import { useRef } from "react";
import { Camera, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type AvatarSectionProps = {
  avatarUrl: string | null;
  initials: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

export function AvatarSection({
  avatarUrl,
  initials,
  onUpload,
  onRemove,
}: AvatarSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB.");
      return;
    }
    onUpload(file);
  };

  return (
    <div className="flex items-center gap-4 pb-4 border-b border-border">
      {/* Avatar circle */}
      <div
        className="relative size-16 rounded-full shrink-0 cursor-pointer group"
        onClick={() => fileRef.current?.click()}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Profile photo"
            className="size-16 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="size-16 rounded-full bg-[#2D64C8]/10 border border-border flex items-center justify-center text-sm font-semibold text-[#2D64C8]">
            {initials}
          </div>
        )}
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="size-4 text-white" />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          JPG or PNG, max 2 MB.
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-7 text-xs gap-1.5 cursor-pointer px-2.5"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3" /> Upload
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="outline"
              className="h-7 text-xs gap-1.5 cursor-pointer px-2.5 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={onRemove}
            >
              <Trash2 className="size-3" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}