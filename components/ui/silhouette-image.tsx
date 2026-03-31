import { cn } from "@/lib/utils";

interface SilhouetteImageProps {
  filePath: string;
  darkPath?: string;
  alt: string;
  className?: string;
}

/**
 * Renders an SVG silhouette using CSS mask-image so it inherits the
 * current text color automatically — no theme toggling needed.
 * The SVG is used as a mask shape; backgroundColor provides the fill.
 */
export function SilhouetteImage({
  filePath,
  alt,
  className,
}: SilhouetteImageProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("bg-foreground", className)}
      style={{
        maskImage: `url(${filePath})`,
        WebkitMaskImage: `url(${filePath})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
