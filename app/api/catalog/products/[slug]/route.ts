import { NextResponse } from "next/server";
import {
  findProductCategory,
  listPublishedProductItems,
} from "@/lib/server/ridemax-content-repository";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function toMarketingProduct(item: Awaited<ReturnType<typeof listPublishedProductItems>>[number]) {
  const safeItem = { ...item };
  delete (safeItem as { sku?: unknown }).sku;
  return safeItem;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const [category, items] = await Promise.all([
    findProductCategory(slug),
    listPublishedProductItems(slug),
  ]);

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({
    category,
    total: items.length,
    items: items.map(toMarketingProduct),
  });
}
