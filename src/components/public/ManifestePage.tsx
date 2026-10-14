import React, { useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Sparkles,
  Target,
  Mic2,
  Zap,
  Clock,
  BookOpen,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const ManifestePage: React.FC = () => {
  const { navigateTo } = useApp();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      <Header />

      <main className="flex-1 py-12 sm:py-20 relative overflow-hidden">
        {/* Ambient lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(245,158,11,0.12),transparent)] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Back to Home Button */}
          <div className="mb-8">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2 text-xs font-semibold text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Revenir à l'accueil</span>
            </button>
          </div>

          {/* Hero Section of the Manifest */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Manifeste & Raison d'Être</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Pourquoi VISION BOOKS redéfinit l'apprentissage audio professionnel
            </h1>

            <p className="mt-6 text-base sm:text-lg leading-relaxed text-neutral-300">
              Dans un monde submergé par le bruit digital et l'infobésité, VISION BOOKS est née d'une exigence : offrir aux leaders, créateurs d'entreprises et visionnaires une source de savoir audio épurée, dense et profondément stimulante.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="group relative rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 transition-all hover:border-amber-500/40 hover:bg-neutral-900 shadow-lg"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 transition-colors group-hover:bg-amber-500 group-hover:text-neutral-950">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h2 className="mt-5 font-display text-xl font-bold text-white">
                    {pillar.title}
                  </h2>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-neutral-400">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Summary / Proof Banner */}
          <div className="mt-16 rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 p-8 sm:p-10 shadow-xl">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                  <BookOpen className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Rejoignez plus de 12 000 auditeurs exigeants
                  </h3>
                  <p className="text-sm text-neutral-400 mt-1">
                    Accès instantané à l'ensemble des titres sur smartphone, tablette et ordinateur.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Garantie d'écoute 30 jours satisfait ou remboursé</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Revenir à l'accueil</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('/produits')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-7 py-3.5 text-sm font-bold text-neutral-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <BookOpen className="h-4 w-4 stroke-[2.2]" />
              <span>Découvrir tous les livres audio</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
