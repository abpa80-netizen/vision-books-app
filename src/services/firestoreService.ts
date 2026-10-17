import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  deleteField,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Product,
  Category,
  LeadMagnet,
  Lead,
  Testimonial,
  BlogPost,
  VipPack,
  AnalyticsStats,
  AnalyticsEvent,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_LEAD_MAGNETS,
  INITIAL_TESTIMONIALS,
  INITIAL_BLOG_POSTS,
  INITIAL_VIP_PACK,
} from '../data/initialData';

// Collection names
export const COLLECTIONS = {
  PRODUCTS: 'products',
  PUBLIC_PRODUCTS: 'products_public',
  PRIVATE_PRODUCT_FILES: 'product_private',
  SYSTEM_MIGRATIONS: 'system_migrations',
  CATEGORIES: 'categories',
  LEAD_MAGNETS: 'lead_magnets',
  LEADS: 'leads',
  TESTIMONIALS: 'testimonials',
  BLOG_POSTS: 'blog_posts',
  SETTINGS: 'settings',
  ANALYTICS: 'analytics',
  ADMINS: 'admins',
  VIP_PACKS: 'vip_packs',
} as const;

// Helper to sanitize undefined values before writing to Firestore
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ----------------------------------------------------
// 1. PRODUCTS — public data is separated from private download URLs
// ----------------------------------------------------
export function subscribeProducts(
  callback: (products: Product[]) => void,
  isAdmin = false
): () => void {
  if (!isAdmin) {
    const publicRef = collection(db, COLLECTIONS.PUBLIC_PRODUCTS);
    const publicQuery = query(publicRef, where('is_active', '==', true));
    return onSnapshot(
      publicQuery,
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data(), audio_download_url: '' } as Product);
        });
        callback(items);
      },
      (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.PUBLIC_PRODUCTS)
    );
  }

  let adminProducts: Product[] = [];
  let privateUrls: Record<string, string> = {};
  let productsReady = false;
  let privateReady = false;
  const publish = () => {
    if (!productsReady || !privateReady) return;
    callback(adminProducts.map((product) => ({
      ...product,
      audio_download_url: privateUrls[product.id] || '',
    })));
  };

  const stopProducts = onSnapshot(
    collection(db, COLLECTIONS.PRODUCTS),
    (snapshot) => {
      adminProducts = [];
      snapshot.forEach((d) => adminProducts.push({ id: d.id, ...d.data() } as Product));
      productsReady = true;
      publish();
    },
    (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.PRODUCTS)
  );

  const stopPrivate = onSnapshot(
    collection(db, COLLECTIONS.PRIVATE_PRODUCT_FILES),
    (snapshot) => {
      privateUrls = {};
      snapshot.forEach((d) => {
        const url = d.data().audio_download_url;
        if (typeof url === 'string' && url) privateUrls[d.id] = url;
      });
      privateReady = true;
      publish();
    },
    (error) => handleFirestoreError(error, OperationType.GET, COLLECTIONS.PRIVATE_PRODUCT_FILES)
  );

  return () => {
    stopProducts();
    stopPrivate();
  };
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const { audio_download_url, ...publicData } = product as Product & { audio_download_url?: string };
  const publicPayload = sanitizeForFirestore({
    ...publicData,
    updated_at: new Date().toISOString(),
  });

  try {
    // The admin catalogue never stores the private download URL in its product document.
    await setDoc(doc(db, COLLECTIONS.PRODUCTS, product.id), publicPayload, { merge: true });
    // Public visitors read only this sanitized copy.
    await setDoc(doc(db, COLLECTIONS.PUBLIC_PRODUCTS, product.id), publicPayload, { merge: true });

    const privateRef = doc(db, COLLECTIONS.PRIVATE_PRODUCT_FILES, product.id);
    if (audio_download_url) {
      await setDoc(privateRef, {
        audio_download_url,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } else {
      await deleteDoc(privateRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PRODUCTS}/${product.id}`);
  }
}

export async function deleteProductFromFirestore(id: string): Promise<void> {
  try {
    await Promise.all([
      deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id)),
      deleteDoc(doc(db, COLLECTIONS.PUBLIC_PRODUCTS, id)),
      deleteDoc(doc(db, COLLECTIONS.PRIVATE_PRODUCT_FILES, id)),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.PRODUCTS}/${id}`);
  }
}

/**
 * One-time, idempotent migration for existing products.
 * Copies public fields into products_public, moves private download URLs into
 * product_private, then removes the sensitive field from the legacy products doc.
 * Must be run by the verified administrator after publishing the matching Firestore rules.
 */
export async function migrateLegacyProductAudioUrls(): Promise<{ migrated: number; privateUrlsMoved: number }> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.email?.toLowerCase() !== 'barkissac80@gmail.com' || !currentUser.emailVerified) {
    throw new Error('Seul le compte administrateur vérifié peut lancer la migration.');
  }

  const markerRef = doc(db, COLLECTIONS.SYSTEM_MIGRATIONS, 'product_audio_v1');
  const marker = await getDoc(markerRef);
  if (marker.exists() && marker.data().completed === true) {
    return { migrated: 0, privateUrlsMoved: 0 };
  }

  const snapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
  let migrated = 0;
  let privateUrlsMoved = 0;

  for (const productDoc of snapshot.docs) {
    const data = productDoc.data();
    const audioUrl = typeof data.audio_download_url === 'string' ? data.audio_download_url : '';
    const publicData: Record<string, any> = { ...data };
    delete publicData.audio_download_url;

    if (audioUrl) {
      await setDoc(doc(db, COLLECTIONS.PRIVATE_PRODUCT_FILES, productDoc.id), {
        audio_download_url: audioUrl,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      privateUrlsMoved += 1;
    }

    await setDoc(doc(db, COLLECTIONS.PUBLIC_PRODUCTS, productDoc.id), {
      ...sanitizeForFirestore(publicData),
      updated_at: new Date().toISOString(),
    }, { merge: true });

    if (Object.prototype.hasOwnProperty.call(data, 'audio_download_url')) {
      await updateDoc(productDoc.ref, {
        audio_download_url: deleteField(),
        updated_at: new Date().toISOString(),
      });
    }
    migrated += 1;
  }

  await setDoc(markerRef, { completed: true, migrated, privateUrlsMoved, completed_at: new Date().toISOString() });
  return { migrated, privateUrlsMoved };
}

// ----------------------------------------------------
// 2. CATEGORIES
// ----------------------------------------------------
export function subscribeCategories(
  callback: (categories: Category[]) => void,
  isAdmin = false
): () => void {
  const colRef = collection(db, COLLECTIONS.CATEGORIES);
  const q = isAdmin ? colRef : query(colRef, where('is_active', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Category);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.CATEGORIES);
    }
  );
}

