import Image from "next/image";
import { formatLongDate } from "@/lib/server/ridemax-content-repository";
import type { PromotionItem } from "@/lib/ridemax-types";
import { getVideoEmbed } from "@/lib/video-embed";

type PromotionVideoCardProps = {
  promotion: PromotionItem;
};

function autoplayEmbedUrl(embedUrl: string) {
  const url = new URL(embedUrl);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("muted", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("loop", "1");

  if (url.hostname.includes("youtube.com") && !url.searchParams.has("playlist")) {
    const videoId = url.pathname.split("/").filter(Boolean).at(-1);
    if (videoId) {
      url.searchParams.set("playlist", videoId);
    }
  }

  return url.toString();
}

export function PromotionVideoCard({ promotion }: PromotionVideoCardProps) {
  const embed = getVideoEmbed(promotion.videoUrl);

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_14px_30px_rgba(28,20,19,0.08)]">
      <div className="relative aspect-video bg-[#120909]">
        {embed ? (
          <iframe
            title={promotion.title}
            src={autoplayEmbedUrl(embed.embedUrl)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : (
          <Image
            src={promotion.thumbnail}
            alt={promotion.title}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        )}
      </div>
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e]">
          {formatLongDate(promotion.publishDate)}
        </p>
        <h3 className="mt-3 text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
          {promotion.title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{promotion.summary}</p>
        {promotion.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {promotion.tags.map((tag) => (
              <span
                key={`${promotion.slug}-${tag}`}
                className="rounded-full border border-black/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#6a433d]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {promotion.ctaLabel && promotion.ctaHref ? (
          <a
            href={promotion.ctaHref}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center rounded-full bg-[#8d120e] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {promotion.ctaLabel}
          </a>
        ) : null}
      </div>
    </article>
  );
}
