"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";

type AvatarUploadProps = {
  userId: string;
  name: string;
  currentUrl: string | null;
};

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AvatarUpload({ userId, name, currentUrl }: AvatarUploadProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WebP image");
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("Image must be under 2MB");
      return;
    }

    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${userId}/avatar.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Add cache-busting param
    const url = `${publicUrl}?t=${Date.now()}`;

    // Update profile
    await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", userId);

    setPreviewUrl(url);
    setUploading(false);
    router.refresh();
  }

  function handleRemove() {
    setError("");
    setPreviewUrl(null);

    const supabase = createClient();
    supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId)
      .then(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-[16px]">
      <div className="relative">
        <Avatar name={name} imageUrl={previewUrl} size={56} />
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
            <div className="w-[16px] h-[16px] border-2 border-[#E5654E] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-[13px] font-medium text-[#111111] cursor-pointer bg-transparent border border-[#E2E8F0] rounded-lg px-[12px] py-[6px] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
          >
            {previewUrl ? "Change photo" : "Upload photo"}
          </button>
          {previewUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-[13px] text-[#94A3B8] hover:text-red-500 cursor-pointer bg-transparent border-none p-0 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        <span className="text-[11px] text-[#94A3B8]">
          JPG, PNG, or WebP. Max 2MB.
        </span>
        {error && (
          <span className="text-[11px] text-red-500">{error}</span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
