import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import type { MediaAsset, MediaAssetStorageMode } from "@/lib/ridemax-types";
import { getServerSupabaseClient, getServerSupabaseStatus } from "@/lib/server/supabase-server";

const mediaLibraryPath = path.join(process.cwd(), "data", "media-library.json");
const localMediaRoot = path.join(process.cwd(), "data", "media");
const defaultSupabaseBucket = "media";

const mediaAssetSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  url: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  createdAt: z.string(),
  storageKey: z.string(),
  storageMode: z.enum(["s3", "supabase", "local"]),
});

type MediaAssetRow = {
  id: string;
  file_name: string;
  public_url: string;
  content_type: string;
  byte_size: number;
  width: number;
  height: number;
  storage_key: string;
  storage_mode: MediaAssetStorageMode;
  created_at: string;
};

type MediaAssetsTable = {
  insert: (value: {
    id: string;
    file_name: string;
    public_url: string;
    content_type: string;
    byte_size: number;
    width: number;
    height: number;
    storage_key: string;
    storage_mode: MediaAssetStorageMode;
    created_at: string;
  }) => Promise<{ error: { message: string } | null }>;
  select: (columns: string) => {
    order: (
      column: string,
      options: { ascending: boolean },
    ) => Promise<{ data: MediaAssetRow[] | null; error: { message: string } | null }>;
  };
};

type MediaStorageStatus =
  | {
      mode: "s3";
      bucket: string;
      region: string;
      publicBaseUrl: string;
    }
  | {
      mode: "supabase";
      bucket: string;
      publicBaseUrl: string;
    }
  | {
      mode: "local";
      publicBaseUrl: string;
    };

type UploadImageInput = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  /**
   * Top-level directory for the generated storage key. Defaults to "images"
   * (the CMS media library). The chat upload endpoint passes "chat-uploads"
   * so ops can apply a separate retention policy without touching callers.
   */
  keyPrefix?: string;
};

function toMediaAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    fileName: row.file_name,
    url: row.public_url,
    contentType: row.content_type,
    size: row.byte_size,
    width: row.width,
    height: row.height,
    storageKey: row.storage_key,
    storageMode: row.storage_mode,
    createdAt: row.created_at,
  };
}

/**
 * Picks the active media backend in priority order:
 *   1. S3 — when both `RIDEMAX_MEDIA_BUCKET` and an AWS region are set.
 *   2. Supabase Storage — when Supabase server credentials are configured.
 *      This is the default in serverless deployments (Vercel, Lambda) where
 *      writing to the read-only filesystem would crash with ENOENT.
 *   3. Local FS — dev fallback only; assumes a writable working directory.
 */
function getMediaStorageStatus(): MediaStorageStatus {
  const s3Bucket = process.env.RIDEMAX_MEDIA_BUCKET?.trim() ?? "";
  const region = process.env.AWS_REGION?.trim() ?? process.env.AWS_DEFAULT_REGION?.trim() ?? "";
  const publicBaseUrl = process.env.RIDEMAX_MEDIA_PUBLIC_BASE_URL?.trim() ?? "";

  if (s3Bucket && region) {
    return {
      mode: "s3",
      bucket: s3Bucket,
      region,
      publicBaseUrl:
        publicBaseUrl || `https://${s3Bucket}.s3.${region}.amazonaws.com`,
    };
  }

  const supabaseStatus = getServerSupabaseStatus();
  if (supabaseStatus.enabled) {
    const supabaseBucket =
      process.env.RIDEMAX_SUPABASE_MEDIA_BUCKET?.trim() || defaultSupabaseBucket;
    return {
      mode: "supabase",
      bucket: supabaseBucket,
      publicBaseUrl: `${supabaseStatus.url.replace(/\/+$/, "")}/storage/v1/object/public/${supabaseBucket}`,
    };
  }

  return {
    mode: "local",
    publicBaseUrl: "/api/media",
  };
}

function mediaUrlForKey(storageKey: string) {
  const status = getMediaStorageStatus();
  return `${status.publicBaseUrl}/${storageKey}`.replace(/([^:]\/)\/+/g, "$1");
}

async function ensureMediaLibraryFile() {
  try {
    await fs.access(mediaLibraryPath);
  } catch {
    await fs.writeFile(mediaLibraryPath, "[]\n", "utf8");
  }
}

async function readLocalMediaAssets() {
  await ensureMediaLibraryFile();
  const raw = await fs.readFile(mediaLibraryPath, "utf8");
  const parsed = z.array(mediaAssetSchema).parse(JSON.parse(raw));
  return [...parsed].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function writeLocalMediaAssets(assets: MediaAsset[]) {
  await ensureMediaLibraryFile();
  await fs.writeFile(mediaLibraryPath, `${JSON.stringify(assets, null, 2)}\n`, "utf8");
}

async function persistMediaAsset(asset: MediaAsset) {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    try {
      const mediaTable = supabase.from("media_assets") as unknown as MediaAssetsTable;
      const { error } = await mediaTable.insert({
        id: asset.id,
        file_name: asset.fileName,
        public_url: asset.url,
        content_type: asset.contentType,
        byte_size: asset.size,
        width: asset.width,
        height: asset.height,
        storage_key: asset.storageKey,
        storage_mode: asset.storageMode,
        created_at: asset.createdAt,
      });

      if (error) {
        throw new Error(error.message);
      }

      return;
    } catch {
      // Fall through to the local JSON metadata store so uploads keep working
      // before the SQL table is applied in a fresh environment.
    }
  }

  const current = await readLocalMediaAssets();
  await writeLocalMediaAssets([asset, ...current]);
}

