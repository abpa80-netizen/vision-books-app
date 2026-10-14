// Utility for resolving, normalizing and safeguarding image URLs across development and production (Vercel)

export const DEFAULT_BOOK_COVER = '/assets/images/cover_business_empire_1790615532791.jpg';
export const DEFAULT_FINANCE_COVER = '/assets/images/cover_financial_liberty_1790615544438.jpg';
export const DEFAULT_MINDSET_COVER = '/assets/images/cover_mindset_power_1790615556990.jpg';
export const DEFAULT_HERO_IMAGE = '/assets/images/hero_vision_books_1790615521205.jpg';

/**
 * Normalizes an image URL for production compatibility:
 * - Preserves Base64 Data URLs (data:image/...)
 * - Preserves external URLs (https://...)
 * - Normalizes /src/assets/images/ to /assets/images/ (available directly in public/ and dist/)
 * - Provides default fallback if URL is empty or null
 */
export function resolveImageUrl(url?: string | null, fallback: string = DEFAULT_BOOK_COVER): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const clean = url.trim();

  // 1. Data URLs (Base64) - self-contained, always valid everywhere
  if (clean.startsWith('data:')) {
    return clean;
  }

  // 2. Absolute external URLs
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // 3. Normalize legacy /src/assets/images/ paths to production /assets/images/
  if (clean.startsWith('/src/assets/images/')) {
    return clean.replace('/src/assets/images/', '/assets/images/');
  }

  if (clean.startsWith('src/assets/images/')) {
    return '/' + clean.replace('src/assets/images/', 'assets/images/');
  }

  // 4. Ensure leading slash for root-relative paths
  if (!clean.startsWith('/')) {
    return `/${clean}`;
  }

  return clean;
}
