import Image from "next/image";
import { cn } from "@/lib/utils";

type SmartImageProps = {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number | null;
  height?: number | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
};

export function SmartImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes = "100vw",
  priority = false,
  quality = 82,
}: SmartImageProps) {
  if (!src) {
    return (
      <div
        aria-hidden
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-sand via-stone to-line text-[9px] uppercase tracking-[0.35em] text-muted/60",
          className,
        )}
      >
        TWOK
      </div>
    );
  }

  if (/^https?:\/\//i.test(src)) {
    // Remote storage/CDN URLs are served directly; next/image would need an
    // allowlist per deployment and these URLs are admin-controlled.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(fill && "absolute inset-0 h-full w-full", "object-cover", className)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        width={!fill && width ? width : undefined}
        height={!fill && height ? height : undefined}
      />
    );
  }

  if (fill) {
    return (
      <Image aria-hidden
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <Image aria-hidden
      src={src}
      alt={alt}
      width={width || 1600}
      height={height || 1067}
      sizes={sizes}
      priority={priority}
      quality={quality}
      className={cn("object-cover", className)}
    />
  );
}