export async function listMediaAssets() {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    try {
      const mediaTable = supabase.from("media_assets") as unknown as MediaAssetsTable;
      const { data, error } = await mediaTable
        .select(
          "id, file_name, public_url, content_type, byte_size, width, height, storage_key, storage_mode, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map(toMediaAsset);
    } catch {
      return readLocalMediaAssets();
    }
  }

  return readLocalMediaAssets();
}

function safeStorageKey(fileName: string, keyPrefix: string) {
  const now = new Date();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, ext).replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const normalizedBase = baseName || "image";
  const sanitizedPrefix = keyPrefix.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "images";
  return `${sanitizedPrefix}/${now.getUTCFullYear()}/${month}/${normalizedBase}-${randomUUID()}.webp`;
}

async function writeLocalMediaFile(storageKey: string, bytes: Buffer) {
  const targetPath = path.join(localMediaRoot, ...storageKey.split("/"));
  const resolvedRoot = path.resolve(localMediaRoot);
  const resolvedPath = path.resolve(targetPath);

  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error("Invalid media storage path.");
  }

  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, bytes);
}

async function writeS3MediaFile(storageKey: string, bytes: Buffer, contentType: string) {
  const status = getMediaStorageStatus();

  if (status.mode !== "s3") {
    throw new Error("S3 media storage is not configured.");
  }

  const client = new S3Client({ region: status.region });
  await client.send(
    new PutObjectCommand({
      Bucket: status.bucket,
      Key: storageKey,
      Body: bytes,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

// First-upload bucket creation is idempotent: the second call returns the
// "already exists" error, which we swallow. Keeping this inside the storage
// module means admins don't have to provision the bucket out-of-band before
// the first image lands.
let bucketEnsuredFor: string | null = null;

async function writeSupabaseMediaFile(
  storageKey: string,
  bytes: Buffer,
  contentType: string,
) {
  const status = getMediaStorageStatus();

  if (status.mode !== "supabase") {
    throw new Error("Supabase media storage is not configured.");
  }

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase client is unavailable for media upload.");
  }

  if (bucketEnsuredFor !== status.bucket) {
    const { error } = await supabase.storage.createBucket(status.bucket, {
      public: true,
      fileSizeLimit: 26 * 1024 * 1024,
    });
    // Code 409 / message "already exists" is the steady-state path; only
    // surface other errors so callers see real misconfiguration.
    if (error && !/already exists|exists/i.test(error.message)) {
      throw new Error(error.message);
    }
    bucketEnsuredFor = status.bucket;
  }

  const { error: uploadError } = await supabase.storage
    .from(status.bucket)
    .upload(storageKey, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }
}

export async function uploadImageAsset(input: UploadImageInput) {
  const pipeline = sharp(input.buffer, { failOn: "none" }).rotate();
  const resized = pipeline.resize({
    width: 1920,
    withoutEnlargement: true,
  });
  const bytes = await resized.webp({ quality: 82 }).toBuffer();
  const metadata = await sharp(bytes).metadata();
  const storageKey = safeStorageKey(input.fileName, input.keyPrefix ?? "images");
  const status = getMediaStorageStatus();
  const contentType = "image/webp";

  if (status.mode === "s3") {
    await writeS3MediaFile(storageKey, bytes, contentType);
  } else if (status.mode === "supabase") {
    await writeSupabaseMediaFile(storageKey, bytes, contentType);
  } else {
    await writeLocalMediaFile(storageKey, bytes);
  }

  const asset: MediaAsset = {
    id: randomUUID(),
    fileName: input.fileName,
    url: mediaUrlForKey(storageKey),
    contentType,
    size: bytes.byteLength,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    createdAt: new Date().toISOString(),
    storageKey,
    storageMode: status.mode,
  };

  await persistMediaAsset(asset);

  return asset;
}

export async function readLocalMediaFile(segments: string[]) {
  const storageKey = segments.join("/");
  const targetPath = path.join(localMediaRoot, ...segments);
  const resolvedRoot = path.resolve(localMediaRoot);
  const resolvedPath = path.resolve(targetPath);

  if (!resolvedPath.startsWith(resolvedRoot)) {
    return null;
  }

  try {
    const bytes = await fs.readFile(resolvedPath);
    return {
      bytes,
      contentType: "image/webp",
      storageKey,
    };
  } catch {
    return null;
  }
}
