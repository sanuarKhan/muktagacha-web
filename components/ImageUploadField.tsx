"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { compressImage, uploadToCloudinary } from "@/lib/image-upload";
import type { CloudinaryUploadSignature } from "@/lib/types";

export default function ImageUploadField({
  value,
  onChange,
  label = "Photo",
  aspect = "square",
  size = "lg",
  getUploadSignature,
  onRemove,
}: {
  value: string | null | undefined;
  onChange: (url: string) => void;
  label?: string;
  aspect?: "square" | "wide";
  // "sm" = compact tile for multi-image grids (product photo slots);
  // "lg" = the original full-width field (org logo, single hero image).
  size?: "sm" | "lg";
  // When provided, uploads go to real object storage (Cloudinary) via
  // this signed-upload fetcher instead of storing a base64 blob. Use
  // this for anything that needs to scale (product photos); omit it
  // for small one-off images (org logo) where base64 is still fine.
  getUploadSignature?: () => Promise<CloudinaryUploadSignature>;
  // When provided, shows a small "x" on a filled slot so a vendor can
  // delete one photo out of a multi-image set without clearing all of
  // them.
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (getUploadSignature) {
        const url = await uploadToCloudinary(file, getUploadSignature);
        onChange(url);
      } else {
        const compressed = await compressImage(file);
        onChange(compressed);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not process that image. Try a different photo.",
      );
    } finally {
      setBusy(false);
    }
  }

  const sizeClass =
    size === "sm" ? "w-20 h-20" : aspect === "square" ? "w-[180px] max-w-full aspect-square" : "w-full aspect-[16/9]";
  const pick = () => inputRef.current?.click();

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
          {label}
        </label>
      )}
      <div className={size === "sm" ? "relative inline-block" : "relative block"}>
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          aria-label={value ? `Change ${label || "photo"}` : `Add ${label || "photo"}`}
          className={`relative overflow-hidden rounded-[14px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-cream-100)] hover:border-[var(--color-emerald-600)] transition-colors ${sizeClass} flex items-center justify-center`}
        >
          {value ? (
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-[var(--color-ink-500)] px-2 text-center">
              <svg
                width={size === "sm" ? "18" : "28"}
                height={size === "sm" ? "18" : "28"}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              {size !== "sm" && (
                <span className="text-xs font-medium">
                  {busy ? "Uploading..." : "Tap to add a photo"}
                </span>
              )}
            </div>
          )}
          {busy && value && (
            <span className="absolute inset-0 bg-black/40 text-white text-xs font-medium flex items-center justify-center">
              Uploading...
            </span>
          )}
        </button>
        {size === "sm" && onRemove && value && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove photo"
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-600"
          >
            ✕
          </button>
        )}
      </div>
      {size !== "sm" && value && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] hover:bg-[var(--color-emerald-100,#d9efe4)] disabled:opacity-50"
          >
            {busy ? "Uploading..." : "Change"}
          </button>
          <button
            type="button"
            onClick={() => (onRemove ? onRemove() : onChange(""))}
            disabled={busy}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // allow choosing the same file again after a change/remove
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
