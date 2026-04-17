import Image from "next/image";
import type { CategorySection } from "@/lib/ridemax-types";

type AlternatingFeatureRowsProps = {
  sections: ReadonlyArray<CategorySection>;
};

/**
 * Renders CMS-driven feature rows that alternate media placement by index.
 * This supports any number of rows while keeping a consistent visual rhythm.
 */
export function AlternatingFeatureRows({ sections }: AlternatingFeatureRowsProps) {
  const tireTypes = sections;

  return (
    <div className="mt-10 space-y-8">
      {tireTypes.map((section) => (
        <article
          id={section.slug}
          key={section.id}
          className="tire-type-row rounded-[1.75rem] border border-black/10 bg-white p-8 shadow-[0_12px_30px_rgba(28,20,19,0.06)]"
        >
          <div className={`flex flex-col gap-10 ${section.image ? "lg:flex-row lg:items-center lg:gap-20" : ""}`}>
            <div className="flex-1">
              <h3 className="text-5xl font-[family:var(--font-title)] font-bold uppercase leading-none text-[#220707]">
                {section.title}
              </h3>
              {section.subtitle ? (
                <p className="mt-3 text-base font-semibold text-[#E31E24]">
                  {section.subtitle}
                </p>
              ) : null}
              <div className="mt-6 space-y-5 text-base leading-8 text-[#4d3b37]">
                {section.paragraphs.map((paragraph) => (
                  <p key={`${section.id}-${paragraph.slice(0, 18)}`}>{paragraph}</p>
                ))}
              </div>
            </div>
            {section.image ? (
              <div className="relative min-h-[18rem] flex-1 rounded-[1.25rem] border border-black/8">
                <Image
                  src={section.image}
                  alt={section.imageAlt ?? section.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 40vw, 100vw"
                />
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
