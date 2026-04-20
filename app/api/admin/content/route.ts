import { NextResponse } from "next/server";
import { siteContentSchema } from "@/lib/content-schemas";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { getDraftSiteContent, saveSiteContent } from "@/lib/server/ridemax-content-repository";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getDraftSiteContent());
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = siteContentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid content payload." },
      { status: 400 },
    );
  }

  await saveSiteContent(parsed.data);

  return NextResponse.json({ message: "Draft saved." });
}
