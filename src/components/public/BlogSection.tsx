import React, { useMemo } from 'react';
import {
  Clock,
  User,
  ArrowRight,
  BookOpen,
  Sparkles,
  Calendar,
  Compass,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';

export const BlogSection: React.FC = () => {
  const { blogPosts, navigateTo } = useApp();

  // Filter published posts
  const publishedPosts = useMemo(() => {
    return blogPosts.filter((p) => p.is_published !== false);
  }, [blogPosts]);

  // Select a single article: the featured one or, by default, the most recent
  const selectedPost = useMemo(() => {
    if (publishedPosts.length === 0) return null;

    // 1. Look for an explicitly featured article
    const featured = publishedPosts.find(
      (p) => p.is_featured === true || p.featured === true
    );
    if (featured) return featured;

    // 2. Otherwise sort by date/creation to pick the most recent
    const sorted = [...publishedPosts].sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const tA = Date.parse(a.date);
      const tB = Date.parse(b.date);
      if (!isNaN(tA) && !isNaN(tB)) {
        return tB - tA;
      }
      return 0;
    });

    return sorted[0];
  }, [publishedPosts]);

  const postUrl = selectedPost ? `/blog/${selectedPost.slug || selectedPost.id}` : '/blog';
  const postImage =
    selectedPost?.imageUrl ||
    selectedPost?.image_url ||
    '/assets/images/cover_business_empire_1790615532791.jpg';
  const readDuration = selectedPost?.readTime || selectedPost?.read_time || '5 min';

  return (
    <section id="blog" className="border-b border-neutral-800 bg-neutral-950 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ressources & Réflexions</span>
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Le Journal VISION BOOKS
            </h2>
            <p className="mt-2 text-sm text-neutral-400 max-w-2xl">
              Analyses, méthodes d'écoute active et réflexions stratégiques pour les esprits ambitieux.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('/blog')}
            className="group inline-flex items-center gap-2 self-start rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white hover:border-amber-500/50 hover:bg-neutral-900 transition-all shadow-sm md:self-auto"
          >
            <BookOpen className="h-4 w-4 text-amber-500 transition-transform group-hover:scale-110" />
            <span>Explorer tous les articles</span>
            <ArrowRight className="h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-400" />
          </button>
        </div>

        {/* Content: Single Featured/Recent Article or Elegant Empty State */}
        {selectedPost ? (
          <div className="mt-10 sm:mt-12">
            <article
              onClick={() => navigateTo(postUrl)}
              className="group relative overflow-hidden rounded-3xl border border-neutral-800/90 bg-gradient-to-br from-neutral-900/70 via-neutral-900/40 to-neutral-950 p-1 sm:p-2 backdrop-blur-md transition-all duration-300 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/5 cursor-pointer"
            >
              <div className="grid gap-6 lg:grid-cols-12 lg:items-center p-4 sm:p-6 lg:p-8">
                {/* Visual Cover (5 cols on lg) */}
                <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-950 lg:col-span-5 shadow-inner">
                  <SafeImage
                    src={postImage}
                    alt={selectedPost.title}
                    title={selectedPost.title}
                    subtitle={selectedPost.category}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/20 to-transparent" />

                  {/* Overlaid Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                    <span className="rounded-full bg-neutral-950/85 border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-400 backdrop-blur-md shadow-sm">
                      {selectedPost.category}
                    </span>

                    {(selectedPost.is_featured || selectedPost.featured) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md shadow-sm">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        <span>À la une</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-neutral-300 font-medium">
                    <div className="flex items-center gap-1.5 rounded-full bg-neutral-950/80 px-2.5 py-1 backdrop-blur-md border border-white/5">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span>{readDuration} de lecture</span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full bg-neutral-950/80 px-2.5 py-1 backdrop-blur-md border border-white/5 text-neutral-400">
                      <Calendar className="h-3 w-3 text-neutral-400" />
                      <span>{selectedPost.date}</span>
                    </div>
                  </div>
                </div>

                {/* Article Editorial Details (7 cols on lg) */}
                <div className="flex flex-col justify-between space-y-6 lg:col-span-7 lg:py-2">
                  <div className="space-y-4">
                    {/* Editorial Tag */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Dossier Stratégique Recommandé
                      </span>
                    </div>

                    {/* Article Title */}
                    <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white transition-colors duration-200 group-hover:text-amber-400 leading-snug">
                      {selectedPost.title}
                    </h3>

                    {/* Article Excerpt */}
                    <p className="text-sm sm:text-base leading-relaxed text-neutral-300 line-clamp-3 sm:line-clamp-4">
                      {selectedPost.excerpt}
                    </p>
                  </div>

                  {/* Author & Footer Meta */}
                  <div className="space-y-5 pt-4 border-t border-neutral-800/80">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-neutral-300">{selectedPost.author}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                        <span>Journal Officiel</span>
                        <span>·</span>
                        <span className="text-amber-500/90 font-mono">VISION BOOKS</span>
                      </div>
                    </div>

                    {/* Action Buttons: Primary & Secondary */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo(postUrl);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs sm:text-sm font-bold text-neutral-950 transition-all duration-200 hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/10"
                      >
                        <span>Lire l'article</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateTo('/blog');
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/90 px-4 py-3 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-900 transition-all"
                      >
                        <Compass className="h-4 w-4 text-neutral-400" />
                        <span>Explorer tous les articles</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        ) : (
          /* Elegant Empty State when no articles exist */
          <div className="mt-10 rounded-3xl border border-neutral-850 bg-neutral-900/30 p-8 sm:p-14 text-center backdrop-blur-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="mt-5 font-display text-xl font-bold text-white">
              Prochains articles en cours de rédaction
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
              Nos analyses stratégiques, méthodes d'apprentissage accéléré et dossiers exclusifs sont en préparation. Explorez en attendant notre catalogue de livres audio professionnels.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigateTo('/catalogue')}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-amber-400 active:scale-95 transition-all shadow-md shadow-amber-500/10"
              >
                <span>Découvrir nos livres audio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/blog')}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
              >
                <span>Explorer tous les articles</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
