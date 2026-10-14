import React, { useMemo } from 'react';
import { ArrowRight, Flame, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductCard } from './ProductCard';
import { Product } from '../../types';

export const BestSellersSection: React.FC = () => {
  const { products, categories, settings, setActivePreviewProduct, navigateTo } = useApp();

  // Compute strictly the top 6 Best-Sellers according to configured order
  const bestSellers = useMemo(() => {
    // 1. Retrieve configured bestseller order from settings if present
    let orderedIds: string[] = [];
    if (settings?.bestseller_order) {
      try {
        const parsed = JSON.parse(settings.bestseller_order);
        if (Array.isArray(parsed)) {
          orderedIds = parsed.filter((id) => typeof id === 'string' && id.trim().length > 0);
        }
      } catch {
        orderedIds = settings.bestseller_order
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    // Filter only currently active products (if deleted or inactive, safely skipped without breaking)
    const activeProducts = products.filter((p) => p.is_active);
    const result: Product[] = [];
    const seenIds = new Set<string>();

    // Admin saves both the global order and each product's position. Prefer explicit product
    // positions when present so a stale secondary settings mirror cannot override the latest order.
    const productOrderedIds = activeProducts
      .filter((p) => Number.isFinite(Number(p.bestseller_order)) && Number(p.bestseller_order) > 0)
      .sort((a, b) => Number(a.bestseller_order) - Number(b.bestseller_order))
      .map((p) => p.id);
    const preferredIds = productOrderedIds.length >= 2 ? productOrderedIds : orderedIds;

    // 2. Insert products in the explicit configured order (Positions 1 to 6)
    for (const id of preferredIds) {
      if (result.length >= 6) break;
      const found = activeProducts.find((p) => p.id === id);
      if (found && !seenIds.has(found.id)) {
        result.push(found);
        seenIds.add(found.id);
      }
    }

    // 3. If fewer than 6, fill remaining slots with remaining active bestsellers
    if (result.length < 6) {
      const remainingBestsellers = activeProducts
        .filter((p) => !seenIds.has(p.id) && (p.is_best_seller || p.isBestSeller))
        .sort((a, b) => {
          const ordA = a.bestseller_order ?? 999;
          const ordB = b.bestseller_order ?? 999;
          if (ordA !== ordB) return ordA - ordB;
          return (b.rating || 0) - (a.rating || 0);
        });

      for (const p of remainingBestsellers) {
        if (result.length >= 6) break;
        result.push(p);
        seenIds.add(p.id);
      }
    }

    // 4. Strict limit: exactly maximum 6 books on the home page (no other bestsellers displayed)
    return result.slice(0, 6);
  }, [products, settings?.bestseller_order]);

  const getCategoryName = (catSlugOrId: string) => {
    const found = categories.find((c) => c.slug === catSlugOrId || c.id === catSlugOrId);
    return found ? `${found.icon} ${found.name}` : undefined;
  };

  if (bestSellers.length === 0) return null;

  return (
    <section id="bestsellers" className="border-b border-neutral-800 bg-neutral-950 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>Les Incontournables</span>
            </div>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Nos Livres Audio Best-Sellers
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              La sélection officielle des 6 œuvres majeures plébiscitées par les dirigeants, entrepreneurs et investisseurs de notre communauté.
            </p>
          </div>

          <button
            onClick={() => navigateTo('/catalogue')}
            className="group hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors self-start md:self-auto"
          >
            <span>Explorer tout le catalogue</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Best sellers grid: 2 per line on mobile, 3 per line on medium and large screens (max 6 items) */}
        <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {bestSellers.map((book) => (
            <ProductCard
              key={book.id}
              product={book}
              categoryName={getCategoryName(book.category)}
              onPlayPreview={() => setActivePreviewProduct(book)}
            />
          ))}
        </div>

        {/* Elegant button to discover all books in catalog */}
        <div className="mt-10 sm:mt-14 flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('/catalogue')}
            className="group inline-flex items-center justify-center gap-2.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-amber-500/5 transition-all duration-300 hover:border-amber-500 hover:bg-amber-500 hover:text-neutral-950 hover:shadow-amber-500/20 active:scale-95"
          >
            <BookOpen className="h-4 w-4 text-amber-400 transition-colors group-hover:text-neutral-950" />
            <span>Découvrir tous les livres</span>
            <ArrowRight className="h-4 w-4 text-amber-400 transition-transform group-hover:translate-x-1 group-hover:text-neutral-950" />
          </button>
          <span className="text-[11px] text-neutral-500">
            Accédez à l'intégralité du catalogue, des filtres par thématique et des formats audio HD
          </span>
        </div>
      </div>
    </section>
  );
};
