import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { siteContentSchema } from "@/lib/content-schemas";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { savePreviewSiteContent } from "@/lib/server/ridemax-content-repository";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    content?: unknown;
    path?: string;
  };

  const parsed = siteContentSchema.safeParse(body.content);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid preview payload." },
      { status: 400 },
    );
  }

  await savePreviewSiteContent(parsed.data);
  const preview = await draftMode();
  preview.enable();

  const destination = typeof body.path === "string" && body.path.startsWith("/")
    ? body.path
    : "/";

  return NextResponse.json({
    previewUrl: new URL(destination, request.url).toString(),
  });
}
