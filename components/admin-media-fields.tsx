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

export type AdminBrandGalleryOption = {
  value: string;
  label: string;
  image: string;
  caption?: string;
};

type AdminBrandGalleryFieldProps = {
  value: string[];
  options: AdminBrandGalleryOption[];
  onChange: (value: string[]) => void;
  helpText?: string;
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

export function AdminBrandGalleryField({
  value,
  options,
  onChange,
  helpText,
}: AdminBrandGalleryFieldProps) {
  const [editing, setEditing] = useState(false);
  const selectedOptions = value
    .map((slug) => options.find((option) => option.value === slug))
    .filter((option): option is AdminBrandGalleryOption => Boolean(option));
  const availableOptions = options.filter((option) => !value.includes(option.value));
  const [pendingValue, setPendingValue] = useState("");
  const resolvedPendingValue = availableOptions.some((option) => option.value === pendingValue)
    ? pendingValue
    : (availableOptions[0]?.value ?? "");

  return (
    <div className="mt-1 rounded-[1.1rem] border border-black/10 bg-[#faf8f7] p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {selectedOptions.slice(0, 3).map((brand) => (
            <div
              key={brand.value}
              className="relative h-11 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white"
            >
              {brand.image ? (
                <Image
                  src={brand.image}
                  alt=""
                  fill
                  unoptimized
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-1 text-center text-[0.52rem] font-semibold uppercase tracking-[0.12em] text-[#8a6b65]">
                  {brand.label}
                </div>
              )}
            </div>
          ))}
          {selectedOptions.length === 0 ? (
            <div className="flex h-11 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-black/12 bg-white text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#8a6b65]">
              No brands
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-[#220707]">
              {selectedOptions.length} selected brand{selectedOptions.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-[#6a433d]">
              Expand only when you need to add or remove brands.
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
          {selectedOptions.length > 0 ? (
            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {selectedOptions.map((brand) => (
                <div
                  key={brand.value}
                  className="flex items-center gap-2 overflow-hidden rounded-[1rem] border border-black/10 bg-white p-2"
                >
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-[#f3f0ee]">
                    {brand.image ? (
                      <Image
                        src={brand.image}
                        alt={brand.label}
                        fill
                        unoptimized
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#8a6b65]">
                        {brand.label}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#220707]">{brand.label}</p>
                    {brand.caption ? (
                      <p className="truncate text-xs text-[#6a433d]">{brand.caption}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((slug) => slug !== brand.value))}
                      className="mt-1 cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e] transition hover:opacity-75"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPreview label="brand" />
          )}

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={resolvedPendingValue}
              onChange={(event) => setPendingValue(event.target.value)}
              className="w-full rounded-[1rem] border border-black/12 bg-white px-3 py-2.5 outline-none transition duration-150 ease-out hover:border-[#8d120e]/30 focus:border-[#8d120e] focus:shadow-[0_0_0_3px_rgba(141,18,14,0.08)]"
            >
              <option value="">Select brand</option>
              {availableOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!resolvedPendingValue}
              onClick={() => {
                if (!resolvedPendingValue || value.includes(resolvedPendingValue)) {
                  return;
                }

                onChange([...value, resolvedPendingValue]);
                setPendingValue("");
              }}
              className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#8d120e] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#a51611] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Add Brand
            </button>
          </div>
          <UploadHint
            helpText={
              helpText ??
              "Choose the published brands and order used in this strip. Edit each brand image in the Brands panel below."
            }
          />
        </div>
      ) : null}
    </div>
  );
}
