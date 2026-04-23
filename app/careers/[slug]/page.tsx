import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroBanner } from "@/components/hero-banner";
import { JobApplicationForm } from "@/components/job-application-form";
import { getHeroBlock } from "@/lib/page-builder";
import { findJob, getSiteContent } from "@/lib/server/ridemax-content-repository";

type JobPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await findJob(slug);

  return {
    title: job ? job.title : "Job Not Found",
    description: job?.summary,
  };
}

export default async function JobPage({ params }: JobPageProps) {
  const { slug } = await params;
  const job = await findJob(slug);
  const content = await getSiteContent();
  const careersPage = content.pages.find((candidate) => candidate.slug === "careers") ?? null;
  const heroBlock = getHeroBlock(careersPage);

  if (!job) {
    notFound();
  }

  const department = content.departments.find((item) => item.slug === job.departmentSlug);

  return (
    <main>
      <HeroBanner
        image={heroBlock?.image.src ?? content.productCategories[0]?.heroImage.src ?? ""}
        title={job.title}
        summary={job.summary}
        minHeight="min-h-[22rem]"
        align="center"
      >
        <div className="flex flex-wrap justify-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/85">
          <span>{department?.name ?? "Team"}</span>
          <span>{job.location}</span>
          <span>{job.type}</span>
        </div>
      </HeroBanner>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[64rem] px-6 md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-[1.75rem] border border-black/10 bg-white p-8 shadow-[0_12px_30px_rgba(28,20,19,0.06)]">
              <h2 className="text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                Role Overview
              </h2>
              <p className="mt-5 text-base leading-8 text-[#4d3b37]">{job.description}</p>
            </article>
            <aside className="rounded-[1.75rem] border border-black/10 bg-[#faf8f7] p-8">
              <h2 className="text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                Quick Details
              </h2>
              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold uppercase tracking-[0.14em] text-[#8d120e]">Department</dt>
                  <dd className="mt-1 text-[#4d3b37]">{department?.name ?? "General"}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.14em] text-[#8d120e]">Location</dt>
                  <dd className="mt-1 text-[#4d3b37]">{job.location}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.14em] text-[#8d120e]">
                    Employment Type
                  </dt>
                  <dd className="mt-1 text-[#4d3b37]">{job.type}</dd>
                </div>
              </dl>
              <a
                href="#apply-online"
                className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-full bg-[#8d120e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a51611]"
              >
                Apply Online
              </a>
              <a
                href={`mailto:${content.contact.email}?subject=Application%20for%20${encodeURIComponent(job.title)}`}
                className="mt-3 inline-flex cursor-pointer px-2 py-2 text-sm font-semibold text-[#220707] underline underline-offset-2"
              >
                Or apply by email
              </a>
              <Link
                href="/careers"
                className="mt-3 inline-flex cursor-pointer px-2 py-2 text-sm font-semibold text-[#220707] underline underline-offset-2"
              >
                Back to careers
              </Link>
            </aside>
          </div>

          <div id="apply-online" className="mt-10">
            <JobApplicationForm jobSlug={job.slug} jobTitle={job.title} />
          </div>
        </div>
      </section>
    </main>
  );
}
