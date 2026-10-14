import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  BookOpen,
  Eye,
  EyeOff,
  AlertTriangle,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Lock,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Category } from '../../../types';
import { ImageUploader } from '../ImageUploader';
import { SafeImage } from '../../common/SafeImage';
import { DEFAULT_CATEGORY_IMAGES } from '../../public/CategoriesSection';

// Official editorial visuals provided by VISION BOOKS
const EDITORIAL_PRESETS = [
  { slug: 'business-entrepreneuriat', label: 'Business & Entrepreneuriat', url: '/assets/images/cat_entrepreneuriat.jpg' },
  { slug: 'liberte-financiere-succes', label: 'Liberté Financière & Succès', url: '/assets/images/cat_finance.jpg' },
  { slug: 'investissement-trading', label: 'Investissement & Trading', url: '/assets/images/cat_trading.jpg' },
  { slug: 'business-en-ligne-marketing', label: 'Business en ligne & Marketing', url: '/assets/images/cat_marketing.jpg' },
  { slug: 'developpement-personnel', label: 'Développement Personnel', url: '/assets/images/cat_dev_perso.jpg' },
  { slug: 'mindset-motivation', label: 'Mindset & Motivation', url: '/assets/images/cat_mindset.jpg' },
  { slug: 'spiritualite-bien-etre', label: 'Spiritualité & Bien-être', url: '/assets/images/cat_spiritualite.jpg' },
  { slug: 'amour-relation', label: 'Amour & Relation', url: '/assets/images/cat_relations.jpg' },
  { slug: 'autres', label: 'Autres thématiques', url: '/assets/images/cat_autres.jpg' },
];

