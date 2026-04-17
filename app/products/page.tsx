import { notFound } from "next/navigation";
import { MarketingPageRenderer } from "@/components/marketing-page-renderer";
import { getSiteContent } from "@/lib/server/ridemax-content-repository";

export default async function ProductsPage() {
  const content = await getSiteContent();
  const page = content.pages.find((candidate) => candidate.slug === "products") ?? null;

  if (!page) {
    notFound();
  }

  return <MarketingPageRenderer content={content} page={page} />;
}
