import Image from "next/image";

type ImageMarqueeProps = {
  images: ReadonlyArray<string>;
  direction?: "right-to-left" | "left-to-right";
  altPrefix: string;
  className?: string;
};

function trackClass(direction: "right-to-left" | "left-to-right") {
  return direction === "left-to-right" ? "animate-ridemax-marquee-reverse" : "animate-ridemax-marquee";
}

export function ImageMarquee({
  images,
  direction = "right-to-left",
  altPrefix,
  className = "",
}: ImageMarqueeProps) {
  const loopingImages = [...images, ...images];

  return (
    <div className={`overflow-hidden ${className}`.trim()}>
      <div className={`flex w-max gap-4 py-2 ${trackClass(direction)}`}>
        {loopingImages.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className="relative h-60 w-[19rem] shrink-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/8"
          >
            <Image
              src={image}
              alt={`${altPrefix} ${index + 1}`}
              fill
              className="object-cover"
              sizes="19rem"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(12,6,6,0.18))]" />
          </div>
        ))}
      </div>
    </div>
  );
}
