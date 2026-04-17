"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { MediaAsset } from "@/lib/ridemax-types";

export type AdminNoticeTone = "success" | "error" | "info";

type NoticeHandler = (tone: AdminNoticeTone, message: string) => void;

type UploadResponse = {
  error?: string;
  message?: string;
  url?: string;
  asset?: MediaAsset;
};

type SharedUploadProps = {
  helpText?: string;
  onAssetUploaded?: (asset: MediaAsset) => void;
  onNotice?: NoticeHandler;
};

type AdminImageUploadFieldProps = SharedUploadProps & {
  value: string;
  onChange: (value: string) => void;
};

type AdminImageGalleryFieldProps = SharedUploadProps & {
  value: string[];
  onChange: (value: string[]) => void;
};

async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as UploadResponse;

  if (!response.ok || !payload.url || !payload.asset) {
    throw new Error(payload.error ?? "Upload failed.");
  }

  return payload;
}

function UploadHint({ helpText }: { helpText?: string }) {
  return (
    <p className="mt-3 text-xs leading-6 text-[#6a433d]">
      {helpText ?? "JPG, PNG, or WebP. Max 2 MB. Images are optimized to WebP and resized to a max width of 1920px."}
    </p>
  );
}

function EmptyPreview({ label }: { label: string }) {
  return (
    <div className="flex aspect-[16/9] items-center justify-center rounded-[1.25rem] border border-dashed border-black/12 bg-white text-center text-sm text-[#6a433d]">
      No {label.toLowerCase()} uploaded yet.
    </div>
  );
}

function UploadButton({
  label,
  disabled,
  multiple,
  onFilesSelected,
}: {
  label: string;
  disabled: boolean;
  multiple?: boolean;
  onFilesSelected: (files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            onFilesSelected(files);
          }
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[#8d120e] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#a51611] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {label}
      </button>
    </>
  );
}

export function AdminImageUploadField({
  value,
  onChange,
  helpText,
  onAssetUploaded,
  onNotice,
}: AdminImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    const file = files.item(0);

    if (!file) {
      return;
    }

    setUploading(true);

    try {
      const payload = await uploadImage(file);
      onChange(payload.url ?? "");

      if (payload.asset) {
        onAssetUploaded?.(payload.asset);
      }

      onNotice?.("success", payload.message ?? "Image uploaded successfully.");
    } catch (error) {
      onNotice?.(
        "error",
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-2 rounded-[1.5rem] border border-black/10 bg-[#faf8f7] p-4">
      {value ? (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-black/10 bg-white">
          <Image
            src={value}
            alt="Uploaded asset preview"
            width={1600}
            height={900}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      ) : (
        <EmptyPreview label="image" />
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <UploadButton
          label={uploading ? "Uploading..." : "Upload Image"}
          disabled={uploading}
          onFilesSelected={handleFiles}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-[#220707] transition hover:-translate-y-0.5 hover:bg-white"
          >
            Remove
          </button>
        ) : null}
      </div>
      <UploadHint helpText={helpText} />
    </div>
  );
}

export function AdminImageGalleryField({
  value,
  onChange,
  helpText,
  onAssetUploaded,
  onNotice,
}: AdminImageGalleryFieldProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const payload = await uploadImage(file);
        if (payload.url) {
          uploadedUrls.push(payload.url);
        }
        if (payload.asset) {
          onAssetUploaded?.(payload.asset);
        }
      }

      onChange([...value, ...uploadedUrls]);
      onNotice?.("success", `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} uploaded successfully.`);
    } catch (error) {
      onNotice?.(
        "error",
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-2 rounded-[1.5rem] border border-black/10 bg-[#faf8f7] p-4">
      {value.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {value.map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[1.25rem] border border-black/10 bg-white">
              <Image
                src={imageUrl}
                alt={`Uploaded asset ${index + 1}`}
                width={1200}
                height={900}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="border-t border-black/8 p-3">
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, imageIndex) => imageIndex !== index))}
                  className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e] transition hover:opacity-75"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPreview label="gallery image" />
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <UploadButton
          label={uploading ? "Uploading..." : "Upload Images"}
          disabled={uploading}
          multiple
          onFilesSelected={handleFiles}
        />
      </div>
      <UploadHint helpText={helpText} />
    </div>
  );
}
