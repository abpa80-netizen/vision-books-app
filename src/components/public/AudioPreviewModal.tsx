import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, X, RotateCcw, RotateCw, CheckCircle, Headphones, Gift } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SafeImage } from '../common/SafeImage';

export const AudioPreviewModal: React.FC = () => {
  const { activePreviewProduct, setActivePreviewProduct, showToast, navigateTo } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(120);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rawAudioSrc = activePreviewProduct?.audio_url || activePreviewProduct?.audioPreviewUrl || '';
  const audioSrc = rawAudioSrc.includes('coffee_shop.ogg') ? '' : rawAudioSrc;
  const totalDuration = duration;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(120);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.muted = false;
    }
    setIsMuted(false);
  }, [activePreviewProduct?.id]);

  const toggleAudio = async () => {
    if (!audioRef.current || !audioSrc) {
      showToast("Aucun extrait audio n’a encore été ajouté pour ce titre.", "info");
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.warn("Audio preview could not start:", error);
      setIsPlaying(false);
      showToast("Impossible de lire cet extrait. Vérifiez le fichier audio.", "error");
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    if (Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
    }
  };

  if (!activePreviewProduct) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const hasPromo =
    activePreviewProduct.sale_price !== null &&
    activePreviewProduct.sale_price !== undefined &&
    activePreviewProduct.sale_price < activePreviewProduct.normal_price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current && Number.isFinite(audioRef.current.duration)) setDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
        preload={audioSrc ? "metadata" : "none"}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => setActivePreviewProduct(null)}
          className="absolute right-4 top-4 rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
          aria-label="Fermer l'écouteur"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top Info */}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
          <Headphones className="h-4 w-4" />
          <span>{audioSrc ? "Extrait audio découverte" : "Présentation du livre"}</span>
        </div>

        {/* Book Presentation */}
        <div className="mt-5 flex gap-4">
          <SafeImage
            src={activePreviewProduct.cover || activePreviewProduct.coverUrl}
            alt={activePreviewProduct.title}
            title={activePreviewProduct.title}
            subtitle={activePreviewProduct.author}
            className="h-28 w-20 shrink-0 rounded-lg object-cover shadow-md bg-neutral-900"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-white">
              {activePreviewProduct.title}
            </h3>
            <p className="mt-1 text-xs text-neutral-300">
              Auteur : <span className="font-medium text-white">{activePreviewProduct.author}</span>
            </p>
            <p className="mt-0.5 text-xs text-neutral-400 line-clamp-2">
              {activePreviewProduct.short_description || activePreviewProduct.summary}
            </p>
            {activePreviewProduct.bonus && (
              <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-400">
                <Gift className="h-3 w-3 shrink-0" />
                <span className="truncate">Inclus : {activePreviewProduct.bonus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Waveform Display */}
        <div className="mt-6 flex h-14 items-center justify-between gap-1 rounded-xl bg-neutral-900/80 px-4 py-2">
          {[20, 45, 70, 95, 60, 40, 80, 100, 75, 50, 85, 60, 40, 90, 100, 70, 45, 60, 80, 50, 65, 90, 80, 45, 60, 85, 95, 65, 40, 60, 30].map(
            (val, i) => {
              const progressFraction = currentTime / totalDuration;
              const barFraction = i / 31;
              const isPast = Boolean(audioSrc) && barFraction <= progressFraction;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isPast ? 'bg-amber-400' : 'bg-neutral-700'
                  }`}
                  style={{
                    height: `${audioSrc && isPlaying ? Math.max(12, val * (isPast ? 0.45 : 0.35)) : 10}px`,
                  }}
                />
              );
            }
          )}
        </div>

        {/* Time Scrubber */}
        <div className="mt-3 flex items-center justify-between font-mono text-xs text-neutral-400 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span className="text-neutral-600">/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Player Controls */}
        <div className="mt-4 flex items-center justify-between border-t border-neutral-800/80 pt-4">
          <button
            disabled={!audioSrc}
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (audioRef.current) audioRef.current.muted = nextMuted;
            }}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-3">
            <button
              disabled={!audioSrc}
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                  setCurrentTime(audioRef.current.currentTime);
                }
              }}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
              title="Reculer de 10s"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <button
              onClick={toggleAudio}
              disabled={!audioSrc}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-neutral-950 shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-neutral-950" />
              ) : (
                <Play className="h-5 w-5 fill-neutral-950 ml-0.5" />
              )}
            </button>

            <button
              disabled={!audioSrc}
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.min(totalDuration, audioRef.current.currentTime + 10);
                  setCurrentTime(audioRef.current.currentTime);
                }
              }}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
              title="Avancer de 10s"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>

          <div className="w-9" />
        </div>

        {/* Action Bottom */}
        <div className="mt-6 flex items-center justify-between rounded-xl bg-neutral-900/60 p-4">
          <div>
            <div className="text-[11px] text-neutral-400">Accès intégral immédiat</div>
            {hasPromo ? (
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xl font-bold tabular-nums text-amber-400">
                  {activePreviewProduct.sale_price!.toFixed(2)} €
                </span>
                <span className="font-mono text-xs text-neutral-500 line-through tabular-nums">
                  {activePreviewProduct.normal_price.toFixed(2)} €
                </span>
              </div>
            ) : (
              <div className="font-mono text-xl font-bold tabular-nums text-white">
                {activePreviewProduct.normal_price.toFixed(2)} €
              </div>
            )}
          </div>

          <button
            onClick={() => {
              const slug = activePreviewProduct.slug;
              setActivePreviewProduct(null);
              navigateTo(`/produit/${slug}`);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-neutral-950 hover:bg-amber-400 active:scale-95 transition-transform cursor-pointer"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Voir & Commander</span>
          </button>
        </div>
      </div>
    </div>
  );
};
