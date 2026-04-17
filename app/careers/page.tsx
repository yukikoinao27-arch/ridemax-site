import { notFound } from "next/navigation";
import { MarketingPageRenderer } from "@/components/marketing-page-renderer";
import { getSiteContent } from "@/lib/server/ridemax-content-repository";

type CareersPageProps = {
  searchParams: Promise<{ department?: string | string[] }>;
};

function readDepartment(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function CareersPage({ searchParams }: CareersPageProps) {
  const params = await searchParams;
  const content = await getSiteContent();
  const page = content.pages.find((candidate) => candidate.slug === "careers") ?? null;

  if (!page) {
    notFound();
  }

  return (
    <MarketingPageRenderer
      content={content}
      page={page}
      initialDepartment={readDepartment(params.department)}
    />
  );
}
