"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type HeroMediaProps = {
  posterUrl: string | null;
  videoUrl: string | null;
  overlay?: number;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function HeroMedia({ posterUrl, videoUrl, overlay = 35, alt, className, priority }: HeroMediaProps) {
  const reduced = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener?.("change", onChange);
      return () => query.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-charcoal", className)}>
      {posterUrl && (
        <motion.img
          src={posterUrl}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
          initial={false}
          animate={reduced ? undefined : { scale: [1, 1.06] }}
          transition={reduced ? undefined : { duration: 24, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
        />
      )}
      {videoUrl && !reduced && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterUrl ?? undefined}
          aria-hidden
        >
          <source src={videoUrl} />
        </video>
      )}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0d0b09]/35 via-[#0d0b09]/10 to-[#0d0b09]/70"
        style={{ opacity: Math.max(0, Math.min(100, overlay)) / 100 }}
      />
      <div className="absolute inset-0 bg-[#0d0b09]/10" />
    </div>
  );
}
