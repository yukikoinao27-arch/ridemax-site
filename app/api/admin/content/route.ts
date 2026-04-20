import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { siteContentSchema } from "@/lib/content-schemas";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { getSiteContent, saveSiteContent } from "@/lib/server/ridemax-content-repository";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getSiteContent());
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
  revalidatePath("/", "layout");
  revalidatePath("/search");
  revalidatePath("/products");
  revalidatePath("/careers");
  revalidatePath("/events");
  revalidatePath("/awards");
  revalidatePath("/promotions");

  return NextResponse.json({ message: "Content saved successfully." });
}
