import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { externalProductCatalogSchema, siteContentSchema } from "@/lib/content-schemas";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import {
  savePreviewProductCatalog,
  savePreviewSiteContent,
} from "@/lib/server/ridemax-content-repository";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    catalog?: unknown;
    content?: unknown;
    path?: string;
  };

  const parsed = siteContentSchema.safeParse(body.content);
  const parsedCatalog =
    body.catalog === undefined
      ? null
      : externalProductCatalogSchema.safeParse(body.catalog);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid preview payload." },
      { status: 400 },
    );
  }

  if (parsedCatalog && !parsedCatalog.success) {
    return NextResponse.json(
      { error: parsedCatalog.error.issues[0]?.message ?? "Invalid preview catalog payload." },
      { status: 400 },
    );
  }

  await savePreviewSiteContent(parsed.data);
  if (parsedCatalog?.success) {
    await savePreviewProductCatalog(parsedCatalog.data);
  }

  const preview = await draftMode();
  preview.enable();

  const destination = typeof body.path === "string" && body.path.startsWith("/")
    ? body.path
    : "/";

  return NextResponse.json({
    previewUrl: new URL(destination, request.url).toString(),
  });
}
