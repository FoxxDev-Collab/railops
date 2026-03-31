"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface SilhouetteImageProps {
  filePath: string;
  darkPath: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Renders both light and dark silhouette variants, toggling visibility
 * with Tailwind's `dark:` variant. This avoids hydration mismatches
 * from useTheme() and ensures instant theme transitions without flicker.
 */
export function SilhouetteImage({
  filePath,
  darkPath,
  alt,
  className,
  width = 120,
  height = 60,
}: SilhouetteImageProps) {
  const imgStyle = { width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%" } as const;

  return (
    <>
      <Image
        src={filePath}
        alt={alt}
        width={width}
        height={height}
        className={cn(className, "dark:hidden")}
        style={imgStyle}
      />
      <Image
        src={darkPath}
        alt={alt}
        width={width}
        height={height}
        className={cn(className, "hidden dark:block")}
        style={imgStyle}
      />
    </>
  );
}