export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CATEGORIES, category.id);
  const payload = sanitizeForFirestore({
    ...category,
    updated_at: new Date().toISOString(),
  });
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CATEGORIES}/${category.id}`);
  }
}

export async function deleteCategoryFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CATEGORIES, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.CATEGORIES}/${id}`);
  }
}

// ----------------------------------------------------
// 3. LEAD MAGNETS
// ----------------------------------------------------
export function subscribeLeadMagnets(
  callback: (leadMagnets: LeadMagnet[]) => void,
  isAdmin = false
): () => void {
  const colRef = collection(db, COLLECTIONS.LEAD_MAGNETS);
  const q = isAdmin ? colRef : query(colRef, where('active', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LeadMagnet[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as LeadMagnet);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.LEAD_MAGNETS);
    }
  );
}

export async function saveLeadMagnetToFirestore(leadMagnet: LeadMagnet): Promise<void> {
  const docRef = doc(db, COLLECTIONS.LEAD_MAGNETS, leadMagnet.id);
  const payload = sanitizeForFirestore({
    ...leadMagnet,
    updated_at: new Date().toISOString(),
  });
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.LEAD_MAGNETS}/${leadMagnet.id}`);
  }
}

export async function deleteLeadMagnetFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.LEAD_MAGNETS, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.LEAD_MAGNETS}/${id}`);
  }
}

// ----------------------------------------------------
// 4. LEADS (STRICTLY PRIVATE: Admin Reads, Public Creates)
// ----------------------------------------------------
export async function getLeadsFromFirestore(): Promise<Lead[]> {
  try {
    const colRef = collection(db, COLLECTIONS.LEADS);
    const snapshot = await getDocs(colRef);
    const items: Lead[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as Lead);
    });
    // Sort newest first
    items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.LEADS);
  }
}

