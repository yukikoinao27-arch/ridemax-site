import { NextResponse } from "next/server";
import { readLocalMediaFile } from "@/lib/server/media-library";

type MediaRouteContext = {
  params: Promise<{ asset: string[] }>;
};

export async function GET(_: Request, { params }: MediaRouteContext) {
  const { asset } = await params;
  const file = await readLocalMediaFile(asset);

  if (!file) {
    return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
  }

  return new NextResponse(file.bytes, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
