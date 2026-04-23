import type { ReactNode } from "react";
import type { BlockAppearance } from "@/lib/ridemax-types";

type HeroBannerProps = {
  image: string;
  alt?: string;
  eyebrow?: string;
  title: string;
  summary?: string;
  minHeight?: string;
  align?: "left" | "center";
  dark?: boolean;
  headingScale?: BlockAppearance["headingScale"];
  headingStyle?: BlockAppearance["headingStyle"];
  textColorScheme?: BlockAppearance["textColorScheme"];
  sectionId?: string;
  sectionClassName?: string;
  decoration?: ReactNode;
  children?: ReactNode;
};

const heroHeadingScaleClasses = {
  compact: "text-4xl sm:text-5xl md:text-6xl",
  standard: "text-5xl sm:text-6xl md:text-7xl",
  display: "text-6xl sm:text-7xl md:text-8xl",
} satisfies Record<NonNullable<BlockAppearance["headingScale"]>, string>;

const heroHeadingStyleClasses = {
  standard: "uppercase tracking-[-0.02em]",
  large: "uppercase tracking-[-0.035em]",
  emphasis: "uppercase tracking-[-0.025em] drop-shadow-[0_8px_18px_rgba(227,30,36,0.14)]",
  minimal: "normal-case tracking-[-0.01em]",
} satisfies Record<NonNullable<BlockAppearance["headingStyle"]>, string>;

const heroTextColorSchemeClasses = {
  default: {
    title: "text-[#230707]",
    summary: "text-[#3b2623]",
  },
  dark: {
    title: "text-[#230707]",
    summary: "text-[#3b2623]",
  },
  light: {
    title: "text-white",
    summary: "text-white/85",
  },
  muted: {
    title: "text-[#2b2321]",
    summary: "text-[#5f504c]",
  },
  brand: {
    title: "text-[#E31E24]",
    summary: "text-[#5d0d0a]",
  },
} satisfies Record<NonNullable<BlockAppearance["textColorScheme"]>, { title: string; summary: string }>;

export function HeroBanner({
  image,
  eyebrow,
  title,
  summary,
  minHeight = "min-h-[28rem]",
  align = "center",
  dark = true,
  headingScale = "standard",
  headingStyle = "standard",
  textColorScheme = "default",
  sectionId,
  sectionClassName = "",
  decoration,
  children,
}: HeroBannerProps) {
  const resolvedTextScheme = textColorScheme === "default" ? (dark ? "light" : "dark") : textColorScheme;
  const textClasses = heroTextColorSchemeClasses[resolvedTextScheme];
  const alignClass = align === "left" ? "items-start text-left" : "items-center text-center";
  const depthClass = dark ? "ridemax-white-depth" : "";

  return (
    <section id={sectionId} className={`relative overflow-hidden ${minHeight} ${sectionClassName}`.trim()}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
      <div className={dark ? "absolute inset-0 bg-[linear-gradient(180deg,rgba(14,14,14,0.56),rgba(14,14,14,0.62))]" : "absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(255,255,255,0.25))]"} />
      {decoration}
      <div className="relative mx-auto flex max-w-[118rem] px-6 py-24 md:px-10">
        <div className={`flex w-full flex-col ${alignClass}`}>
          {eyebrow ? <p className={`text-sm uppercase tracking-[0.24em] ${textClasses.summary}`}>{eyebrow}</p> : null}
          <h1 className={`mt-3 font-[family:var(--font-title)] leading-none ${heroHeadingScaleClasses[headingScale]} ${heroHeadingStyleClasses[headingStyle]} ${textClasses.title} ${depthClass}`}>{title}</h1>
          {summary ? <p className={`mt-5 max-w-3xl text-base leading-8 sm:text-lg ${textClasses.summary}`}>{summary}</p> : null}
          {children ? <div className="mt-8 w-full">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