export function subscribeLeads(
  callback: (leads: Lead[]) => void,
  onError?: (error: any) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.LEADS);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Lead[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Lead);
      });
      // Sort newest first
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      callback(items);
    },
    (error) => {
      console.error('[Firestore] subscribeLeads error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export async function createLeadInFirestore(lead: Partial<Lead>): Promise<Lead> {
  const firstName = String(lead.first_name || lead.name || '').trim();
  const whatsapp = String(lead.whatsapp || lead.phone || '').trim();

  if (!firstName) {
    throw new Error('Le prénom est obligatoire pour enregistrer le prospect.');
  }
  const cleanDigits = whatsapp.replace(/[^0-9]/g, '');
  if (cleanDigits.length < 8) {
    throw new Error('Un numéro WhatsApp valide avec indicatif (au moins 8 chiffres) est obligatoire.');
  }

  // Generate stable, collision-free Firestore document ID
  const id = lead.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const docRef = doc(db, COLLECTIONS.LEADS, id);
  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const payload: Record<string, any> = sanitizeForFirestore({
    id,
    first_name: firstName,
    whatsapp,
    lead_magnet_id: lead.lead_magnet_id || null,
    lead_magnet_title: lead.lead_magnet_title || '',
    source: lead.source || 'Page de capture',
    created_at: lead.created_at || formattedDate,
    date: lead.date || formattedDate.split(' ')[0],
    time: lead.time || formattedDate.split(' ')[1] || '00:00',
    status: lead.status || 'nouveau',
    // Compatibility fields
    name: firstName,
    phone: whatsapp,
    createdAt: lead.created_at || formattedDate,
    // Relances Marketing J1, J2, J3
    followup_j1: lead.followup_j1 || '',
    followup_j2: lead.followup_j2 || '',
    followup_j3: lead.followup_j3 || '',
    followup_generated_at: lead.followup_generated_at || '',
    followup_updated_at: lead.followup_updated_at || '',
    followup_status_j1: lead.followup_status_j1 || 'a_envoyer',
    followup_status_j2: lead.followup_status_j2 || 'a_envoyer',
    followup_status_j3: lead.followup_status_j3 || 'a_envoyer',
  });

  try {
    await setDoc(docRef, payload);
    return payload as Lead;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTIONS.LEADS}/${id}`);
  }
}

export async function updateLeadInFirestore(id: string, updates: Partial<Lead>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.LEADS, id);
  const payload = sanitizeForFirestore({
    ...updates,
    followup_updated_at: updates.followup_updated_at || new Date().toISOString(),
  });
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.LEADS}/${id}`);
  }
}

export async function deleteLeadFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.LEADS, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.LEADS}/${id}`);
  }
}

// ----------------------------------------------------
// 5. TESTIMONIALS
// ----------------------------------------------------
export function subscribeTestimonials(
  callback: (testimonials: Testimonial[]) => void,
  isAdmin = false
): () => void {
  const colRef = collection(db, COLLECTIONS.TESTIMONIALS);
  const q = isAdmin ? colRef : query(colRef, where('is_active', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Testimonial[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Testimonial);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.TESTIMONIALS);
    }
  );
}

export async function saveTestimonialToFirestore(testimonial: Testimonial): Promise<void> {
  const docRef = doc(db, COLLECTIONS.TESTIMONIALS, testimonial.id);
  const payload = sanitizeForFirestore({
    ...testimonial,
    updated_at: new Date().toISOString(),
  });
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.TESTIMONIALS}/${testimonial.id}`);
  }
}

export async function deleteTestimonialFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.TESTIMONIALS, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.TESTIMONIALS}/${id}`);
  }
}

// ----------------------------------------------------
// 6. BLOG POSTS
// ----------------------------------------------------
export function subscribeBlogPosts(
  callback: (posts: BlogPost[]) => void,
  isAdmin = false
): () => void {
  const colRef = collection(db, COLLECTIONS.BLOG_POSTS);
  const q = isAdmin ? colRef : query(colRef, where('is_published', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: BlogPost[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as BlogPost);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.BLOG_POSTS);
    }
  );
}

export async function saveBlogPostToFirestore(post: BlogPost): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BLOG_POSTS, post.id);
  const payload = sanitizeForFirestore({
    ...post,
    updated_at: new Date().toISOString(),
  });
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.BLOG_POSTS}/${post.id}`);
  }
}

