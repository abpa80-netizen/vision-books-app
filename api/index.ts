import express from 'express';
import type { Request, Response } from 'express';

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCo5OhvAJq2-l40TzpnZqFtbKfruCWjIwQ';
const ADMIN_EMAIL = 'barkissac80@gmail.com';
const tokenCache = new Map<string, { email: string; expiresAt: number }>();

const EXPECTED_PROJECT_ID = 'gen-lang-client-0082810984';
const EXPECTED_ISSUER = `https://securetoken.google.com/${EXPECTED_PROJECT_ID}`;

function parseAndValidateJwtClaims(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return false;
    if (payload.aud !== EXPECTED_PROJECT_ID) return false;
    if (payload.iss !== EXPECTED_ISSUER) return false;
    return true;
  } catch {
    return false;
  }
}

// Helper: Cryptographically verify Firebase ID token and ensure user is master admin
async function isAuthorizedAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }
  const idToken = authHeader.substring(7).trim();
  if (!idToken || idToken.length < 20) {
    return false;
  }

  // 1. Validate JWT structural claims: expiration, issuer, audience / project ID
  if (!parseAndValidateJwtClaims(idToken)) {
    return false;
  }

  // Fast-path: Check memory cache (5 minute TTL)
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      return false;
    }

    const data = await res.json() as any;
    const user = data.users?.[0];
    if (!user || !user.email) {
      return false;
    }

    const verifiedEmail = user.email.toLowerCase();
    tokenCache.set(idToken, { email: verifiedEmail, expiresAt: Date.now() + 5 * 60 * 1000 });

    return verifiedEmail === ADMIN_EMAIL.toLowerCase();
  } catch (err) {
    console.error('[Firebase Token Verification Error]:', err);
    return false;
  }
}

