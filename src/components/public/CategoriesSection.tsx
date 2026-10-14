import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Layers, BookOpen, Sparkles, Pause, Play } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';

import { sortCategoriesStrategically } from '../../context/AppContext';

export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'business-entrepreneuriat': '/assets/images/cat_entrepreneuriat.jpg',
  'liberte-financiere-succes': '/assets/images/cat_finance.jpg',
  'investissement-trading': '/assets/images/cat_trading.jpg',
  'business-en-ligne-marketing': '/assets/images/cat_marketing.jpg',
  'developpement-personnel': '/assets/images/cat_dev_perso.jpg',
  'mindset-motivation': '/assets/images/cat_mindset.jpg',
  'spiritualite-bien-etre': '/assets/images/cat_spiritualite.jpg',
  'amour-relation': '/assets/images/cat_relations.jpg',
  'autres': '/assets/images/cat_autres.jpg',
};

export const CategoriesSection: React.FC = () => {
  const { categories, products, navigateTo } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter only active categories for the public storefront and sort strategically
  // (Autres is strictly guaranteed in last position)
  const activeCategories = useMemo(() => {
    return sortCategoriesStrategically(categories.filter((c) => c.is_active));
  }, [categories]);

  // Carousel interactive states
  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // Compute number of active products per category
  const getProductCount = useCallback(
    (categorySlug: string, categoryId: string) => {
      return products.filter(
        (p) =>
          p.is_active &&
          (p.category === categorySlug ||
            p.category === categoryId ||
            (p as any).categoryId === categoryId)
      ).length;
    },
    [products]
  );

  const handleCategoryClick = (categorySlug: string) => {
    navigateTo(`/categorie/${categorySlug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll checking for navigation arrows & pagination dots
  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Calculate approximate active card index
    const cardWidth = 320; // approximate average card + gap
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(index, activeCategories.length - 1)));
  }, [activeCategories.length]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  // Scroll manually left or right
  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollAmount = Math.max(280, el.clientWidth * 0.75);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Scroll directly to a specific slide index
  const scrollToSlide = (index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const card = el.children[index] as HTMLElement;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  };

  // Auto-scroll loop with pause on user interaction
  useEffect(() => {
    if (activeCategories.length <= 1) return;

    const interval = setInterval(() => {
      if (isPaused) return;

      const el = scrollContainerRef.current;
      if (!el) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const isEndReached = scrollLeft >= scrollWidth - clientWidth - 20;

      if (isEndReached) {
        // Smoothly loop back to start
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        // Advance by one card width
        const step = Math.max(280, el.clientWidth * 0.45);
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, activeCategories.length]);

  if (activeCategories.length === 0) return null;

  return (
    <section id="categories" className="relative border-b border-neutral-800 bg-neutral-900/30 py-20 overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -ml-32 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 -mr-32 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-500 border border-amber-500/20">
              <Sparkles className="h-3 w-3" />
              <span>Thématiques & Domaines</span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Nos livres audio par thématique
            </h2>
            <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
              Explorez nos univers d'apprentissage audio d'élite, soigneusement structurés pour transformer vos finances, vos compétences et votre clarté d'esprit.
            </p>
          </div>

          {/* Carousel Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Play/Pause state indicator */}
            <button
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? 'Reprendre le défilement automatique' : 'Mettre en pause'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
              title={isPaused ? 'Défilement en pause (cliquez pour relancer)' : 'Défilement automatique actif'}
            >
              {isPaused ? (
                <>
                  <Play className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="hidden sm:inline">Relancer</span>
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>

            {/* Previous Button */}
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Thématique précédente"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/90 text-white transition-all hover:border-amber-500/40 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Next Button */}
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Thématique suivante"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/90 text-white transition-all hover:border-amber-500/40 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Categories Horizontal Carousel Container */}
        <div
          className="mt-8 relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onTouchCancel={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            role="region"
            aria-label="Carrousel des thématiques"
            className="flex gap-5 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded-2xl"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {activeCategories.map((cat, idx) => {
              const count = getProductCount(cat.slug, cat.id);
              const categoryUrl = `/categorie/${cat.slug}`;
              const defaultFallback = DEFAULT_CATEGORY_IMAGES[cat.slug] || '/assets/images/cat_entrepreneuriat.jpg';
              const catImage = cat.image || cat.imageUrl || cat.cover || defaultFallback;

              return (
                <div
                  key={cat.id}
                  className="w-[280px] sm:w-[320px] md:w-[340px] shrink-0 snap-start"
                >
                  <a
                    href={categoryUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryClick(cat.slug);
                    }}
                    className="group relative flex flex-col justify-between h-full rounded-2xl border border-neutral-800/80 bg-neutral-950/80 p-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500/50 hover:bg-neutral-900/70 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer block text-left"
                  >
                    <div>
                      {/* Category Cover Image with elegant visual fallback */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800/80">
                        <SafeImage
                          src={catImage}
                          alt={cat.name}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          fallbackSrc={defaultFallback}
                        />

                        {/* Gradient overlay for contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent pointer-events-none" />

                        {/* Top-left Icon Badge */}
                        <div className="absolute top-2.5 left-2.5 flex items-center justify-center h-9 w-9 rounded-xl bg-neutral-950/80 backdrop-blur-md border border-neutral-700/60 text-lg shadow-sm">
                          <span role="img" aria-label={cat.name}>
                            {cat.icon}
                          </span>
                        </div>

                        {/* Top-right Book Count Badge */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono font-bold text-amber-400 border border-amber-500/30 shadow-sm">
                          <BookOpen className="h-3 w-3 text-amber-400" />
                          <span>
                            {count} {count > 1 ? 'livres' : 'livre'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Short Description */}
                      <div className="mt-4">
                        <h3 className="font-display text-lg font-bold text-white transition-colors group-hover:text-amber-400 line-clamp-1">
                          {cat.name}
                        </h3>

                        <p className="mt-1.5 text-xs leading-relaxed text-neutral-400 line-clamp-2">
                          {cat.description ||
                            'Thématique audio sélectionnée pour accélérer vos compétences et votre réussite.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-5 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-500 group-hover:text-amber-400 transition-colors">
                        Découvrir les livres
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 group-hover:bg-amber-500 text-neutral-400 group-hover:text-neutral-950 transition-all duration-200">
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>

          {/* Dots Indicator for Mobile & Compact Screens */}
          {activeCategories.length > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1.5">
              {activeCategories.map((cat, idx) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`Aller à la catégorie ${cat.name}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx
                      ? 'w-6 bg-amber-500'
                      : 'w-1.5 bg-neutral-800 hover:bg-neutral-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direct Access Explanatory Sub-bar */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-400 text-center">
          <Layers className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>
            Glissez horizontalement ou cliquez sur une thématique pour ouvrir sa page dédiée et écouter les extraits.
          </span>
        </div>
      </div>
    </section>
  );
};
