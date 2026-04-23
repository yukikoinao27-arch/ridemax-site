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
  const hasImage = Boolean(image.trim());
  const resolvedTextScheme =
    textColorScheme === "default" ? (hasImage || dark ? "light" : "dark") : textColorScheme;
  const textClasses = heroTextColorSchemeClasses[resolvedTextScheme];
  const alignClass = align === "left" ? "items-start text-left" : "items-center text-center";
  const depthClass = resolvedTextScheme === "light" ? "ridemax-white-depth" : "";
  const imageOverlayClass = dark
    ? "absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.52),rgba(10,10,10,0.74))]"
    : "absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,12,0.18),rgba(12,12,12,0.32))]";
  const textFocusScrimClass =
    align === "left"
      ? "bg-[radial-gradient(circle_at_26%_36%,rgba(12,12,12,0.58),transparent_58%)]"
      : "bg-[radial-gradient(circle_at_50%_34%,rgba(12,12,12,0.62),transparent_56%)]";

  return (
    <section id={sectionId} className={`relative overflow-hidden ${minHeight} ${sectionClassName}`.trim()}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
      {hasImage ? <div className={imageOverlayClass} /> : null}
      {hasImage ? <div className={`absolute inset-0 ${textFocusScrimClass}`} /> : null}
      {decoration}
      <div className="relative mx-auto flex max-w-[118rem] px-6 py-24 md:px-10">
        <div className={`flex w-full flex-col ${alignClass}`}>
          {eyebrow ? <p className={`text-sm uppercase tracking-[0.24em] ${textClasses.summary}`}>{eyebrow}</p> : null}
          <h1 className={`mt-3 font-[family:var(--font-title)] leading-none ${heroHeadingScaleClasses[headingScale]} ${heroHeadingStyleClasses[headingStyle]} ${textClasses.title} ${depthClass}`}>{title}</h1>
          {summary ? <p className={`mt-5 max-w-3xl text-base leading-8 sm:text-lg ${textClasses.summary} ${depthClass}`}>{summary}</p> : null}
          {children ? <div className="mt-8 w-full">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