// ----------------------------------------------------
// 1. HEALTHCHECK
// ----------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    serverless: true,
    platform: 'vercel',
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------
// 2. COMMERCIAL ASSISTANT (GEMINI AI - PUBLIC)
// ----------------------------------------------------
app.post('/api/assistant/chat', async (req: Request, res: Response): Promise<any> => {
  try {
    const { messages, whatsappNumber, hasActiveVipPack, catalogue } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Historique de messages requis.' });
    }

    const lastMessage = String(messages[messages.length - 1]?.content || '');
    const configuredPhoneDigits = typeof whatsappNumber === 'string' ? whatsappNumber.replace(/\\D/g, '') : '';
    const hasConfiguredWhatsApp = configuredPhoneDigits.length >= 8 && !['33612345678', '22990000000'].includes(configuredPhoneDigits);
    const publicCatalogue = Array.isArray(catalogue) ? catalogue.filter((item: any) => item && item.is_active !== false).slice(0, 40) : [];
    let reply = '';
    let suggestedProducts: any[] = [];

    // Attempt Gemini call if API key configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const safeCatalogue = publicCatalogue;
        const systemPrompt = `Tu es le conseiller commercial de VISION BOOKS. Réponds en français, avec élégance, clarté et sans pression artificielle.

RÈGLES IMPÉRATIVES :
- Recommande uniquement des titres, auteurs et prix présents dans le catalogue fourni. N'invente jamais de livre, de tarif, de stock, de témoignage, de résultat ou de statistique.
- Utilise les besoins exprimés par le visiteur pour recommander au maximum 2 titres réellement présents, avec leurs liens internes /produit/SLUG si un slug est fourni.
- Présente le Pack VIP uniquement si le contexte indique qu'il est actif.
- Si le numéro WhatsApp n'est pas configuré, ne fabrique aucun numéro et invite à consulter la fiche produit ou le catalogue.
- Mentionne les guides gratuits uniquement si le visiteur pose la question ou si cela aide réellement sa demande.
- Ne promets jamais de résultats financiers garantis. Ne révèle aucun lien audio privé, aucune donnée de prospect et aucune information d'administration.

Catalogue public disponible : ${JSON.stringify(safeCatalogue)}
Pack VIP actif : ${hasActiveVipPack === true ? 'oui' : 'non'}.
WhatsApp configuré : ${hasConfiguredWhatsApp ? 'oui' : 'non'}.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: messages.slice(-12).map((message: any) => ({
            role: message?.role === 'assistant' || message?.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(message?.content || '').slice(0, 4000) }],
          })),
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.5,
            maxOutputTokens: 600,
          },
        });

        if (response && response.text) {
          reply = response.text.trim();
        }
      } catch (geminiErr: any) {
        console.warn('[Gemini Serverless Assistant Warning]:', geminiErr?.message || geminiErr);
      }
    }

    // Context-aware fallback when Gemini is unavailable or unconfigured.
    if (!reply) {
      const question = lastMessage.toLowerCase();
      const topicPatterns: Array<{ pattern: RegExp; label: string }> = [
        { pattern: /business|entreprise|entrepreneur|entreprendre|vente|client/, label: 'business et entrepreneuriat' },
        { pattern: /invest|trading|bourse|crypto|immobilier/, label: 'investissement' },
        { pattern: /financ|argent|revenu|patrimoine|épargne|dette/, label: 'liberté financière' },
        { pattern: /mindset|motivation|discipline|habitude|confiance|personnel/, label: 'développement personnel' },
        { pattern: /vip|pack/, label: 'Pack VIP' },
        { pattern: /gratuit|guide|offert|ressource/, label: 'ressources gratuites' },
        { pattern: /whatsapp|commander|commande|payer|paiement/, label: 'commande WhatsApp' },
      ];
      const matchedTopic = topicPatterns.find((item) => item.pattern.test(question));
      const words = question.split(/[^a-z0-9à-ÿ]+/).filter((word) => word.length > 3);
      const relevant = publicCatalogue
        .map((item: any) => {
          const text = [item.title, item.author, item.category, item.short_description].filter(Boolean).join(' ').toLowerCase();
          const score = words.reduce((sum: number, word: string) => sum + (text.includes(word) ? 1 : 0), 0);
          return { item, score };
        })
        .filter((entry: any) => entry.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 2)
        .map((entry: any) => entry.item);
      const picks = relevant.length ? relevant : publicCatalogue.slice(0, 2);
      suggestedProducts = picks.map((item: any) => ({
        id: item.id, title: item.title, author: item.author, slug: item.slug,
        cover: item.cover || item.coverUrl, category: item.category,
        normal_price: item.normal_price, sale_price: item.sale_price,
      }));
      if (/vip|pack/.test(question)) {
        reply = hasActiveVipPack
          ? 'Le Pack VIP est actif. Je peux vous aider à comparer son contenu avec les livres individuels ; consultez sa présentation sur la page d’accueil pour vérifier les éléments inclus.'
          : 'Le Pack VIP n’est pas actuellement annoncé comme actif. Je vous recommande de parcourir les livres disponibles et de choisir selon votre objectif.';
      } else if (/gratuit|guide|offert|ressource/.test(question)) {
        reply = 'Vous cherchez une ressource gratuite ? Consultez la section du guide offert sur la page d’accueil ou ouvrez une page de capture disponible. Après avoir renseigné votre prénom et votre numéro WhatsApp, le fichier se télécharge et une page de confirmation propose un lien de secours.';
      } else if (/whatsapp|commander|commande|payer|paiement/.test(question)) {
        reply = hasConfiguredWhatsApp
          ? 'Pour commander, ouvrez la fiche du livre qui vous intéresse puis appuyez sur « Commander sur WhatsApp ». Le message sera préparé avec le titre et le lien du livre ; vérifiez ensuite le tarif affiché sur la fiche.'
          : 'Le contact WhatsApp n’est pas configuré pour le moment. Vous pouvez consulter le catalogue et les tarifs affichés sur chaque fiche produit.';
      } else if (picks.length) {
        reply = `Pour votre demande concernant ${matchedTopic?.label || 'nos livres audio'}, voici ${picks.length === 1 ? 'un titre' : 'quelques titres'} du catalogue qui ${picks.length === 1 ? 'pourrait vous intéresser' : 'pourraient vous intéresser'}. Ouvrez une fiche pour lire la présentation complète et vérifier le format et le tarif. ${hasConfiguredWhatsApp ? 'Vous pourrez ensuite utiliser le bouton de commande WhatsApp sur la fiche.' : ''}`;
      } else {
        reply = 'Bienvenue chez VISION BOOKS. Je peux vous orienter vers le business, l’investissement, la liberté financière ou le développement personnel. Précisez votre objectif et je chercherai les titres les plus pertinents dans le catalogue.';
      }
    }

    // Never return the business phone number in the public chatbot response.
    return res.json({
      message: reply,
      suggestedProducts,
      hasActiveVipPack: hasActiveVipPack === true,
    });
  } catch (error: any) {
    console.error('Error in /api/assistant/chat:', error);
    return res.status(500).json({ error: error.message || 'Erreur interne de l\'assistant.' });
  }
});

// ----------------------------------------------------
// 3. PRODUCT DESCRIPTION AI GENERATOR (ADMIN ONLY)
// ----------------------------------------------------
app.post('/api/products/generate-ai', async (req: Request, res: Response): Promise<any> => {
  if (!(await isAuthorizedAdmin(req))) {
    return res.status(401).json({ error: 'Accès non autorisé. Droits administrateur requis.' });
  }

  try {
    const { title, author, category, hints, bonus, existing_categories } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Le titre du livre est obligatoire.' });
    }

    const cleanTitle = title.trim();
    const cleanAuthor = author ? author.trim() : 'Auteur non renseigné';
    let resultJson: any = null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Tu es un rédacteur éditorial et copywriter senior spécialisé dans les livres audio de VISION BOOKS. Écris en français naturel, précis, professionnel et persuasif, avec une vraie analyse du sujet du livre — pas des phrases génériques.

FICHE DE TRAVAIL
Titre exact : "${cleanTitle}"
Auteur indiqué : "${cleanAuthor}"
Catégorie : "${category || ''}"
Résumé, thème ou notes fournis par l'administrateur : "${hints || 'Aucun résumé fourni. Déduis prudemment le thème probable à partir du titre et signale les éléments qui restent à vérifier.'}"
Bonus réellement inclus : "${bonus || 'Aucun bonus confirmé'}"
Catégories existantes : ${JSON.stringify(Array.isArray(existing_categories) ? existing_categories : [])}

EXIGENCES ÉDITORIALES
- Fais porter chaque texte sur le sujet précis suggéré par le titre, et explique le problème traité, les idées à explorer, à qui le livre peut être utile et comment le lecteur peut appliquer les enseignements.
- Description complète : 4 à 6 paragraphes substantiels, environ 250 à 400 mots, avec sous-titres courts et listes lisibles. Évite les répétitions.
- Description courte : 2 phrases spécifiques au sujet, maximum 45 mots.
- Fournis 4 points clés concrets, distincts et liés au thème du livre.
- CTA bref, élégant et adapté à la commande d'un livre audio.
- Si aucun résumé fiable n'est fourni, présente les thèmes comme des axes probables à explorer, jamais comme des chapitres ou citations réels. N'invente aucun fait biographique, chiffre, témoignage, certification, résultat garanti ou contenu vérifié.
- Bonus : ne le présente que s'il a été réellement fourni ; sinon retourne une chaîne vide.
- Suggère une catégorie existante quand elle correspond. Ne crée une nouvelle catégorie que si aucune catégorie existante ne convient.

Retourne STRICTEMENT un objet JSON valide, sans Markdown ni texte avant/après, avec exactement ces clés :
{
  "short_description": "Accroche de catalogue spécifique au sujet",
  "full_description": "Description éditoriale détaillée de 250 à 400 mots",
  "key_points": ["Point concret 1", "Point concret 2", "Point concret 3", "Point concret 4"],
  "bonus_presentation": "",
  "cta_text": "Appel à l'action",
  "suggested_category": null
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.75,
            maxOutputTokens: 1800,
          },
        });

        if (response && response.text) {
          resultJson = JSON.parse(response.text.trim().replace(/^```(?:json)?\\s*/i, '').replace(/\\s*```$/, ''));
        }
      } catch (geminiErr: any) {
        console.warn('[Gemini Product AI Generator Warning]:', geminiErr?.message || geminiErr);
      }
    }

    // High quality deterministic fallback
    if (!resultJson) {
      resultJson = {
        short_description: `Une exploration de « ${cleanTitle} », pensée pour les lecteurs qui veulent mieux comprendre le thème de cet ouvrage et transformer leurs idées en pistes d'action adaptées à leur situation.`,
        full_description: `POURQUOI S'INTÉRESSER À CET OUVRAGE ?\n\n« ${cleanTitle} » invite à approfondir un sujet qui mérite une réflexion structurée. Cette fiche présente les axes suggérés par son titre et sa catégorie (${category || 'thématique à préciser'}), afin de vous aider à déterminer si le contenu correspond à vos besoins.\n\nCE QUE VOUS POUVEZ EN EXPLORER\n\nSelon le thème annoncé, l'ouvrage peut servir de point de départ pour clarifier vos priorités, questionner vos habitudes et organiser vos prochaines décisions. Utilisez les idées qui correspondent à votre contexte et confrontez-les à votre expérience.\n\nÀ QUI S'ADRESSE CE LIVRE ?\n\nIl peut intéresser les lecteurs qui souhaitent progresser sur cette thématique, acquérir de nouveaux repères et consacrer du temps à leur développement personnel ou professionnel. Le résumé fourni par l'éditeur reste la meilleure référence pour confirmer les sujets réellement traités.\n\nCOMMENT EN TIRER PARTI\n\nPendant l'écoute, notez les idées utiles, choisissez une action réaliste et évaluez ensuite ce qui mérite d'être approfondi. Cette démarche vous aide à passer d'une écoute passive à une réflexion concrète, sans supposer que tous les conseils s'appliquent à chaque situation.\n\nConsultez les informations de la fiche pour vérifier le format et le contenu exact de l'édition proposée.`,
        key_points: [
          `Clarifier les idées et questions centrales liées au thème de l'ouvrage`,
          `Repérer des pistes de réflexion à adapter à votre propre contexte`,
          `Organiser les enseignements utiles en actions concrètes et réalistes`,
          `Approfondir les sujets qui correspondent à vos objectifs actuels`,
        ],
        bonus_presentation: bonus ? `Bonus inclus : ${bonus}` : '',
        cta_text: `Découvrir le livre de ${cleanAuthor} sur WhatsApp`,
      };
    }

    return res.json({ data: {
      ...resultJson,
      bonus_presentation: resultJson.bonus_presentation || resultJson.bonus || '',
    }});
  } catch (error: any) {
    console.error('Error in /api/products/generate-ai:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de la génération IA du produit.' });
  }
});

