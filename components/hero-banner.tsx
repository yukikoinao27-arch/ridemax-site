import type { ReactNode } from "react";

type HeroBannerProps = {
  image: string;
  alt?: string;
  eyebrow?: string;
  title: string;
  summary?: string;
  minHeight?: string;
  align?: "left" | "center";
  dark?: boolean;
  children?: ReactNode;
};

export function HeroBanner({
  image,
  eyebrow,
  title,
  summary,
  minHeight = "min-h-[28rem]",
  align = "center",
  dark = true,
  children,
}: HeroBannerProps) {
  const textClass = dark ? "text-white" : "text-[#230707]";
  const summaryClass = dark ? "text-white/85" : "text-[#3b2623]";
  const alignClass = align === "left" ? "items-start text-left" : "items-center text-center";
  const depthClass = dark ? "ridemax-white-depth" : "";

  return (
    <section className={`relative overflow-hidden ${minHeight}`}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
      <div className={dark ? "absolute inset-0 bg-[linear-gradient(180deg,rgba(14,14,14,0.56),rgba(14,14,14,0.62))]" : "absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,255,255,0.25))]"} />
      <div className="relative mx-auto flex max-w-[118rem] px-6 py-24 md:px-10">
        <div className={`flex w-full flex-col ${alignClass}`}>
          {eyebrow ? <p className={`text-sm uppercase tracking-[0.24em] ${summaryClass}`}>{eyebrow}</p> : null}
          <h1 className={`mt-3 font-[family:var(--font-title)] text-5xl uppercase leading-none tracking-[-0.02em] sm:text-6xl md:text-7xl ${textClass} ${depthClass}`}>{title}</h1>
          {summary ? <p className={`mt-5 max-w-3xl text-base leading-8 sm:text-lg ${summaryClass}`}>{summary}</p> : null}
          {children ? <div className="mt-8 w-full">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
