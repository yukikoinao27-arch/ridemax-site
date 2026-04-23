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
    <div className="flex h-24 items-center justify-center rounded-[1rem] border border-dashed border-black/12 bg-white text-center text-sm text-[#6a433d]">
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
  const [editing, setEditing] = useState(false);

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
      setEditing(false);
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
    <div className="mt-1 rounded-[1.1rem] border border-black/10 bg-[#faf8f7] p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
            {value ? (
              <Image
                key={value}
                src={value}
                alt="Current uploaded image"
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#8a6b65]">
                No image
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-[#220707]">
              {value ? "Image selected" : "No image selected"}
            </p>
            <p className="max-w-[18rem] truncate text-xs text-[#6a433d]">
              {value || "Upload or choose an image when needed."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-[#220707] transition hover:-translate-y-0.5 hover:bg-white"
        >
          {editing ? "Done" : value ? "Edit Image" : "Add Image"}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 border-t border-black/8 pt-3">
          {value ? (
            <div className="relative overflow-hidden rounded-[1rem] border border-black/10 bg-white">
              {/*
               * `unoptimized` is deliberate: admin previews can come from any
               * configured media backend and should not depend on public image
               * optimizer allowlists.
               */}
              <Image
                key={value}
                src={value}
                alt="Current uploaded image"
                width={1600}
                height={900}
                unoptimized
                className="max-h-32 w-full object-cover"
              />
            </div>
          ) : (
            <EmptyPreview label="image" />
          )}

          <div className="mt-3 flex flex-wrap gap-3">
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
      ) : null}
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
  const [editing, setEditing] = useState(false);

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
      setEditing(false);
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
    <div className="mt-1 rounded-[1.1rem] border border-black/10 bg-[#faf8f7] p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {value.slice(0, 3).map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className="relative h-11 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
              <Image
                src={imageUrl}
                alt=""
                fill
                unoptimized
                sizes="48px"
                className="object-cover"
              />
            </div>
          ))}
          {value.length === 0 ? (
            <div className="flex h-11 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-black/12 bg-white text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#8a6b65]">
              No images
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-[#220707]">
              {value.length} gallery image{value.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-[#6a433d]">
              Expand only when you need to add or remove images.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white px-3 text-sm font-semibold text-[#220707] transition hover:-translate-y-0.5 hover:bg-white"
        >
          {editing ? "Done" : "Edit Gallery"}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 border-t border-black/8 pt-3">
          {value.length > 0 ? (
            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {value.map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="flex items-center gap-2 overflow-hidden rounded-[1rem] border border-black/10 bg-white p-2">
                  <Image
                    key={imageUrl}
                    src={imageUrl}
                    alt={`Gallery image ${index + 1}`}
                    width={160}
                    height={120}
                    unoptimized
                    className="h-16 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-[#6a433d]">{imageUrl}</p>
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((_, imageIndex) => imageIndex !== index))}
                      className="mt-1 cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e] transition hover:opacity-75"
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

          <div className="mt-3 flex flex-wrap gap-3">
            <UploadButton
              label={uploading ? "Uploading..." : "Upload Images"}
              disabled={uploading}
              multiple
              onFilesSelected={handleFiles}
            />
          </div>
          <UploadHint helpText={helpText} />
        </div>
      ) : null}
    </div>
  );
}
