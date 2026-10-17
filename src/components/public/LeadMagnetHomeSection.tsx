import React, { useState, useEffect } from 'react';
import {
  Gift,
  ArrowRight,
  CheckCircle2,
  Download,
  ShieldCheck,
  Sparkles,
  X,
  MessageCircle,
  FileText,
  Lock,
  ExternalLink,
  BookOpen,
  Headphones,
  Package,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';
import {
  trackLeadSubmit,
  trackLeadMagnetDownload,
  trackLeadMagnetClick,
  trackLeadMagnetView,
} from '../../services/analytics';

export const LeadMagnetHomeSection: React.FC = () => {
  const { leadMagnets, addLead, showToast, navigateTo } = useApp();

  // Active lead magnet
  const activeMagnet = leadMagnets.find((lm) => lm.is_active !== false) || leadMagnets[0];

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state inside modal
  const [firstName, setFirstName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadReady, setDownloadReady] = useState<string | null>(null);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      if (activeMagnet) {
        trackLeadMagnetView(activeMagnet.slug, `/lead-magnet/${activeMagnet.slug}`);
      }
    } else {
      document.body.style.overflow = '';
      setErrorMessage('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, activeMagnet]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  if (!activeMagnet) return null;

  // Safe benefits parser
  const parseBenefits = (): string[] => {
    const raw = activeMagnet.benefits;
    if (!raw) {
      return [
        'Accès immédiat et 100% sans frais',
        'Synthèse actionnable en 20 minutes',
        'Fiche mémo et modèle décisionnel inclus',
        'Consultable directement sur mobile et PC',
      ];
    }
    if (Array.isArray(raw)) {
      const filtered = raw.filter((b): b is string => Boolean(b));
      if (filtered.length > 0) return filtered;
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((b): b is string => Boolean(b));
        }
      } catch {
        const lines = raw
          .split(/\r?\n/)
          .map((line: string) => line.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean);
        if (lines.length > 0) return lines;
      }
    }
    return [
      'Accès immédiat et 100% sans frais',
      'Synthèse actionnable en 20 minutes',
      'Fiche mémo et modèle décisionnel inclus',
      'Consultable directement sur mobile et PC',
    ];
  };

  const benefitsList = parseBenefits();

  const handleOpenModal = () => {
    if (activeMagnet) {
      trackLeadMagnetClick(activeMagnet.slug, '/#ressource-gratuite');
    }
    setIsModalOpen(true);
  };

  const triggerDownloadFile = (url: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      const sourceExtension = url.split('?')[0].split('.').pop()?.toLowerCase() || 'txt';
      const safeExtension = ['pdf', 'mp3', 'epub', 'zip', 'docx', 'txt'].includes(sourceExtension) ? sourceExtension : 'txt';
      link.download = `${activeMagnet.slug || 'guide-offert'}.${safeExtension}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Direct file download error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firstName.trim()) {
      setErrorMessage('Veuillez renseigner votre prénom.');
      return;
    }

    const cleanDigits = whatsapp.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 8 || cleanDigits.length > 16) {
      setErrorMessage(
        'Veuillez renseigner un numéro WhatsApp valide avec indicatif pays (ex: +33 6 12 34 56 78 ou +221 77 123 45 67) d\'au moins 8 chiffres.'
      );
      return;
    }

    try {
      setLoading(true);
      const res = await addLead({
        first_name: firstName.trim(),
        whatsapp: whatsapp.trim(),
        lead_magnet_id: activeMagnet.id,
        source: 'Modale Cadeau Gratuit (Accueil)',
      });

      trackLeadSubmit(
        activeMagnet.id,
        typeof window !== 'undefined' ? window.location.pathname : '/'
      );

      const downloadUrl =
        res.download_url ||
        activeMagnet.file_url ||
        activeMagnet.download_url ||
        '/downloads/guide-visionbooks.txt';

      trackLeadMagnetDownload(whatsapp.trim(), '/');

      setDownloadReady(downloadUrl);
      showToast('Félicitations ! Votre guide gratuit est prêt.', 'success');

      // Auto trigger download
      triggerDownloadFile(downloadUrl);

      // Persist in session storage
      try {
        sessionStorage.setItem(
          'vision_books_last_lead',
          JSON.stringify({
            firstName: firstName.trim(),
            whatsapp: whatsapp.trim(),
            leadMagnetTitle: activeMagnet.title || 'Guide Offert',
            downloadUrl,
            downloadInitiated: true,
            timestamp: Date.now(),
          })
        );
      } catch {}
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
      showToast(err.message || 'Erreur lors de l\'enregistrement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Format indicator
  const renderFormatBadge = () => {
    const fmt = (activeMagnet.format || 'ebook').toLowerCase();
    if (fmt === 'audiobook') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
          <Headphones className="h-3 w-3 text-amber-400" />
          <span>Livre audio 🎧</span>
        </span>
      );
    }
    if (fmt === 'other') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
          <Package className="h-3 w-3 text-amber-400" />
          <span>Dossier stratégique 📦</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
        <BookOpen className="h-3 w-3 text-amber-400" />
        <span>Ebook PDF 📚</span>
      </span>
    );
  };

  return (
    <>
      {/* 1. BLOC PROMOTIONNEL COMPACT ET PREMIUM SUR LA PAGE D'ACCUEIL */}
      <section
        id="ressource-gratuite"
        className="relative overflow-hidden border-b border-neutral-800/80 bg-gradient-to-b from-neutral-950 via-neutral-900/50 to-neutral-950 py-12 sm:py-16"
      >
        {/* Glow highlight */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-neutral-900/90 via-neutral-900/60 to-neutral-950/90 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-md">
            {/* Ambient luxury light bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              {/* Left teaser info */}
              <div className="flex-1 space-y-3 sm:space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Badge « Cadeau offert » requis */}
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 shadow-sm">
                    <Gift className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Cadeau offert</span>
                  </div>

                  {renderFormatBadge()}

                  <span className="hidden sm:inline-block text-neutral-600">•</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Sparkles className="h-3 w-3" />
                    <span>100% Gratuit & Immédiat</span>
                  </span>
                </div>

                {/* Accroche percutante et courte */}
                <div>
                  <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                    {activeMagnet.title || 'Guide Pratique : Les Fondements du Succès'}
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
                    {activeMagnet.subtitle ||
                      'Condensez les meilleures stratégies d\'affaires, frameworks décisionnels et plans d\'action concrets pour démultiplier vos résultats sans frais.'}
                  </p>
                </div>

                {/* Micro arguments rassurance */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Accès direct sans carte bancaire</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Format condensé à haute valeur ajoutée</span>
                  </div>
                </div>
              </div>

              {/* Right CTA Area & Thumbnail */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3.5 shrink-0 pt-2 lg:pt-0">
                {/* Bouton bien visible « Recevoir mon guide gratuit » */}
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-6 sm:px-8 py-3.5 text-xs sm:text-sm font-extrabold text-neutral-950 shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <Gift className="h-4 w-4 stroke-[2.5]" />
                  <span>Recevoir mon guide gratuit</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </button>

                {/* Lien élégant vers la page complète dédiée */}
                <button
                  type="button"
                  onClick={() => navigateTo(`/lead-magnet/${activeMagnet.slug}`)}
                  className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-neutral-400 hover:text-amber-300 transition-colors text-center"
                >
                  <span>Découvrir la page de présentation complète</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MODALE ÉLÉGANTE DE PRÉSENTATION & CAPTURE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop avec flou */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
          />

          {/* Container modale */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-3xl my-auto rounded-3xl border border-amber-500/40 bg-neutral-900/98 shadow-2xl shadow-amber-500/10 p-5 sm:p-8 max-h-[92vh] overflow-y-auto text-neutral-100 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header modale */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pr-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Gift className="h-3.5 w-3.5 text-amber-400" />
                <span>Cadeau offert</span>
              </span>
              {renderFormatBadge()}
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>Accès 100% sans frais</span>
              </span>
            </div>

            {/* Corps de la modale en 2 colonnes sur tablette/desktop */}
            <div className="grid gap-6 md:grid-cols-12 md:gap-8 items-start">
              {/* Colonne gauche : Titre, Description complète, Avantages */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                    {activeMagnet.title}
                  </h3>
                  {activeMagnet.subtitle && (
                    <p className="mt-1 text-xs sm:text-sm font-medium text-amber-400">
                      {activeMagnet.subtitle}
                    </p>
                  )}
                </div>

                {/* Image miniature / Mockup */}
                {activeMagnet.image && (
                  <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 aspect-[16/9] max-h-44 w-full">
                    <SafeImage
                      src={activeMagnet.image}
                      alt={activeMagnet.title}
                      title={activeMagnet.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-3 rounded bg-neutral-900/90 px-2 py-0.5 font-mono text-[10px] text-amber-300 border border-neutral-800">
                      Édition Exclusive VISION BOOKS
                    </span>
                  </div>
                )}

                {/* Description complète */}
                <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                    <span>Présentation du guide</span>
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-300">
                    {activeMagnet.description}
                  </p>
                  {activeMagnet.marketing_content && (
                    <p className="text-xs italic text-amber-200/90 pt-1 border-t border-neutral-800/80">
                      « {activeMagnet.marketing_content} »
                    </p>
                  )}
                </div>

                {/* Avantages du guide */}
                <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-4 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Les avantages inclus :</span>
                  </h4>
                  <ul className="space-y-2">
                    {benefitsList.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-neutral-200">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span className="leading-snug">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Lien pour ouvrir la page dédiée */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      navigateTo(`/lead-magnet/${activeMagnet.slug}`);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-amber-400 transition-colors underline underline-offset-4"
                  >
                    <span>Consulter la page complète et partageable de cette ressource</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Colonne droite : Formulaire prénom & WhatsApp + Bouton de téléchargement */}
              <div className="md:col-span-5">
                <div className="rounded-2xl border-2 border-amber-500/30 bg-neutral-950 p-5 sm:p-6 shadow-xl">
                  {downloadReady ? (
                    /* Téléchargement débloqué avec succès */
                    <div className="py-4 text-center space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="font-display text-base font-bold text-white">
                          Téléchargement débloqué !
                        </h4>
                        <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                          Le guide s'est lancé sur votre appareil. S'il n'a pas démarré automatiquement, cliquez sur le bouton ci-dessous :
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerDownloadFile(downloadReady)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                      >
                        <Download className="h-4 w-4" />
                        <span>Télécharger à nouveau</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="w-full text-xs text-neutral-400 hover:text-white transition-colors pt-2"
                      >
                        Fermer et continuer ma navigation
                      </button>
                    </div>
                  ) : (
                    /* Formulaire de capture */
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <h4 className="font-display text-base font-bold text-white">
                          Débloquer mon exemplaire
                        </h4>
                        <p className="mt-1 text-xs text-neutral-400">
                          Remplissez ces 2 informations pour obtenir l'accès immédiat.
                        </p>
                      </div>

                      {/* Message de réassurance */}
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200/90">
                        « Votre numéro WhatsApp nous permet uniquement de vous transmettre votre ressource offerte. Zéro spam, données confidentielles. »
                      </div>

                      {errorMessage && (
                        <div className="rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-200">
                          {errorMessage}
                        </div>
                      )}

                      {/* Champ Prénom */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                          Votre prénom <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Ex : Alexandre"
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                        />
                      </div>

                      {/* Champ WhatsApp */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                          Votre numéro WhatsApp <span className="text-amber-400">*</span>
                        </label>
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                          <input
                            type="tel"
                            required
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="+33 6 12 34 56 78 ou +221 77 123 45 67"
                            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-base sm:text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors font-mono"
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-neutral-500">
                          Avec indicatif pays (+33, +221, +229, etc.)
                        </p>
                      </div>

                      {/* Bouton de téléchargement */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 py-3 text-xs font-bold text-neutral-950 hover:from-amber-400 hover:to-amber-300 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
                            <span>Déblocage en cours...</span>
                          </div>
                        ) : (
                          <>
                            <Download className="h-4 w-4 stroke-[2.5]" />
                            <span>Télécharger mon guide gratuit</span>
                          </>
                        )}
                      </button>

                      {/* Réassurance de sécurité */}
                      <div className="pt-2 space-y-1.5 text-[10px] text-neutral-400 border-t border-neutral-800/80">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>Téléchargement sans carte bancaire ni engagement</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                          <span>Données chiffrées et strictement protégées</span>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
