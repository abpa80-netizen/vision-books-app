import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Star,
  Quote,
  CheckCircle2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  BookOpen,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TestimonialsSection: React.FC = () => {
  const { testimonials } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter only active testimonials
  const activeTestimonials = testimonials.filter((t) => t.is_active !== false);

  // Carousel interactive state
  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(activeTestimonials.length > 1);
  const [activeIndex, setActiveIndex] = useState(0);

  // Calculate scroll position and active slide
  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || activeTestimonials.length === 0) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Approximate active card index based on child elements
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;
      const containerLeft = el.getBoundingClientRect().left;

      children.forEach((child, idx) => {
        const childLeft = child.getBoundingClientRect().left;
        const distance = Math.abs(childLeft - containerLeft);
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });
      setActiveIndex(closestIdx);
    }
  }, [activeTestimonials.length]);

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

    // Scroll by the width of one card + gap or ~80% of clientWidth
    const firstCard = el.firstElementChild as HTMLElement;
    const cardStep = firstCard ? firstCard.offsetWidth + 24 : el.clientWidth * 0.8;

    el.scrollBy({
      left: direction === 'left' ? -cardStep : cardStep,
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

  // Moderate auto-scroll loop with pause on user interaction
  useEffect(() => {
    if (activeTestimonials.length <= 1) return;

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
        const firstCard = el.firstElementChild as HTMLElement;
        const cardStep = firstCard ? firstCard.offsetWidth + 24 : el.clientWidth * 0.8;
        el.scrollBy({ left: cardStep, behavior: 'smooth' });
      }
    }, 5000); // Moderate 5-second interval for comfortable reading

    return () => clearInterval(interval);
  }, [isPaused, activeTestimonials.length]);

  if (activeTestimonials.length === 0) return null;

  return (
    <section id="temoignages" className="relative border-b border-neutral-800 bg-neutral-900/30 py-20 overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -ml-32 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 -mr-32 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Retours d'Expérience Vérifiés</span>
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ce Que Disent Nos Auditeurs
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Entrepreneurs, investisseurs et cadres dirigeants partagent l'impact concret des condensés VISION BOOKS dans leurs décisions.
            </p>
          </div>

          {/* Carousel Controls (visible when more than 1 testimonial) */}
          {activeTestimonials.length > 1 && (
            <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
              {/* Play / Pause toggle */}
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                aria-label={isPaused ? 'Reprendre le défilement automatique' : 'Mettre en pause le défilement'}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
                title={isPaused ? 'Défilement automatique en pause (cliquez pour relancer)' : 'Défilement automatique actif'}
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
                type="button"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                aria-label="Témoignage précédent"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/90 text-white transition-all hover:border-amber-500/40 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                aria-label="Témoignage suivant"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/90 text-white transition-all hover:border-amber-500/40 hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Horizontal Testimonials Carousel Container */}
        <div
          className="mt-10 relative"
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
            aria-label="Carrousel des témoignages auditeurs"
            className="flex gap-6 overflow-x-auto pb-4 pt-2 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded-2xl items-stretch"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {activeTestimonials.map((item) => {
              // Only display rating if it actually exists in data
              const hasRating = typeof item.rating === 'number' && item.rating > 0;
              const numericRating = hasRating ? Math.min(5, Math.max(1, Math.round(item.rating!))) : null;

              // Only display avatar if it actually exists in data
              const avatar = (item.avatar_url || item.avatarUrl || '').trim();
              const bookTitle = (item.audiobook_title || item.audiobookTitle || '').trim();

              // Compute initials from real name if avatar is not provided
              const initials = item.name
                ? item.name
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : '';

              return (
                <div
                  key={item.id}
                  className="w-[85vw] max-w-[340px] sm:w-[380px] lg:w-[400px] shrink-0 snap-start flex"
                >
                  <div className="flex flex-col justify-between w-full rounded-2xl border border-neutral-800/90 bg-neutral-950/90 p-6 sm:p-7 shadow-lg backdrop-blur-sm hover:border-amber-500/40 hover:bg-neutral-900/60 transition-all duration-300 relative group">
                    {/* Top Header: Rating (only if exists) & Quote Icon */}
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        {hasRating && numericRating !== null ? (
                          <div className="flex items-center gap-1" aria-label={`Note : ${item.rating} sur 5`}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < numericRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-neutral-800 text-neutral-800'
                                }`}
                              />
                            ))}
                            {item.rating && (
                              <span className="ml-1.5 text-xs font-mono font-bold text-amber-400/90">
                                {item.rating % 1 === 0 ? item.rating : item.rating.toFixed(1)}/5
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs text-amber-500/80 font-medium">
                            <Quote className="h-3.5 w-3.5 text-amber-500" />
                            <span>Avis auditeur vérifié</span>
                          </div>
                        )}

                        <div className="h-8 w-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-neutral-600 group-hover:text-amber-500/80 group-hover:border-amber-500/30 transition-colors">
                          <Quote className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Testimonial Quote Content */}
                      <p className="mt-4 text-xs sm:text-sm leading-relaxed text-neutral-300 italic">
                        « {item.content} »
                      </p>

                      {/* Associated Audiobook Badge (only if exists) */}
                      {bookTitle && (
                        <div className="mt-5 flex items-center gap-2 rounded-xl bg-neutral-900/80 border border-neutral-800 px-3 py-2 text-xs text-neutral-300">
                          <BookOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block">
                              Livre écouté
                            </span>
                            <span className="text-white font-medium truncate block text-xs">
                              {bookTitle}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Author Footer Info */}
                    <div className="mt-6 flex items-center gap-3.5 border-t border-neutral-850/80 pt-4">
                      {avatar ? (
                        <div className="relative shrink-0">
                          <img
                            src={avatar}
                            alt={item.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallbackEl) fallbackEl.style.display = 'flex';
                            }}
                            className="h-11 w-11 rounded-full object-cover border border-amber-500/30 shadow-sm"
                          />
                          <div
                            style={{ display: 'none' }}
                            className="h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-neutral-800 text-xs font-bold text-amber-400 border border-amber-500/30 shadow-sm"
                          >
                            {initials || <User className="h-4 w-4 text-amber-400" />}
                          </div>
                        </div>
                      ) : (
                        <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-neutral-800 text-xs font-bold text-amber-400 border border-amber-500/30 shadow-sm">
                          {initials || <User className="h-4 w-4 text-amber-400" />}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs sm:text-sm font-bold text-white">
                            {item.name}
                          </p>
                          <span title="Auditeur vérifié" className="inline-flex">
                            <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          </span>
                        </div>
                        {(item.role || item.company) && (
                          <p className="truncate text-[11px] text-neutral-400 mt-0.5">
                            {item.role}
                            {item.role && item.company ? ' · ' : ''}
                            {item.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Indicators (dots) */}
          {activeTestimonials.length > 1 && (
            <div className="mt-8 flex items-center justify-center gap-1.5">
              {activeTestimonials.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`Aller au témoignage de ${item.name}`}
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
      </div>
    </section>
  );
};
