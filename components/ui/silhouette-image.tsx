import { cn } from "@/lib/utils";

interface SilhouetteImageProps {
  filePath: string;
  darkPath: string;
  alt: string;
  className?: string;
}

/**
 * Renders both light and dark silhouette variants, toggling visibility
 * with Tailwind's `dark:` variant. Uses plain <img> tags since these are
 * local static SVGs that don't benefit from next/image optimization.
 */
export function SilhouetteImage({
  filePath,
  darkPath,
  alt,
  className,
}: SilhouetteImageProps) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={filePath}
        alt={alt}
        className={cn(className, "dark:!hidden")}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={darkPath}
        alt={alt}
        className={cn(className, "!hidden dark:!block")}
      />
    </>
  );
}
