import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCountdown } from "@/components/event-countdown";
import { MapEmbed } from "@/components/map-embed";
import { SocialLinks } from "@/components/social-links";
import { findEvent, formatDateTimeRange } from "@/lib/server/ridemax-content-repository";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await findEvent(slug);

  return {
    title: event ? event.title : "Event Not Found",
    description: event?.summary,
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await findEvent(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="bg-[#f7f4f1] py-16">
      <div className="mx-auto max-w-[72rem] px-6 md:px-10">
        <Link
          href="/events"
          className="inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#220707] transition hover:-translate-y-0.5 hover:border-[#8d120e]/30 hover:bg-[#fff7f6] hover:text-[#8d120e]"
        >
          Back to Events
        </Link>

        <section className="mt-8 grid gap-8 bg-[#ebe6e4] p-8 lg:grid-cols-[22rem_1fr]">
          <div className="relative min-h-[30rem] overflow-hidden">
            <Image src={event.detailImage} alt={event.title} fill className="object-contain bg-white" sizes="22rem" />
          </div>
          <div>
            <p className="text-lg text-[#220707]">{event.teaserDate}</p>
            <h1 className="mt-4 text-7xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">{event.title}</h1>
            <div className="mt-8 max-w-xl">
              <EventCountdown startAt={event.startAt} />
            </div>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#4d3b37]">{event.summary}</p>
            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a433d]">Share this event</p>
              <SocialLinks
                dark
                links={[
                  { platform: "facebook", label: "Facebook", href: event.shareLinks.facebook },
                  { platform: "x", label: "X", href: event.shareLinks.x },
                  { platform: "linkedin", label: "LinkedIn", href: event.shareLinks.linkedin },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">Time & Location</h2>
            <p className="mt-5 text-base leading-8 text-[#4d3b37]">{formatDateTimeRange(event.startAt, event.endAt)}</p>
            <p className="text-base leading-8 text-[#4d3b37]">{event.venue}</p>

            <h2 className="mt-12 text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">About the Event</h2>
            <p className="mt-5 text-base leading-8 text-[#4d3b37]">{event.description}</p>
          </div>
          <MapEmbed query={event.venue} />
        </section>
      </div>
    </main>
  );
}
