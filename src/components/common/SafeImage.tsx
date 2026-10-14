import React, { useState, useEffect } from 'react';
import { BookOpen, Headphones } from 'lucide-react';

export interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  title?: string;
  subtitle?: string;
  fallbackSrc?: string;
  className?: string;
}

// Canonical static covers bundled with the app
export const DEFAULT_BOOK_COVER = '/assets/images/cover_business_empire_1790615532791.jpg';
export const DEFAULT_FINANCE_COVER = '/assets/images/cover_financial_liberty_1790615544438.jpg';
export const DEFAULT_MINDSET_COVER = '/assets/images/cover_mindset_power_1790615556990.jpg';
export const DEFAULT_HERO_IMAGE = '/assets/images/hero_vision_books_1790615521205.jpg';

/**
 * Normalizes image paths to ensure compatibility with Vite static assets in Vercel production.
 * Automatically fixes legacy `/src/assets/images/...` paths to `/assets/images/...`.
 */
export function normalizeImagePath(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_BOOK_COVER;

  const trimmed = rawUrl.trim();
  if (!trimmed) return DEFAULT_BOOK_COVER;

  // Preserve data URLs (Base64) and external absolute URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Normalize legacy Vite dev paths: /src/assets/images/... -> /assets/images/...
  if (trimmed.startsWith('/src/assets/images/')) {
    return trimmed.replace('/src/assets/images/', '/assets/images/');
  }
  if (trimmed.startsWith('src/assets/images/')) {
    return trimmed.replace('src/assets/images/', '/assets/images/');
  }

  // Already a root-relative path
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `/${trimmed}`;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = 'Image VISION BOOKS',
  title,
  subtitle,
  fallbackSrc = DEFAULT_BOOK_COVER,
  className = '',
  ...rest
}) => {
  const initialResolved = normalizeImagePath(src);
  const [currentSrc, setCurrentSrc] = useState<string>(initialResolved);
  const [hasFailed, setHasFailed] = useState<boolean>(false);
  const [fallbackAttempted, setFallbackAttempted] = useState<boolean>(false);

  // Sync state whenever prop src changes
  useEffect(() => {
    const nextResolved = normalizeImagePath(src);
    setCurrentSrc(nextResolved);
    setHasFailed(false);
    setFallbackAttempted(false);
  }, [src]);

  const handleError = () => {
    // If first failure, try the static default cover
    if (!fallbackAttempted && currentSrc !== fallbackSrc) {
      setFallbackAttempted(true);
      setCurrentSrc(fallbackSrc);
    } else {
      // Both original and fallback failed: switch to styled vector fallback
      setHasFailed(true);
    }
  };

  // Graceful vector placeholder if all image sources fail
  if (hasFailed) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-4 text-center border border-neutral-800 ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-60" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-2 max-w-[90%]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900/90 border border-amber-500/30 text-amber-400 shadow-lg">
            <Headphones className="h-6 w-6" />
          </div>
          {title && (
            <p className="line-clamp-2 text-xs font-bold text-white drop-shadow-sm">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="line-clamp-1 text-[11px] text-neutral-400">
              {subtitle}
            </p>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500/80">
            VISION BOOKS
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className={className}
      {...rest}
    />
  );
};