export async function deleteBlogPostFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BLOG_POSTS, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.BLOG_POSTS}/${id}`);
  }
}

// ----------------------------------------------------
// 7. SETTINGS
// ----------------------------------------------------
export function subscribeSettings(callback: (settings: Record<string, string>) => void): () => void {
  const colRef = collection(db, COLLECTIONS.SETTINGS);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.key && data.value !== undefined) {
          map[data.key] = data.value;
        }
      });
      callback(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.SETTINGS);
    }
  );
}

export async function saveSettingToFirestore(key: string, value: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SETTINGS, key);
  try {
    await setDoc(docRef, {
      id: key,
      key,
      value,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/${key}`);
  }
}

// ----------------------------------------------------
// 8. VIP PACK
// ----------------------------------------------------
export function subscribeVipPack(callback: (vipPack: VipPack) => void): () => void {
  const docRef = doc(db, COLLECTIONS.VIP_PACKS, 'default');

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as VipPack);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.VIP_PACKS}/default`);
    }
  );
}

export async function saveVipPackToFirestore(vipPack: VipPack): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VIP_PACKS, 'default');
  const payload = sanitizeForFirestore({
    ...vipPack,
    id: 'default',
    updated_at: new Date().toISOString(),
  });
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.VIP_PACKS}/default`);
  }
}

