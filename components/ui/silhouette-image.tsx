"use client";

import { useTheme } from "next-themes";
import Image from "next/image";

interface SilhouetteImageProps {
  filePath: string;
  darkPath: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function SilhouetteImage({
  filePath,
  darkPath,
  alt,
  className,
  width = 120,
  height = 60,
}: SilhouetteImageProps) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? darkPath : filePath;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%" }}
    />
  );
}
