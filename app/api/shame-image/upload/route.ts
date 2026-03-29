import { NextResponse } from "next/server";
import { deleteBlob, uploadBlob } from "@/lib/blob-storage";
import {
  createShameAsset,
  readSettings,
  readShameAssetById,
  setCurrentShameAssetId,
} from "@/lib/persistence";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// 4 MB is a pragmatic Vercel-friendly MVP limit: keeps uploads fast and avoids
// large request bodies while still allowing normal phone screenshots/photos.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function sanitizeFileName(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const maybeFile = formData.get("image");

    if (!(maybeFile instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing file. Send multipart/form-data with an 'image' file field.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(maybeFile.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported image type.",
          allowed_types: Array.from(ALLOWED_IMAGE_TYPES),
        },
        { status: 400 }
      );
    }

    if (maybeFile.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `Image too large. Maximum is ${MAX_UPLOAD_BYTES} bytes (${Math.round(
            MAX_UPLOAD_BYTES / (1024 * 1024)
          )} MB).`,
          max_bytes: MAX_UPLOAD_BYTES,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:.TZ]/g, "");
    const safeName = sanitizeFileName(maybeFile.name || "upload");

    const blob = await uploadBlob({
      pathname: `shame-images/${timestamp}-${safeName}`,
      file: maybeFile,
      contentType: maybeFile.type,
    });

    const newAssetId = createShameAsset({
      asset_url: blob.url,
      storage_key: blob.pathname,
      content_type: blob.contentType,
      original_filename: maybeFile.name,
    });

    const previousAssetId = readSettings().shame_asset_id;
    setCurrentShameAssetId(newAssetId);

    if (previousAssetId) {
      const previousAsset = readShameAssetById(previousAssetId);

      if (previousAsset?.asset_url) {
        try {
          await deleteBlob(previousAsset.asset_url);
        } catch (error) {
          console.warn("Failed deleting previous shame image blob", error);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Shame image uploaded and activated.",
      shame_asset: {
        id: newAssetId,
        url: blob.url,
        content_type: blob.contentType,
        original_filename: maybeFile.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown upload error",
      },
      { status: 500 }
    );
  }
}
