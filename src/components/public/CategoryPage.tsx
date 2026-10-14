import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from './Header';
import { Footer } from './Footer';
import { ProductCard } from './ProductCard';
import { AudioPreviewModal } from './AudioPreviewModal';
import { ArrowLeft, BookOpen, Layers, Sparkles, Headphones, ShieldCheck, ArrowRight, Tag } from 'lucide-react';
import { SafeImage } from '../common/SafeImage';

import { sortCategoriesStrategically } from '../../context/AppContext';
import { DEFAULT_CATEGORY_IMAGES } from './CategoriesSection';

interface CategoryPageProps {
  slug: string;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({ slug }) => {
  const { categories, products, navigateTo, setActivePreviewProduct } = useApp();

  // Find category by slug (or id)
  const currentCategory = useMemo(() => {
    return categories.find(
      (c) =>
        c.slug.toLowerCase() === slug.toLowerCase() ||
        c.id.toLowerCase() === slug.toLowerCase()
    );
  }, [categories, slug]);

  // All active products belonging to this category
  const categoryProducts = useMemo(() => {
    if (!currentCategory) return [];
    return products.filter(
      (p) =>
        p.is_active &&
        (p.category === currentCategory.slug ||
          p.category === currentCategory.id ||
          (p as any).categoryId === currentCategory.id)
    );
  }, [products, currentCategory]);

  // Other active categories for cross-navigation (sorted strategically with Autres in last position)
  const otherCategories = useMemo(() => {
    return sortCategoriesStrategically(
      categories.filter((c) => c.is_active && c.slug !== slug && c.id !== slug)
    );
  }, [categories, slug]);

  const defaultFallback = currentCategory ? (DEFAULT_CATEGORY_IMAGES[currentCategory.slug] || '/assets/images/cat_entrepreneuriat.jpg') : '/assets/images/cat_entrepreneuriat.jpg';
  const catImage = currentCategory?.image || currentCategory?.imageUrl || currentCategory?.cover || defaultFallback;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      <Header />

      <main className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-neutral-400 mb-8 overflow-x-auto whitespace-nowrap">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/');
              }}
              className="flex items-center gap-1 hover:text-amber-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Accueil</span>
            </a>
            <span className="text-neutral-600">/</span>
            <a
              href="/#categories"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/#categories');
              }}
              className="hover:text-amber-400 transition-colors"
            >
              Catégories
            </a>
            <span className="text-neutral-600">/</span>
            <span className="font-semibold text-white">
              {currentCategory ? currentCategory.name : slug}
            </span>
          </nav>

          {/* Category Hero Banner with rich illustration */}
          {currentCategory ? (
            <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-950 p-6 sm:p-10 shadow-2xl">
              {/* Blurred background image backdrop if image is available */}
              {catImage && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                  <SafeImage
                    src={catImage}
                    alt={currentCategory.name}
                    className="h-full w-full object-cover blur-2xl scale-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-neutral-950/90" />
                </div>
              )}

              {/* Decorative radial glows */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left side: Information, Title, Description, Badges */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Thématique d'apprentissage</span>
                    <span className="text-neutral-600">•</span>
                    <span className="font-mono text-[11px] text-amber-300">
                      /{currentCategory.slug}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-neutral-800/80 border border-neutral-700/80 text-3xl sm:text-4xl shadow-inner">
                      <span role="img" aria-label={currentCategory.name}>
                        {currentCategory.icon}
                      </span>
                    </div>
                    <div>
                      <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                        {currentCategory.name}
                      </h1>
                    </div>
                  </div>

                  <p className="max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-neutral-300 pt-1">
                    {currentCategory.description ||
                      'Découvrez notre sélection de livres audio haute définition pour développer cette compétence clé.'}
                  </p>

                  {/* Highlights / Badges */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-4 py-2 backdrop-blur-sm">
                      <div className="font-mono text-xl font-extrabold text-amber-400">
                        {categoryProducts.length}
                      </div>
                      <div className="text-[11px] font-medium text-neutral-400">
                        {categoryProducts.length > 1
                          ? 'Livres audio disponibles'
                          : 'Livre audio disponible'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/80 px-4 py-3 text-xs text-neutral-300 backdrop-blur-sm">
                      <Headphones className="h-4 w-4 text-amber-400" />
                      <span>Studio Master HD 320 kbps</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950/80 px-4 py-3 text-xs text-neutral-300 backdrop-blur-sm">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Accès instantané & illimité</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Illustrated Cover Card */}
                <div className="lg:col-span-4 flex justify-center lg:justify-end">
                  <div className="relative w-full max-w-xs sm:max-w-sm rounded-2xl border border-neutral-800/90 bg-neutral-950/90 p-3 shadow-2xl group overflow-hidden">
                    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-neutral-900 border border-neutral-800">
                      {catImage ? (
                        <SafeImage
                          src={catImage}
                          alt={currentCategory.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          fallbackSrc="/assets/images/cover_business_empire_1790615532791.jpg"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-800 via-amber-950/30 to-neutral-950 p-6 text-center">
                          <span className="text-5xl" role="img" aria-label={currentCategory.name}>
                            {currentCategory.icon}
                          </span>
                          <span className="mt-2 font-display text-xs font-bold text-amber-400">
                            {currentCategory.name}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                        <span className="flex items-center gap-1 font-semibold text-[11px] text-amber-300">
                          <Tag className="h-3 w-3" />
                          Collection certifiée
                        </span>
                        <span className="font-mono text-[10px] text-neutral-300 bg-black/60 px-2 py-0.5 rounded">
                          {currentCategory.icon} {categoryProducts.length} audio
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
              <h1 className="font-display text-2xl font-bold text-white">
                Catégorie introuvable
              </h1>
              <p className="mt-2 text-xs text-neutral-400">
                La thématique demandée "{slug}" n'existe pas ou a été déplacée.
              </p>
              <button
                onClick={() => navigateTo('/')}
                className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-400 cursor-pointer"
              >
                Retourner à l'accueil
              </button>
            </div>
          )}

          {/* Products List */}
          <div className="mt-12">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" />
                <h2 className="font-display text-lg font-bold text-white">
                  Tous les livres audio de cette catégorie
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {categoryProducts.length} résultat{categoryProducts.length > 1 ? 's' : ''}
              </span>
            </div>

            {categoryProducts.length > 0 ? (
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryName={
                      currentCategory
                        ? `${currentCategory.icon} ${currentCategory.name}`
                        : undefined
                    }
                    onPlayPreview={() => setActivePreviewProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="my-16 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center">
                <Layers className="mx-auto h-10 w-10 text-neutral-600" />
                <h3 className="mt-4 font-display text-base font-bold text-white">
                  Aucun livre audio actif dans cette catégorie
                </h3>
                <p className="mt-1.5 text-xs text-neutral-400 max-w-md mx-auto">
                  De nouveaux ouvrages pour cette thématique sont en cours de mastering audio et seront bientôt disponibles.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('/');
                    }}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:bg-amber-400 shadow-sm cursor-pointer"
                  >
                    Explorer tout le catalogue
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Other Categories Section */}
          {otherCategories.length > 0 && (
            <div className="mt-20 border-t border-neutral-800/80 pt-12">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Explorer d'autres thématiques
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400">
                    Élargissez vos compétences en découvrant nos autres domaines de formation audio.
                  </p>
                </div>
                <a
                  href="/#categories"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400 cursor-pointer"
                >
                  <span>Toutes les catégories</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {otherCategories.slice(0, 8).map((cat) => (
                  <a
                    key={cat.id}
                    href={`/categorie/${cat.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo(`/categorie/${cat.slug}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 transition-all hover:border-amber-500/50 hover:bg-neutral-900 hover:shadow-lg cursor-pointer"
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                        {cat.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        Découvrir les livres →
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <AudioPreviewModal />
    </div>
  );
};