// ----------------------------------------------------
// 4. LEAD MAGNET AI GENERATOR (ADMIN ONLY)
// ----------------------------------------------------
app.post('/api/lead-magnets/generate-ai', async (req: Request, res: Response): Promise<any> => {
  if (!(await isAuthorizedAdmin(req))) {
    return res.status(401).json({ error: 'Accès non autorisé. Droits administrateur requis.' });
  }

  try {
    const { topic, target_audience, format } = req.body;
    const siteOrigin = (() => {
      try {
        const origin = typeof req.headers.origin === 'string' ? new URL(req.headers.origin).origin : '';
        return /^https?:\/\//.test(origin) ? origin : 'https://vision-books-app.vercel.app';
      } catch {
        return 'https://vision-books-app.vercel.app';
      }
    })();
    let resultJson: any = null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Tu es le stratège marketing en chef de VISION BOOKS. Conçois un guide offert (Lead Magnet) irrésistible à haute conversion.
Thématique: "${topic || 'Entrepreneuriat & Liberté Financière'}"
Cible: "${target_audience || 'Entrepreneurs et dirigeants ambitieux'}"
Format: "${format || 'Guide PDF stratégique'}"

Réponds STRICTEMENT sous forme de JSON valide :
{
  "title": "Titre magnétique et professionnel",
  "slug": "titre-en-slug",
  "description": "Texte de présentation séduisant de 2 paragraphes",
  "benefits": ["Bénéfice majeur 1", "Bénéfice majeur 2", "Bénéfice majeur 3", "Bénéfice majeur 4"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        if (response && response.text) {
          resultJson = JSON.parse(response.text.trim().replace(/^```(?:json)?\\s*/i, '').replace(/\\s*```$/, ''));
        }
      } catch (geminiErr: any) {
        console.warn('[Gemini Lead Magnet Generator Warning]:', geminiErr?.message || geminiErr);
      }
    }

    // High quality deterministic fallback
    if (!resultJson) {
      const cleanTopic = topic || 'Stratégie & Leadership';
      resultJson = {
        title: `Guide Stratégique Exécutif : Les Fondements du Succès dans ${cleanTopic}`,
        slug: `guide-${cleanTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        description: `Un condensé tactique pensé pour les décideurs souhaitant gagner du temps et éliminer les erreurs coûteuses. Découvrez des principes à examiner et à adapter à votre situation.`,
        benefits: [
          `Une feuille de route limpide à déployer sous 7 jours`,
          `Les erreurs fréquentes à examiner`,
          `Des questions pour clarifier vos priorités`,
          `Une ressource pour organiser votre apprentissage`,
        ],
      };
    }

    return res.json({ data: resultJson });
  } catch (error: any) {
    console.error('Error in /api/lead-magnets/generate-ai:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de la génération du Lead Magnet.' });
  }
});

// ----------------------------------------------------
// 5. MARKETING FOLLOWUP AI GENERATORS (ADMIN ONLY)
// ----------------------------------------------------

// Full or single-step sequence (J1, J2, J3)
app.post('/api/leads/generate-sequence', async (req: Request, res: Response): Promise<any> => {
  if (!(await isAuthorizedAdmin(req))) {
    return res.status(401).json({ error: 'Accès non autorisé. Droits administrateur requis.' });
  }

  try {
    const { lead_id, first_name, whatsapp, lead_magnet_id, lead_magnet_title, lead_magnet_content, recommended_product, step } = req.body;
    const cleanName = first_name ? String(first_name).trim() : 'Cher lecteur';
    const cleanGuide = lead_magnet_title ? String(lead_magnet_title).trim() : 'notre guide stratégique offert';
    const guideContext = typeof lead_magnet_content === 'string' ? lead_magnet_content.slice(0, 5000) : '';
    const selectedProduct = recommended_product && typeof recommended_product === 'object' && recommended_product.slug && recommended_product.title
      ? recommended_product
      : null;
    const requestOrigin = (() => {
      try {
        const origin = typeof req.headers.origin === 'string' ? new URL(req.headers.origin).origin : '';
        return /^https?:\/\//.test(origin) ? origin : 'https://vision-books-app.vercel.app';
      } catch {
        return 'https://vision-books-app.vercel.app';
      }
    })();
    const productUrl = selectedProduct ? `${requestOrigin}/produit/${encodeURIComponent(String(selectedProduct.slug))}` : `${requestOrigin}/catalogue`;
    const productPrice = selectedProduct
      ? (Number.isFinite(Number(selectedProduct.sale_price)) && Number(selectedProduct.sale_price) > 0 && Number(selectedProduct.sale_price) < Number(selectedProduct.normal_price)
          ? `${selectedProduct.sale_price} € (au lieu de ${selectedProduct.normal_price} €)`
          : (Number.isFinite(Number(selectedProduct.normal_price)) && Number(selectedProduct.normal_price) > 0 ? `${selectedProduct.normal_price} €` : 'prix indiqué sur la fiche'))
      : 'prix indiqué sur chaque fiche';
    const recommendedProduct = selectedProduct ? {
      title: String(selectedProduct.title),
      author: String(selectedProduct.author || ''),
      url: productUrl,
      price: productPrice,
      audio_preview_available: selectedProduct.audio_preview_available === true,
    } : { title: 'Catalogue de livres audio', author: 'VISION BOOKS', url: `${requestOrigin}/catalogue`, price: 'voir les tarifs sur chaque fiche', audio_preview_available: false };

    let sequence = {
      j1: `Bonjour ${cleanName} ! 🎧 C'est l'équipe VISION BOOKS. Avez-vous pu télécharger et consulter « ${cleanGuide} » ? La clé réside dans l'application immédiate d'un principe fort dès les premières 24h. Je reste à votre disposition si vous souhaitez échanger !`,
      j2: `Hello ${cleanName}, je pensais à une situation concrète ce matin : beaucoup d'entrepreneurs stagnent en appliquant d'anciens réflexes. C'est exactement le blocage que nous dépassons dans « ${cleanGuide} ». Quel est votre principal axe de travail cette semaine ? 💡`,
      j3: selectedProduct
        ? `${cleanName}, pour prolonger les idées de « ${cleanGuide} », je vous recommande de découvrir « ${selectedProduct.title} » de ${selectedProduct.author || 'VISION BOOKS'}. Vous trouverez sa présentation, son tarif et${selectedProduct.audio_preview_available ? ' un extrait audio à écouter' : ' les informations de contenu'} ici : ${productUrl}. Prenez le temps de voir si ce contenu correspond à votre objectif ; si vous le souhaitez, répondez-moi et je vous aiderai à faire le bon choix. 🎧📚`
        : `${cleanName}, pour prolonger les idées de « ${cleanGuide} », voici le catalogue VISION BOOKS : ${productUrl}. Choisissez le titre le plus adapté à votre objectif et répondez-moi si vous souhaitez de l’aide pour comparer les contenus. 🎧📚`,
      generated_at: new Date().toISOString(),
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        let prompt = '';
        if (step === 'J1') {
          prompt = `Tu es l'expert en relation client de VISION BOOKS.
Rédige UNIQUEMENT le message WhatsApp de relance J1 (Valeur et éducation, sans vente directe) pour ce prospect :
Prénom : "${cleanName}"
Ressource téléchargée : "${cleanGuide}"
Contenu réel du guide : "${guideContext}"
Le message doit vérifier la réception de ce guide et donner une action concrète liée à son sujet, sans inventer de contenu absent.
Format JSON STRICT : { "j1": "texte du message avec 1 ou 2 emojis" }`;
        } else if (step === 'J2') {
          prompt = `Tu es l'expert en relation client de VISION BOOKS.
Rédige UNIQUEMENT le message WhatsApp de relance J2 (Histoire/mise en situation et prise de conscience, sans vente directe) pour ce prospect :
Prénom : "${cleanName}"
Ressource téléchargée : "${cleanGuide}"
Contenu réel du guide : "${guideContext}"
Le message doit apporter un conseil complémentaire lié à ce guide, poser une question ouverte et ne pas inventer d'exemple présenté comme réel.
Format JSON STRICT : { "j2": "texte du message avec 1 ou 2 emojis" }`;
        } else if (step === 'J3') {
          prompt = `Tu es l'expert en relation client de VISION BOOKS.
Rédige UNIQUEMENT le message WhatsApp J3. Fais le lien avec le guide réellement téléchargé, apporte une dernière valeur utile, puis présente le livre sélectionné ci-dessous avec son lien exact et son prix fourni. Invite le prospect à consulter sa fiche et à écouter l'extrait si disponible. N'invente aucun titre, prix, lien ou bonus.
Prénom : "${cleanName}"
Ressource téléchargée : "${cleanGuide}"
Contenu réel du guide : "${guideContext}"
Livre sélectionné : ${JSON.stringify(recommendedProduct)}
Format JSON STRICT : { "j3": "message WhatsApp personnalisé avec URL complète" }`;
        } else {
          prompt = `Tu es l'expert en relation client de VISION BOOKS (${requestOrigin}).
Rédige 3 messages WhatsApp personnalisés pour un prospect ayant téléchargé cette ressource :
Prénom du prospect : "${cleanName}"
Guide téléchargé : "${cleanGuide}"
Contenu réel du guide : "${guideContext}"
Livre sélectionné pour J3 : ${JSON.stringify(recommendedProduct)}
J1 confirme la réception et donne une action liée au guide ; J2 apporte un conseil complémentaire précis et pose une question ; J3 apporte une dernière valeur puis présente le livre sélectionné avec son URL exacte, son prix fourni et une invitation à écouter l'extrait audio si disponible. Ne fabrique aucune information.

Format JSON STRICT :
{
  "j1": "Message WhatsApp à J+1 (Valeur, vérification de bonne réception, question ouverte bienveillante)",
  "j2": "Message WhatsApp à J+2 (Prise de conscience, anecdote ou conseil stratégique sans vente)",
  "j3": "Message WhatsApp à J+3 (invitation à consulter le catalogue et à comparer les tarifs affichés)"
}`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim().replace(/^```(?:json)?\\s*/i, '').replace(/\\s*```$/, ''));
          if (step === 'J1' && parsed.j1) sequence.j1 = parsed.j1;
          else if (step === 'J2' && parsed.j2) sequence.j2 = parsed.j2;
          else if (step === 'J3' && parsed.j3) sequence.j3 = parsed.j3;
          else if (parsed.j1 && parsed.j2 && parsed.j3) {
            sequence.j1 = parsed.j1;
            sequence.j2 = parsed.j2;
            sequence.j3 = parsed.j3;
          }
        }
      } catch (geminiErr: any) {
        console.warn('[Gemini Followup Sequence Generator Warning]:', geminiErr?.message || geminiErr);
      }
    }

    return res.json({
      success: true,
      ...sequence,
      recommendedProduct,
    });
  } catch (error: any) {
    console.error('Error in /api/leads/generate-sequence:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de la génération de la séquence.' });
  }
});

