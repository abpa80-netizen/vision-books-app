import React from 'react';
import { Play, Volume2, Shield, ArrowRight, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';

export const Hero: React.FC = () => {
  const { products, setActivePreviewProduct } = useApp();
  const featuredProduct =
    products.find((p) => p.is_active && (p.is_best_seller || p.isBestSeller)) ||
    products.find((p) => p.is_active) ||
    products[0];

  return (
    <section className="relative overflow-hidden border-b border-neutral-800 bg-neutral-950 py-16 lg:py-24">
      {/* Subtle radial ambient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Text Left Column */}
          <div className="lg:col-span-7">
            {/* Clean unboxed kicker */}
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
              <span>Bibliothèque Audio Haute Définition</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>Édition 2026</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl text-balance">
              L'excellence audio pour les esprits qui bâtissent le futur.
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-neutral-300">
              <strong className="text-white font-semibold">VISION BOOKS</strong> transforme le temps perdu de vos trajets et séances de sport en levier de croissance stratégique. Accédez aux synthèses et livres audio les plus percutants en Business, Finance, Mindset et Investissement, enregistrés par des voix de studio d'élite.
            </p>

            {/* Promesses éditoriales vérifiables, sans statistiques non confirmées */}
            <div className="mt-8 grid grid-cols-1 gap-3 border-y border-neutral-800 py-5 sm:grid-cols-3 sm:gap-5">
              <div className="flex items-start gap-2.5">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Sans abonnement</div>
                  <div className="mt-1 text-xs leading-relaxed text-neutral-400">Achetez les titres qui correspondent à vos objectifs.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Écoute à vie</div>
                  <div className="mt-1 text-xs leading-relaxed text-neutral-400">Accès durable après achat, selon les conditions de chaque titre.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Choix par objectif</div>
                  <div className="mt-1 text-xs leading-relaxed text-neutral-400">Explorez le business, la finance, le mindset et plus encore.</div>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#bestsellers"
                className="flex items-center gap-2.5 rounded-lg bg-amber-500 px-6 py-3.5 text-sm font-semibold text-neutral-950 transition-all hover:bg-amber-400 hover:shadow-lg active:scale-95"
              >
                <span>Explorer les Best-Sellers</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              {featuredProduct && (
                <button
                  onClick={() => setActivePreviewProduct(featuredProduct)}
                  className="flex items-center gap-2.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-5 py-3.5 text-sm font-medium text-white transition-all hover:border-neutral-700 hover:bg-neutral-800 active:scale-95"
                >
                  <Play className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span>Écouter un extrait gratuit</span>
                </button>
              )}
            </div>

            {/* Guarantee note */}
            <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
              <Shield className="h-3.5 w-3.5 text-amber-500" />
              <span>Accès à vie après achat, sans abonnement. Consultez chaque fiche pour connaître le format et les conditions d’accès.</span>
            </div>
          </div>

          {/* Visual Right Column */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Card visual frame */}
              <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-2 shadow-2xl backdrop-blur-sm">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-neutral-950">
                  <SafeImage
                    src="/assets/images/hero_vision_books_1790615521205.jpg"
                    alt="Auditeur concentré avec casque haut de gamme écoutant VISION BOOKS"
                    title="VISION BOOKS — Masterclasses Audio"
                    subtitle="L'Élite du Business et du Savoir Stratégique"
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-transparent" />

                  {/* Audio player card overlay */}
                  <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-neutral-800/80 bg-neutral-950/85 p-4 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-neutral-950">
                          <Volume2 className="h-5 w-5 animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {featuredProduct ? featuredProduct.title : "L'Empire du Business Moderne"}
                          </p>
                          <p className="truncate text-[11px] text-neutral-400">
                            {featuredProduct ? `Par ${featuredProduct.author}` : "Voix studio professionnelle"}
                          </p>
                        </div>
                      </div>

                      {featuredProduct && (
                        <button
                          onClick={() => setActivePreviewProduct(featuredProduct)}
                          className="shrink-0 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-neutral-700"
                        >
                          Écouter
                        </button>
                      )}
                    </div>

                    {/* Progress wave simulation */}
                    <div className="mt-3 flex items-center gap-1">
                      {[40, 65, 30, 85, 95, 60, 45, 75, 100, 70, 50, 80, 60, 35, 90, 70, 45, 60, 80, 50, 30].map(
                        (h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full ${i < 11 ? 'bg-amber-500' : 'bg-neutral-700'}`}
                            style={{ height: `${h * 0.22}px` }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
