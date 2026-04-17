import type { SocialLink } from "@/lib/ridemax-types";

type SocialLinksProps = {
  links: ReadonlyArray<SocialLink>;
  dark?: boolean;
};

function iconFor(platform: SocialLink["platform"]) {
  switch (platform) {
    case "facebook":
      return <path d="M14 8h-2c-.6 0-1 .4-1 1v2h3l-.4 3H11v7H8v-7H5v-3h3V8.7C8 6.1 9.6 4 12.3 4H14v4Z" />;
    case "instagram":
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="5" ry="5" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="17.5" cy="6.5" r="1" />
        </>
      );
    case "linkedin":
      return (
        <>
          <path d="M7 9v8" />
          <path d="M7 6h.01" />
          <path d="M11 17v-4c0-1.7 1.2-3 2.7-3S16 11.3 16 13v4" />
          <path d="M11 10v7" />
        </>
      );
    case "x":
      return <path d="m5 5 14 14M19 5 5 19" />;
    case "tiktok":
      return <path d="M14 5c.8 1.3 1.8 2 3.4 2.2v2.6c-1.1 0-2.1-.3-3.1-.9v4.6a4.3 4.3 0 1 1-4.3-4.3c.3 0 .5 0 .8.1v2.7a1.9 1.9 0 1 0 1.6 1.9V5H14Z" />;
    case "youtube":
      return (
        <>
          <path d="M21 12s0-3-1-4-4-1-8-1-7 0-8 1-1 4-1 4 0 3 1 4 4 1 8 1 7 0 8-1 1-4 1-4Z" />
          <path d="m10 9 5 3-5 3Z" />
        </>
      );
  }
}

export function SocialLinks({ links, dark = false }: SocialLinksProps) {
  const baseClass = dark
    ? "border-black/15 bg-white text-[#250707] hover:bg-[#f6f3f2]"
    : "border-white/20 bg-black/5 text-white hover:bg-white/10";

  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link) => (
        <a
          key={`${link.platform}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${baseClass}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {iconFor(link.platform)}
          </svg>
        </a>
      ))}
    </div>
  );
}