// Single custom followup message generator
app.post('/api/leads/generate-followup', async (req: Request, res: Response): Promise<any> => {
  if (!(await isAuthorizedAdmin(req))) {
    return res.status(401).json({ error: 'Accès non autorisé. Droits administrateur requis.' });
  }

  try {
    const { first_name, lead_magnet_title } = req.body;
    const cleanName = first_name ? String(first_name).trim() : 'Cher lecteur';
    const cleanGuide = lead_magnet_title ? String(lead_magnet_title).trim() : 'notre ressource offerte';

    let message = `Bonjour ${cleanName} ! 🎧 J'espère que vous avez pu ouvrir « ${cleanGuide} » sur VISION BOOKS. Le secret des leaders réside dans l'application immédiate d'un principe clé. N'hésitez pas si vous avez la moindre question pour son application !`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Tu es le conseiller stratégique personnel de la maison d'édition audio VISION BOOKS.
Rédige un message WhatsApp de relance chaleureux, professionnel et percutant en français :
- Prénom : "${cleanName}"
- Guide téléchargé : "${cleanGuide}"
- 2 paragraphes concis, 2-3 emojis pertinents, invitation naturelle à échanger.
Réponds DIRECTEMENT avec le texte brut du message prêt à être envoyé.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 400,
          },
        });

        if (response && response.text) {
          message = response.text.trim();
        }
      } catch (geminiErr: any) {
        console.warn('[Gemini Followup Generator Warning]:', geminiErr?.message || geminiErr);
      }
    }

    return res.json({ message });
  } catch (error: any) {
    console.error('Error in /api/leads/generate-followup:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de la génération du message.' });
  }
});