export async function deleteVipPackFromFirestore(): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VIP_PACKS, 'default');
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.VIP_PACKS}/default`);
  }
}

// ----------------------------------------------------
// 9. ANALYTICS EVENT
// ----------------------------------------------------
export async function trackAnalyticsEventInFirestore(event: {
  event_type: string;
  product_id?: string | null;
  lead_id?: string | null;
  page: string;
  visitor_id?: string | null;
  metadata?: any;
}): Promise<void> {
  const id = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTIONS.ANALYTICS, id);
  const payload = sanitizeForFirestore({
    id,
    event_type: event.event_type,
    product_id: event.product_id || null,
    lead_id: event.lead_id || null,
    page: event.page,
    visitor_id: event.visitor_id || null,
    metadata: typeof event.metadata === 'object' ? JSON.stringify(event.metadata) : (event.metadata || '{}'),
    created_at: new Date().toISOString(),
  });

  try {
    await setDoc(docRef, payload);
  } catch (error) {
    // Non-blocking for client experience
    console.debug('[Firestore] Analytics event logging error:', error);
  }
}

// ----------------------------------------------------
// 10. SEEDING / BOOTSTRAP INITIAL DATA INTO FIRESTORE
// ----------------------------------------------------
export async function seedFirestoreIfEmpty(): Promise<void> {
  // Only attempt seeding when signed in as admin with write permissions
  if (!auth.currentUser) {
    return;
  }
  try {
    // Check if products exist in Firestore
    const productsSnap = await getDocs(query(collection(db, COLLECTIONS.PRODUCTS), limit(1)));
    if (productsSnap.empty) {
      console.log('Seeding initial data into Firestore...');

      // 1. Seed Products
      for (const p of INITIAL_PRODUCTS) {
        await setDoc(doc(db, COLLECTIONS.PRODUCTS, p.id), sanitizeForFirestore(p));
      }

      // 2. Seed Categories
      for (const c of INITIAL_CATEGORIES) {
        await setDoc(doc(db, COLLECTIONS.CATEGORIES, c.id), sanitizeForFirestore(c));
      }

      // 3. Seed Lead Magnets
      for (const lm of INITIAL_LEAD_MAGNETS) {
        await setDoc(doc(db, COLLECTIONS.LEAD_MAGNETS, lm.id), sanitizeForFirestore(lm));
      }

      // 4. Seed Testimonials
      for (const t of INITIAL_TESTIMONIALS) {
        await setDoc(doc(db, COLLECTIONS.TESTIMONIALS, t.id), sanitizeForFirestore(t));
      }

      // 5. Seed Blog Posts
      for (const b of INITIAL_BLOG_POSTS) {
        await setDoc(doc(db, COLLECTIONS.BLOG_POSTS, b.id), sanitizeForFirestore(b));
      }

      // 6. Seed VIP Pack
      await setDoc(doc(db, COLLECTIONS.VIP_PACKS, 'default'), sanitizeForFirestore({
        ...INITIAL_VIP_PACK,
        id: 'default',
      }));

      // 7. Seed Default Settings
      const defaultSettings = [
        { key: 'whatsapp_number', value: '' },
        { key: 'whatsapp_welcome_message', value: 'Bonjour, je souhaite commander un livre audio sur VISION BOOKS.' },
        { key: 'site_title', value: 'VISION BOOKS' },
        { key: 'currency', value: 'EUR' },
      ];
      for (const s of defaultSettings) {
        await setDoc(doc(db, COLLECTIONS.SETTINGS, s.key), {
          id: s.key,
          key: s.key,
          value: s.value,
          updated_at: new Date().toISOString(),
        });
      }

      console.log('Firestore successfully seeded with initial VISION BOOKS collection.');
    }
  } catch (err) {
    console.warn('Firestore seeding check:', err);
  }
}

// ----------------------------------------------------
// 11. ANALYTICS AGGREGATION FROM FIRESTORE (ADMIN ONLY)
// ----------------------------------------------------
export async function getAnalyticsStatsFromFirestore(
  range: 'all' | '30d' | '7d' | 'today' = 'all',
  products: Product[] = [],
  categories: Category[] = [],
  leads: Lead[] = [],
  leadMagnets: LeadMagnet[] = []
): Promise<AnalyticsStats> {
  const now = new Date();
  let cutoffDate: Date | null = null;

  if (range === 'today') {
    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === '7d') {
    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '30d') {
    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 1. Fetch raw analytics events from Firestore
  let rawEvents: AnalyticsEvent[] = [];
  try {
    const colRef = collection(db, COLLECTIONS.ANALYTICS);
    const snap = await getDocs(colRef);
    snap.forEach((d) => {
      const data = d.data();
      rawEvents.push({
        id: d.id,
        event_type: data.event_type,
        product_id: data.product_id || null,
        lead_id: data.lead_id || null,
        page: data.page || '',
        visitor_id: data.visitor_id || null,
        metadata: data.metadata,
        created_at: data.created_at || new Date().toISOString(),
      } as AnalyticsEvent);
    });
  } catch (err) {
    console.warn('[Firestore] getAnalyticsStats query notice:', err);
  }

  // Sort events newest first
  rawEvents.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  // 2. Filter events by range
  const filteredEvents = cutoffDate
    ? rawEvents.filter((e) => new Date(e.created_at) >= cutoffDate!)
    : rawEvents;

  // 3. Filter leads by range
  const filteredLeads = cutoffDate
    ? leads.filter((l) => new Date(l.created_at) >= cutoffDate!)
    : leads;

  // 4. Compute metrics without fabricating data
  const visitorIds = new Set<string>();
  filteredEvents.forEach((e) => {
    if (e.visitor_id) visitorIds.add(e.visitor_id);
  });
  const totalVisitors = visitorIds.size;

  const totalVisits = filteredEvents.filter(
    (e) => e.event_type === 'site_visit' || e.event_type === 'product_view'
  ).length;

  const productClicks = filteredEvents.filter((e) => e.event_type === 'product_click').length;
  const whatsappClicks = filteredEvents.filter((e) => e.event_type === 'whatsapp_order_click').length;
  const leadsCount = filteredLeads.length;
  const leadMagnetDownloads = filteredEvents.filter((e) => e.event_type === 'lead_magnet_download').length;
  const ordersIntentions = whatsappClicks;

  const conversionRate = totalVisits > 0
    ? Number(Math.min(100, (ordersIntentions / totalVisits) * 100).toFixed(1))
    : 0;

  const globalConversionRate = totalVisits > 0
    ? Number(Math.min(100, ((ordersIntentions + leadsCount) / totalVisits) * 100).toFixed(1))
    : 0;

  // 5. Most viewed products
  const productViewsMap = new Map<string, number>();
  filteredEvents
    .filter((e) => e.event_type === 'product_view' && e.product_id)
    .forEach((e) => {
      const pid = e.product_id!;
      productViewsMap.set(pid, (productViewsMap.get(pid) || 0) + 1);
    });

  const mostViewedProducts = products
    .map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      cover: p.cover,
      slug: p.slug,
      normal_price: p.normal_price,
      sale_price: p.sale_price,
      views_count: productViewsMap.get(p.id) || productViewsMap.get(p.slug) || 0,
    }))
    .sort((a, b) => b.views_count - a.views_count)
    .slice(0, 5);

  // 6. Most WhatsApp clicked products
  const productWhatsappMap = new Map<string, number>();
  filteredEvents
    .filter((e) => e.event_type === 'whatsapp_order_click' && e.product_id)
    .forEach((e) => {
      const pid = e.product_id!;
      productWhatsappMap.set(pid, (productWhatsappMap.get(pid) || 0) + 1);
    });

  const mostWhatsappProducts = products
    .map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      cover: p.cover,
      slug: p.slug,
      normal_price: p.normal_price,
      sale_price: p.sale_price,
      whatsapp_clicks_count: productWhatsappMap.get(p.id) || productWhatsappMap.get(p.slug) || 0,
    }))
    .sort((a, b) => b.whatsapp_clicks_count - a.whatsapp_clicks_count)
    .slice(0, 5);

  // 7. Most viewed categories
  const catViewsMap = new Map<string, number>();
  filteredEvents
    .filter((e) => (e.event_type === 'product_view' || e.event_type === 'product_click') && e.product_id)
    .forEach((e) => {
      const foundProd = products.find((p) => p.id === e.product_id || p.slug === e.product_id);
      if (foundProd) {
        catViewsMap.set(foundProd.category, (catViewsMap.get(foundProd.category) || 0) + 1);
      }
    });

  const mostViewedCategories = categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      views_count: catViewsMap.get(c.id) || catViewsMap.get(c.slug) || 0,
    }))
    .sort((a, b) => b.views_count - a.views_count)
    .slice(0, 5);

  // 8. Daily trends (7 days or 30 days)
  const daysToShow = range === '30d' ? 30 : 7;
  const visitsTrend: { date: string; label: string; visits: number }[] = [];
  const leadsTrend: { date: string; label: string; leads: number }[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

    const dayVisits = filteredEvents.filter(
      (e) => (e.event_type === 'site_visit' || e.event_type === 'product_view') && e.created_at.startsWith(dateStr)
    ).length;

    const dayLeads = filteredLeads.filter(
      (l) => l.created_at.startsWith(dateStr)
    ).length;

    visitsTrend.push({ date: dateStr, label, visits: dayVisits });
    leadsTrend.push({ date: dateStr, label, leads: dayLeads });
  }

  // 9. Lead magnets performance
  const lmVisits = filteredEvents.filter((e) => e.event_type === 'lead_magnet_view').length;
  const leadMagnetsPerformance = leadMagnets.map((lm) => {
    const lmViews = filteredEvents.filter(
      (e) => e.event_type === 'lead_magnet_view' && (e.lead_id === lm.id || e.page.includes(lm.slug))
    ).length;
    const lmLeads = filteredLeads.filter(
      (l) => l.lead_magnet_id === lm.id || l.lead_magnet_id === lm.slug
    ).length;
    const downloads = Number(lm.downloads_count || 0);
    const conv = lmViews > 0 ? Number(Math.min(100, (lmLeads / lmViews) * 100).toFixed(1)) : 0;
    return {
      id: lm.id,
      title: lm.title,
      slug: lm.slug,
      image: lm.image,
      visits_count: lmViews,
      leads_count: lmLeads,
      downloads_count: downloads,
      conversion_rate: conv,
      active: Boolean(lm.active),
    };
  }).sort((a, b) => b.leads_count - a.leads_count);

  return {
    totalVisitors,
    totalVisits,
    productClicks,
    whatsappClicks,
    leadsCount,
    leadMagnetDownloads,
    ordersIntentions,
    conversionRate,
    globalConversionRate,
    mostViewedProducts,
    mostWhatsappProducts,
    mostViewedCategories,
    visitsTrend,
    leadsTrend,
    recentEvents: filteredEvents.slice(0, 15),
    leadMagnetVisits: lmVisits,
    leadMagnetsPerformance,
  };
}
