import React, { useState, useEffect } from 'react';
import { Target, Mic2, Zap, Clock, BookOpen, CheckCircle2, ArrowRight, X, ArrowLeft, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AboutSection: React.FC = () => {
  const { navigateTo } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pillars content
  const pillars = [
    {
      icon: Target,
      title: 'Sélection Éditoriale Sans Compromis',
      description:
        'Nous ne publions pas des centaines de titres superflus. Chaque livre audio est rigoureusement sélectionné pour son retour sur investissement concret et sa pertinence opérationnelle.',
    },
    {
      icon: Mic2,
      title: 'Narration Studio Haute Définition',
      description:
        'Fini les voix monocordes ou générées à la chaîne sans âme. Nos comédiens voix-off professionnels incarnent chaque concept avec clarté, rythme et conviction.',
    },
    {
      icon: Zap,
      title: "Focalisation sur l'Action Immédiate",
      description:
        "Chaque œuvre audio est complétée par des plans d'action et des synthèses clés pour transformer chaque chapitre écouté en compétence exécutable.",
    },
    {
      icon: Clock,
      title: 'Optimisation de Votre Temps Précieux',
      description:
        'Idéal pour rentabiliser vos transports, séances sportives ou moments de transition. Apprenez en immersion sans empiéter sur votre journée de travail.',
    },
  ];

  // Close modal on Escape key and prevent body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  return (
    <>
      {/* Compact & Elegant Teaser Block on Homepage */}
      <section
        id="a-propos"
        className="relative border-b border-neutral-800 bg-neutral-900/30 py-12 sm:py-16 overflow-hidden"
      >
        {/* Subtle ambient lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.08),transparent)] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/80 p-6 sm:p-10 text-center shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-neutral-700/80 transition-all duration-300">
            {/* Subtle decorative glow border on top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Manifeste & Raison d'Être</span>
            </div>

            {/* Title */}
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white text-balance max-w-3xl mx-auto">
              Pourquoi VISION BOOKS redéfinit l'apprentissage audio professionnel
            </h2>

            {/* Short Catchy Teaser */}
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-neutral-400 max-w-2xl mx-auto">
              Dans un monde submergé par le bruit digital et l'infobésité, découvrez notre vision d'une éducation audio sans compromis pour les leaders et bâtisseurs de demain.
            </p>

            {/* Action Button to Open Manifest */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-7 py-3.5 text-sm font-bold text-neutral-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <BookOpen className="h-4 w-4 stroke-[2.2]" />
                <span>Découvrir notre manifeste</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Elegant Full Manifest Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manifeste-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800/80 bg-neutral-950/95 px-6 py-4 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                    Manifeste & Raison d'Être
                  </div>
                  <div className="text-xs text-neutral-400">VISION BOOKS Édition</div>
                </div>
              </div>

              {/* Close / Return Button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer"
                title="Fermer et revenir à l'accueil"
              >
                <X className="h-4 w-4" />
                <span>Fermer</span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10">
              {/* Main Headline & Full Description */}
              <div className="text-center max-w-3xl mx-auto">
                <h3
                  id="manifeste-modal-title"
                  className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight"
                >
                  Pourquoi VISION BOOKS redéfinit l'apprentissage audio professionnel
                </h3>
                <p className="mt-5 text-base sm:text-lg leading-relaxed text-neutral-300">
                  Dans un monde submergé par le bruit digital et l'infobésité, VISION BOOKS est née d'une exigence : offrir aux leaders, créateurs d'entreprises et visionnaires une source de savoir audio épurée, dense et profondément stimulante.
                </p>
              </div>

              {/* Pillars Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                {pillars.map((pillar, idx) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={idx}
                      className="group relative rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition-all hover:border-amber-500/40 hover:bg-neutral-900"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 transition-colors group-hover:bg-amber-500 group-hover:text-neutral-950">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h4 className="mt-4 font-display text-lg font-semibold text-white">
                        {pillar.title}
                      </h4>
                      <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
                        {pillar.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Summary banner */}
              <div className="rounded-xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 p-6 sm:p-8">
                <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h5 className="text-base font-semibold text-white">
                        Rejoignez plus de 12 000 auditeurs exigeants
                      </h5>
                      <p className="text-sm text-neutral-400 mt-0.5">
                        Accès instantané à l'ensemble des titres sur smartphone, tablette et ordinateur.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Garantie d'écoute 30 jours satisfait ou remboursé</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Bar */}
            <div className="border-t border-neutral-800/80 bg-neutral-950 px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Revenir à l'accueil</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  navigateTo('/produits');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                <span>Explorer le catalogue de livres</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