// Record lead magnet download
app.post(['/api/lead-magnets/:id/download', '/api/lead-magnets/:slug/download'], (req: Request, res: Response) => {
  const param = req.params.id || req.params.slug || 'guide';
  const cleanSlug = String(param).replace(/[^a-zA-Z0-9_-]/g, '');
  res.json({
    success: true,
    downloads_count: 1,
    download_url: `/downloads/${cleanSlug}.txt`,
  });
});

// ----------------------------------------------------
// 6. UPLOAD HANDLER
// ----------------------------------------------------
app.post('/api/upload', async (req: Request, res: Response): Promise<any> => {
  if (!(await isAuthorizedAdmin(req))) {
    return res.status(401).json({ error: 'Accès non autorisé.' });
  }
  return res.status(410).json({
    error: 'Cette ancienne route Base64 est désactivée. Le téléversement utilise désormais Firebase Storage.',
  });
});
// ----------------------------------------------------
// 7. DOWNLOAD GUIDE HANDLER
// ----------------------------------------------------
app.get('/downloads/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '') || 'vision-books-guide.txt';

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanName.replace(/\.pdf$/, '.txt')}"`);

  res.send(`================================================================================
VISION BOOKS — RESSOURCE STRATÉGIQUE EXCLUSIVE
${cleanName.toUpperCase()}
================================================================================
Félicitations pour votre inscription sur VISION BOOKS !
Vous trouverez ci-dessous une courte ressource de réflexion fournie par l’équipe éditoriale de VISION BOOKS.

--------------------------------------------------------------------------------
1. LE PRINCIPE DU SAVOIR À HAUT EFFET DE LEVIER
--------------------------------------------------------------------------------
Une progression durable commence souvent par des objectifs clairs, des informations fiables et des actions adaptées à votre contexte.

À chaque écoute ou lecture ciblée :
- Vous pouvez comparer plusieurs approches avant de prendre une décision.
- Vous entraînez votre réflexion stratégique.
- Vous identifiez des pistes d'action pour vos projets.

--------------------------------------------------------------------------------
2. VOTRE PLAN D'ACTION IMMÉDIAT
--------------------------------------------------------------------------------
Étape 1 : Isolez 20 minutes aujourd'hui pour lire cette ressource.
Étape 2 : Notez la décision la plus importante à exécuter dans les 24 heures.
Étape 3 : Consultez les fiches du catalogue pour connaître le contenu et les tarifs disponibles.

Visitez notre catalogue officiel :
👉 ${siteOrigin}

Pour toute question ou commande assistée sur WhatsApp :
👉 Utilisez le numéro WhatsApp affiché sur le site pour contacter notre équipe

VISION BOOKS — L'excellence audio pour les esprits ambitieux.
================================================================================`);
});

// ----------------------------------------------------
// 8. CATCH-ALL FOR /api/* (NEVER RETURN HTML!)
// ----------------------------------------------------
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `Route API non trouvée: ${req.method} ${req.path}`,
    serverless: true,
  });
});

export default app;