export const CategoriesView: React.FC = () => {
  const {
    categories,
    addCategory,
    updateCategory,
    reorderCategories,
    toggleCategoryStatus,
    deleteCategory,
    products,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('📚');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      const generatedSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  };

  const openAddModal = () => {
    setName('');
    setSlug('');
    setIcon('📚');
    setDescription('');
    setImage('');
    setDisplayOrder(categories.length);
    setIsActive(true);
    setEditingCategory(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setIcon(cat.icon);
    setDescription(cat.description);
    setImage(cat.image || cat.imageUrl || cat.cover || DEFAULT_CATEGORY_IMAGES[cat.slug] || '');
    setDisplayOrder(cat.display_order ?? cat.order ?? (categories.indexOf(cat) + 1));
    setIsActive(Boolean(cat.is_active));
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedImage = image.trim();
    const payload: Partial<Category> = {
      name: name.trim(),
      slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon: icon.trim() || '📚',
      description: description.trim(),
      image: trimmedImage,
      imageUrl: trimmedImage,
      cover: trimmedImage,
      display_order: Number(displayOrder) || 1,
      order: Number(displayOrder) || 1,
      is_active: isActive,
    };

    if (editingCategory) {
      await updateCategory(editingCategory.id, payload);
    } else {
      await addCategory(payload);
    }

    setIsAddModalOpen(false);
  };

  const confirmDelete = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  };

  const getProductCount = (categorySlug: string, categoryId: string) => {
    return products.filter(
      (p) =>
        p.category === categorySlug ||
        p.category === categoryId ||
        (p as any).categoryId === categoryId
    ).length;
  };

  // Move a category up or down in the strategic order
  const handleMove = async (currentIndex: number, direction: 'up' | 'down') => {
    if (isReordering) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const currentCat = categories[currentIndex];
    const targetCat = categories[targetIndex];

    // "Autres" category must always remain strictly last
    const isCurrentAutres = currentCat.slug === 'autres' || currentCat.id === 'cat-autres';
    const isTargetAutres = targetCat.slug === 'autres' || targetCat.id === 'cat-autres';
    if (isCurrentAutres || isTargetAutres) return;

    setIsReordering(true);
    try {
      const reordered = [...categories];
      const [item] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, item);

      // Separate "Autres" to guarantee it sits at the absolute bottom
      const nonAutres = reordered.filter((c) => c.slug !== 'autres' && c.id !== 'cat-autres');
      const autres = reordered.find((c) => c.slug === 'autres' || c.id === 'cat-autres');
      const finalList = autres ? [...nonAutres, autres] : nonAutres;

      await reorderCategories(finalList.map((c) => c.id));
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-500 border border-amber-500/20 mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Thématiques VISION BOOKS</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Gestion des Catégories</h1>
          <p className="mt-1 text-xs text-neutral-400 max-w-2xl">
            Personnalisez l'ordre stratégique d'affichage et les visuels éditoriaux haute résolution.
            La catégorie <strong className="text-amber-400">« Autres »</strong> est automatiquement verrouillée en dernière position.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-amber-400 shadow-sm active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Nouvelle Catégorie</span>
        </button>
      </div>

      {/* Info Notice about Storage & Order */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-xs text-neutral-300 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong className="text-white">Ordre stratégique & Stockage des visuels :</strong> Vous pouvez ajuster l'ordre des thématiques via les boutons fléchés <span className="text-amber-400">Monter / Descendre</span> ci-dessous.
          </p>
          <p className="text-neutral-400">
            Les images sont stockées sur le serveur sous <code className="text-amber-400 bg-neutral-950 px-1 py-0.5 rounded">/uploads</code> et servies de façon statique pour préserver les quotas Firestore et garantir un affichage optimal sur Vercel.
          </p>
        </div>
      </div>

      {/* Categories Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-800 bg-neutral-950 text-neutral-400">
              <tr>
                <th className="py-3.5 pl-5 pr-2 font-semibold text-center w-28">Ordre</th>
                <th className="py-3.5 px-3 font-semibold">Visuel</th>
                <th className="px-3 py-3.5 font-semibold">Icône</th>
                <th className="px-3 py-3.5 font-semibold">Nom & Slug</th>
                <th className="px-3 py-3.5 font-semibold">Description</th>
                <th className="px-3 py-3.5 font-semibold text-center">Livres</th>
                <th className="px-3 py-3.5 font-semibold text-center">Statut</th>
                <th className="py-3.5 pl-3 pr-6 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 text-neutral-300">
              {categories.map((cat, idx) => {
                const count = getProductCount(cat.slug, cat.id);
                const defaultFallback = DEFAULT_CATEGORY_IMAGES[cat.slug] || '/assets/images/cat_entrepreneuriat.jpg';
                const catImg = cat.image || cat.imageUrl || cat.cover || defaultFallback;
                const isAutres = cat.slug === 'autres' || cat.id === 'cat-autres';
                const isFirst = idx === 0;
                const isLastBeforeAutres = idx === categories.length - 2;

                return (
                  <tr key={cat.id} className="hover:bg-neutral-900/60 transition-colors">
                    {/* Position & Move Up/Down Controls */}
                    <td className="py-3 pl-5 pr-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center font-mono font-bold text-[11px] rounded-md px-2 py-0.5 ${
                            isAutres
                              ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          #{idx + 1}
                        </span>

                        {isAutres ? (
                          <span
                            title="La catégorie Autres est toujours verrouillée en dernière position"
                            className="text-neutral-500 p-1"
                          >
                            <Lock className="h-3 w-3" />
                          </span>
                        ) : (
                          <div className="inline-flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMove(idx, 'up')}
                              disabled={isFirst || isReordering}
                              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                              title="Monter d'un rang"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(idx, 'down')}
                              disabled={isLastBeforeAutres || isReordering}
                              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                              title="Descendre d'un rang"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Visual / Image thumbnail */}
                    <td className="py-3 px-3">
                      <div className="relative h-12 w-20 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 flex items-center justify-center shadow-sm">
                        <SafeImage
                          src={catImg}
                          alt={cat.name}
                          className="h-full w-full object-cover"
                          fallbackSrc={defaultFallback}
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[9px] backdrop-blur-xs">
                          {cat.icon}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-xl">
                      <span>{cat.icon}</span>
                    </td>

                    <td className="px-3 py-4 font-semibold text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{cat.name}</span>
                        {isAutres && (
                          <span className="rounded bg-neutral-800 text-[10px] text-neutral-400 px-1.5 py-0.2">
                            Verrouillé fin
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-neutral-500">/{cat.slug}</div>
                    </td>

                    <td className="max-w-xs px-3 py-4 text-neutral-400 truncate">
                      {cat.description || '—'}
                    </td>

                    <td className="px-3 py-4 text-center font-mono tabular-nums text-white whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-800/80 px-2 py-0.5 text-[11px]">
                        <BookOpen className="h-3 w-3 text-amber-500" />
                        {count}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => toggleCategoryStatus(cat.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          cat.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white'
                        }`}
                        title="Cliquer pour activer/désactiver"
                      >
                        {cat.is_active ? (
                          <>
                            <Eye className="h-3 w-3 text-emerald-400" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 text-neutral-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCategoryToDelete(cat)}
                          className="rounded p-1.5 text-neutral-400 hover:bg-red-950/40 hover:text-red-400 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 sm:p-7 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
              <Layers className="h-4 w-4" />
              <span>{editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie'}</span>
            </div>

            <h2 className="mt-2 font-display text-xl font-bold text-white">
              {editingCategory ? editingCategory.name : 'Nouvelle Catégorie'}
            </h2>

            <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
              {/* Image Uploader & Live Preview */}
              <div>
                <ImageUploader
                  value={image}
                  onChange={(val) => setImage(val)}
                  label="Image de couverture de la thématique"
                  helpText="Téléversez ou remplacez l'image (JPG, PNG, WebP). Enregistrée durablement sur le serveur (/uploads)."
                  aspectRatio="16/9"
                />
              </div>

              {/* Brand Presets Palette */}
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3">
                <label className="block text-[11px] font-semibold text-neutral-300 mb-2">
                  Ou sélectionner un visuel officiel VISION BOOKS :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EDITORIAL_PRESETS.map((preset) => {
                    const isSelected = image === preset.url;
                    return (
                      <button
                        type="button"
                        key={preset.slug}
                        onClick={() => setImage(preset.url)}
                        className={`group relative flex flex-col items-center overflow-hidden rounded-lg border p-1 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                            : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                        }`}
                      >
                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded">
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-neutral-950">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                        <span className="mt-1 line-clamp-1 w-full text-[10px] text-neutral-300 text-center font-medium">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-300">
                    Nom de la catégorie *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex : Immobilier & Patrimoine"
                    className="mt-1.5 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-300">
                    Slug URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="immobilier-patrimoine"
                    className="mt-1.5 w-full font-mono rounded-lg border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Position / Display order */}
              <div>
                <label className="block font-medium text-neutral-300">
                  Position / Ordre d'affichage
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 rounded-lg border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                  <span className="text-[11px] text-neutral-400">
                    Détermine la position dans le carrousel (1 = premier). « Autres » reste toujours en dernier.
                  </span>
                </div>
              </div>

              {/* Emoji Icon */}
              <div>
                <label className="block font-medium text-neutral-300">
                  Emoji ou Symbole *
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="text"
                    required
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-16 text-center rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 text-base">
                    {['📈', '💰', '📊', '💻', '🧠', '⚡', '🕊️', '❤️', '✨', '🏢', '🚀', '🎯', '💎', '🔑'].map(
                      (emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setIcon(emoji)}
                          className="rounded border border-neutral-800 p-1 hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          {emoji}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-medium text-neutral-300">
                  Description courte
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectif d'apprentissage de cette thématique..."
                  className="mt-1.5 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCat"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="isActiveCat" className="text-neutral-300 cursor-pointer font-medium">
                  Catégorie active (visible dans le carrousel et la boutique)
                </label>
              </div>

              {/* Submit buttons */}
              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-neutral-800 px-4 py-2 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 font-semibold text-neutral-950 hover:bg-amber-400 transition-colors active:scale-95 cursor-pointer shadow-md"
                >
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>{editingCategory ? 'Mettre à jour' : 'Créer la catégorie'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-950/80 text-red-400 border border-red-800/60 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h3 className="font-display text-lg font-bold text-white">
              Supprimer cette catégorie ?
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              Êtes-vous sûr de vouloir supprimer la catégorie{' '}
              <strong className="text-white">"{categoryToDelete.icon} {categoryToDelete.name}"</strong> ? Les livres audio associés ne seront pas supprimés mais devront être réassignés.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="rounded-lg border border-neutral-800 px-4 py-2 text-xs font-medium text-neutral-400 hover:bg-neutral-900 hover:text-white cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
