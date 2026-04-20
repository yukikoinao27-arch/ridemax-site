import { NextResponse } from "next/server";
import { getProductCatalog, listProductCategories } from "@/lib/server/ridemax-content-repository";

export async function GET() {
  const [catalog, categories] = await Promise.all([getProductCatalog(), listProductCategories()]);

  return NextResponse.json({
    totalCategories: categories.length,
    totalItems: catalog.items.length,
    source: catalog.source,
    categories,
  });
}
