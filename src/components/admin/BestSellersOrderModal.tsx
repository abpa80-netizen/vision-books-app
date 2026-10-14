import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Star,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  Check,
  AlertCircle,
  Sparkles,
  BookOpen,
  Trash2,
  ListOrdered
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { SafeImage } from '../common/SafeImage';

interface BestSellersOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BestSellersOrderModal: React.FC<BestSellersOrderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, settings, updateSettings, updateProduct, showToast } = useApp();

  // 6 fixed positions (index 0 to 5 for slots 1 to 6)
  const [slotIds, setSlotIds] = useState<string[]>(['', '', '', '', '', '']);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Filter only active products available in the catalog
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.is_active);
  }, [products]);

  // Map of products by ID for fast lookup
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    activeProducts.forEach((p) => map.set(p.id, p));
    return map;
  }, [activeProducts]);

  // Sync slots from settings when modal opens or settings change
  useEffect(() => {
    if (!isOpen) return;

    let savedIds: string[] = [];
    if (settings?.bestseller_order) {
      try {
        const parsed = JSON.parse(settings.bestseller_order);
        if (Array.isArray(parsed)) {
          savedIds = parsed.map((id) => (typeof id === 'string' ? id : ''));
        }
      } catch {
        savedIds = settings.bestseller_order.split(',').map((s) => s.trim());
      }
    }

    // Initialize 6 slots
    const initialSlots: string[] = ['', '', '', '', '', ''];
    const usedIds = new Set<string>();

    // 1. Fill saved slots (only with active products)
    savedIds.forEach((id, idx) => {
      if (idx < 6 && id && productMap.has(id)) {
        initialSlots[idx] = id;
        usedIds.add(id);
      }
    });

    // 2. If slots are empty, auto-fill with current bestsellers
    if (initialSlots.every((id) => !id)) {
      const defaultBs = activeProducts
        .filter((p) => p.is_best_seller || p.isBestSeller)
        .slice(0, 6);
      defaultBs.forEach((p, idx) => {
        initialSlots[idx] = p.id;
        usedIds.add(p.id);
      });
    }

    setSlotIds(initialSlots);
    setSavedSuccess(false);
  }, [isOpen, settings?.bestseller_order, activeProducts, productMap]);

  if (!isOpen) return null;

  // Handle changing a book for a specific slot
  const handleSelectProduct = (slotIndex: number, newId: string) => {
    setSlotIds((prev) => {
      const next = [...prev];
      // If the selected book is already in another slot, swap or clear that slot to avoid duplicate
      if (newId) {
        const existingIdx = next.findIndex((id) => id === newId);
        if (existingIdx !== -1 && existingIdx !== slotIndex) {
          next[existingIdx] = next[slotIndex]; // swap
        }
      }
      next[slotIndex] = newId;
      return next;
    });
  };

  // Move a slot up
  const handleMoveUp = (slotIndex: number) => {
    if (slotIndex <= 0) return;
    setSlotIds((prev) => {
      const next = [...prev];
      const temp = next[slotIndex - 1];
      next[slotIndex - 1] = next[slotIndex];
      next[slotIndex] = temp;
      return next;
    });
  };

  // Move a slot down
  const handleMoveDown = (slotIndex: number) => {
    if (slotIndex >= 5) return;
    setSlotIds((prev) => {
      const next = [...prev];
      const temp = next[slotIndex + 1];
      next[slotIndex + 1] = next[slotIndex];
      next[slotIndex] = temp;
      return next;
    });
  };

  // Clear a slot
  const handleClearSlot = (slotIndex: number) => {
    setSlotIds((prev) => {
      const next = [...prev];
      next[slotIndex] = '';
      return next;
    });
  };

  // Auto-fill all 6 slots with the first available bestsellers
  const handleAutoFill = () => {
    const next: string[] = ['', '', '', '', '', ''];
    const candidates = [
      ...activeProducts.filter((p) => p.is_best_seller || p.isBestSeller),
      ...activeProducts.filter((p) => !p.is_best_seller && !p.isBestSeller),
    ];
    candidates.slice(0, 6).forEach((p, i) => {
      next[i] = p.id;
    });
    setSlotIds(next);
    showToast('Positions remplies avec les livres recommandés.', 'info');
  };

  // Clear all slots
  const handleClearAll = () => {
    setSlotIds(['', '', '', '', '', '']);
  };

  // Save changes to Firestore
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Clean array of selected IDs
      const cleanIds = slotIds.map((id) => (id && productMap.has(id) ? id : ''));

      // 1. Save in Firestore Settings (real-time persistence)
      await updateSettings({
        bestseller_order: JSON.stringify(cleanIds),
      });

      // 2. Also sync bestseller_order on each product document
      const updatePromises: Promise<any>[] = [];
      cleanIds.forEach((id, index) => {
        if (id && productMap.has(id)) {
          const prod = productMap.get(id)!;
          if (prod.bestseller_order !== index + 1 || !prod.is_best_seller) {
            updatePromises.push(
              updateProduct(id, {
                bestseller_order: index + 1,
                is_best_seller: true,
              }).catch((e) => console.warn(`Sync notice for product ${id}:`, e))
            );
          }
        }
      });

      await Promise.all(updatePromises);

      setSavedSuccess(true);
      showToast('Ordre des 6 Best-Sellers enregistré avec succès.', 'success');
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error saving bestseller order:', err);
      showToast(err.message || 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const assignedCount = slotIds.filter((id) => id && productMap.has(id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Star className="h-5 w-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Ordre d'affichage des Best-Sellers</span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-400 border border-amber-500/30">
                  {assignedCount} / 6 configurés
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400">
                Organisez les 6 livres qui s'affichent sur la page d'accueil de la position 1 à 6.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 bg-neutral-950/40 px-5 sm:px-6 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Position 1 = Livre vedette affiché en premier sur mobile et desktop</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFill}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-850 px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3 w-3 text-amber-400" />
              <span>Remplir auto</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-850 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-neutral-800 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Vider</span>
            </button>
          </div>
        </div>

        {/* Slots List (Positions 1 to 6) */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
          {slotIds.map((currentId, index) => {
            const product = currentId ? productMap.get(currentId) : null;
            const positionNumber = index + 1;
            const isFirst = index === 0;
            const isLast = index === 5;

            return (
              <div
                key={index}
                className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                  product
                    ? 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                    : 'border-dashed border-neutral-800/80 bg-neutral-950/30'
                }`}
              >
                {/* Position Badge & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Position number pill */}
                  <div
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-black shadow-sm ${
                      isFirst
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 ring-2 ring-amber-500/40'
                        : product
                        ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                        : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                    }`}
                  >
                    #{positionNumber}
                  </div>

                  {/* Thumbnail if product selected */}
                  {product ? (
                    <div className="relative h-12 w-9 sm:h-14 sm:w-10 shrink-0 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900">
                      <SafeImage
                        src={product.cover || product.coverUrl}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-9 sm:h-14 sm:w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-800 bg-neutral-900/50 text-neutral-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  )}

                  {/* Dropdown Selector */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {isFirst ? 'Position N°1 — Vedette' : `Position N°${positionNumber}`}
                      </span>
                      {product && (
                        <span className="font-mono text-[11px] font-bold text-amber-400">
                          {product.sale_price ? `${product.sale_price.toFixed(2)} €` : `${product.normal_price.toFixed(2)} €`}
                        </span>
                      )}
                    </div>

                    <select
                      value={currentId}
                      onChange={(e) => handleSelectProduct(index, e.target.value)}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Emplacement vide (aucun livre) --</option>
                      {activeProducts.map((p) => {
                        const isAssignedElsewhere =
                          slotIds.includes(p.id) && p.id !== currentId;
                        const otherPos = isAssignedElsewhere
                          ? slotIds.indexOf(p.id) + 1
                          : null;

                        return (
                          <option key={p.id} value={p.id}>
                            {p.title} — {p.author}{' '}
                            {isAssignedElsewhere ? `(déjà en pos. #${otherPos})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Reorder Buttons & Clear */}
                <div className="flex items-center justify-end gap-1 border-t sm:border-t-0 border-neutral-850 pt-2 sm:pt-0">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMoveUp(index)}
                    title="Monter d'une position"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => handleMoveDown(index)}
                    title="Descendre d'une position"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>

                  {product && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot(index)}
                      title="Vider cet emplacement"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-red-950/30 hover:border-red-500/40 hover:text-red-400 transition-colors ml-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800 bg-neutral-950/70 px-5 sm:px-6 py-4">
          <div className="text-[11px] text-neutral-400 text-center sm:text-left">
            <span>
              Les modifications s'appliquent immédiatement à la page d'accueil et sont sauvegardées dans Firestore.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-amber-500/10"
            >
              {isSaving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
                  <span>Enregistrement...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="h-4 w-4 text-neutral-950" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Enregistrer l'ordre</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
