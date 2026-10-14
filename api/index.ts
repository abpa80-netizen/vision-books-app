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

    const lastMessage = messages[messages.length - 1]?.content || '';
    let reply = '';

    // Attempt Gemini call if API key configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI();
        const safeCatalogue = Array.isArray(catalogue) ? catalogue.slice(0, 40) : [];
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
WhatsApp configuré : ${typeof whatsappNumber === 'string' && whatsappNumber.replace(/\\D/g, '').length >= 8 ? 'oui' : 'non'}.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: String(lastMessage),
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

    // High quality deterministic fallback if API key absent or quota exceeded
    if (!reply) {
      reply = `Bienvenue chez VISION BOOKS. Nos masterclasses audio sont spécialement conçues pour les dirigeants et visionnaires en quête d'excellence. 

Pour accélérer vos résultats, je vous invite à consulter notre catalogue complet ou à échanger directement avec notre conciergerie privée sur WhatsApp pour une sélection personnalisée. N'hésitez pas également à télécharger nos guides stratégiques offerts !`;
    }

    return res.json({
      message: reply,
      whatsappNumber: typeof whatsappNumber === 'string' ? whatsappNumber : '',
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
    const { title, author, category, hints } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Le titre du livre est obligatoire.' });
    }

    const cleanTitle = title.trim();
    const cleanAuthor = author ? author.trim() : 'Auteur Référent';
    let resultJson: any = null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI();
        const prompt = `Génère le texte marketing complet en français pour ce livre audio de prestige sur VISION BOOKS:
Titre: "${cleanTitle}"
Auteur: "${cleanAuthor}"
Catégorie souhaitée: "${category || ''}"
Notes ou contexte additionnel: "${hints || ''}"

Réponds STRICTEMENT sous forme de JSON valide avec ces clés :
{
  "short_description": "Accroche percutante de 1 à 2 phrases pour le catalogue.",
  "full_description": "Description commerciale complète et vendeuse (3 à 4 paragraphes structurés avec puces).",
  "key_points": ["Point clé 1", "Point clé 2", "Point clé 3", "Point clé 4"],
  "bonus": "Titre et description du bonus confidentiel offert avec ce livre audio.",
  "cta_text": "Commander le livre audio de ${cleanAuthor} sur WhatsApp"
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
          resultJson = JSON.parse(response.text.trim());
        }
      } catch (geminiErr: any) {
        console.warn('[Gemini Product AI Generator Warning]:', geminiErr?.message || geminiErr);
      }
    }

    // High quality deterministic fallback
    if (!resultJson) {
      resultJson = {
        short_description: `Une masterclass audio indispensable de ${cleanAuthor} pour maîtriser les leviers stratégiques et concrétiser vos ambitions professionnelles.`,
        full_description: `Découvrez des modèles mentaux et des principes utiles pour réfléchir aux décisions professionnelles de transformer leur vision en réalité pérenne.\n\nDans cet ouvrage audio immersif, ${cleanAuthor} décortique avec méthode les mécanismes indispensables pour surmonter les obstacles opérationnels et bâtir des résultats durables.\n\nChaque chapitre est articulé autour d'exemples concrets, directement applicables dans votre quotidien stratégique.`,
        key_points: [
          `Les modèles de décision infaillibles adoptés par les leaders mondiaux`,
          `Comment éliminer les frictions d'exécution et décupler votre impact`,
          `La méthode concrète pour bâtir une trajectoire résiliente et pérenne`,
          `Exercices pratiques et synthèses audio prêtes à l'emploi`,
        ],
        bonus: `Fiche mémo exécutive PDF + Plan d'action stratégique sur 30 jours`,
        cta_text: `Commander l'ouvrage de ${cleanAuthor} sur WhatsApp`,
      };
    }

    return res.json(resultJson);
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
    let resultJson: any = null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI();
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
          resultJson = JSON.parse(response.text.trim());
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
          `La grille d'audit exclusive réservée aux membres VIP`,
          `Accès prioritaire aux futures masterclasses audio de VISION BOOKS`,
        ],
      };
    }

    return res.json(resultJson);
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
    const { lead_id, first_name, whatsapp, lead_magnet_id, lead_magnet_title, step } = req.body;
    const cleanName = first_name ? String(first_name).trim() : 'Cher lecteur';
    const cleanGuide = lead_magnet_title ? String(lead_magnet_title).trim() : 'notre guide stratégique offert';

    // Standard high-converting recommended product for sequence conclusion
    const recommendedProduct = {
      title: "un livre audio adapté à votre objectif",
      author: "VISION BOOKS",
      slug: "",
      price: "au tarif affiché sur la fiche du livre",
    };

    let sequence = {
      j1: `Bonjour ${cleanName} ! 🎧 C'est l'équipe VISION BOOKS. Avez-vous pu télécharger et consulter « ${cleanGuide} » ? La clé réside dans l'application immédiate d'un principe fort dès les premières 24h. Je reste à votre disposition si vous souhaitez échanger !`,
      j2: `Hello ${cleanName}, je pensais à une situation concrète ce matin : beaucoup d'entrepreneurs stagnent en appliquant d'anciens réflexes. C'est exactement le blocage que nous dépassons dans « ${cleanGuide} ». Quel est votre principal axe de travail cette semaine ? 💡`,
      j3: `${cleanName}, pour aller plus loin que les principes condensés dans votre guide, notre masterclass audio intégrale « ${recommendedProduct.title} » par ${recommendedProduct.author} est disponible au tarif préférentiel de ${recommendedProduct.price}. Vous pouvez écouter un premier extrait offert ou commander directement en répondant à ce message ! 🎧📚`,
      generated_at: new Date().toISOString(),
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI();

        let prompt = '';
        if (step === 'J1') {
          prompt = `Tu es l'expert en relation client de VISION BOOKS.
Rédige UNIQUEMENT le message WhatsApp de relance J1 (Valeur et éducation, sans vente directe) pour ce prospect :
Prénom : "${cleanName}"
Ressource téléchargée : "${cleanGuide}"
Format JSON STRICT : { "j1": "texte du message avec 1 ou 2 emojis" }`;
        } else if (step === 'J2') {
          prompt = `Tu es l'expert en relation client de VISION BOOKS.
Rédige UNIQUEMENT le message WhatsApp de relance J2 (Histoire/mise en situation et prise de conscience, sans vente directe) pour ce prospect :
Prénom : "${cleanName}"
Ressource téléchargée : "${cleanGuide}"
Format JSON STRICT : { "j2": "texte du message avec 1 ou 2 emojis" }`;
        } else if (step === 'J3') {
          prompt = `Tu es l'expert en relation client de VISION BOOKS.
Rédige UNIQUEMENT le message WhatsApp de relance J3 (Transition vers la masterclass audio « ${recommendedProduct.title} » à ${recommendedProduct.price}) pour ce prospect :
Prénom : "${cleanName}"
Ressource téléchargée : "${cleanGuide}"
Format JSON STRICT : { "j3": "texte du message avec invitation courtoise sur WhatsApp" }`;
        } else {
          prompt = `Tu es l'expert en relation client de VISION BOOKS (https://vision-books.vercel.app).
Rédige 3 messages WhatsApp de relance personnalisés et courtois pour un prospect ayant téléchargé un guide :
Prénom du prospect : "${cleanName}"
Guide téléchargé : "${cleanGuide}"
Livre recommandé pour J3 : « ${recommendedProduct.title} » par ${recommendedProduct.author} (${recommendedProduct.price})

Format JSON STRICT :
{
  "j1": "Message WhatsApp à J+1 (Valeur, vérification de bonne réception, question ouverte bienveillante)",
  "j2": "Message WhatsApp à J+2 (Prise de conscience, anecdote ou conseil stratégique sans vente)",
  "j3": "Message WhatsApp à J+3 (Recommandation du livre audio « ${recommendedProduct.title} » et invitation sur WhatsApp)"
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
          const parsed = JSON.parse(response.text.trim());
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
        const ai = new GoogleGenAI();
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
app.post('/api/upload', (req: Request, res: Response): any => {
  try {
    const { filename, data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Aucune donnée fournie pour le téléversement.' });
    }
    // Return structured URL: data is stored as Base64 Data URL for Firestore document persistence
    return res.json({
      url: data,
      filename: filename || `asset-${Date.now()}`,
      size: data.length,
      success: true,
      storageType: 'data_url',
      note: 'Fichier conservé au format Data URL (Base64) pour persistance dans Firestore.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erreur lors du téléversement.' });
  }
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
Vous avez débloqué l'accès complet à cette ressource stratégique préparée par nos
équipe éditoriale de VISION BOOKS.

--------------------------------------------------------------------------------
1. LE PRINCIPE DU SAVOIR À HAUT EFFET DE LEVIER
--------------------------------------------------------------------------------
Les 1% des dirigeants qui réussissent appliquent des modèles mentaux éprouvés
et automatisent leurs décisions stratégiques.

À chaque écoute ou lecture ciblée :
- Vous épargnez des mois d'erreurs coûteuses.
- Vous entraînez votre réflexion stratégique.
- Vous identifiez des pistes d'action pour vos projets.

--------------------------------------------------------------------------------
2. VOTRE PLAN D'ACTION IMMÉDIAT
--------------------------------------------------------------------------------
Étape 1 : Isolez 20 minutes aujourd'hui pour écouter un premier extrait audio.
Étape 2 : Notez la décision la plus importante à exécuter dans les 24 heures.
Étape 3 : Consultez notre catalogue complet pour débloquer les masterclasses intégrales.

Visitez notre catalogue officiel :
👉 https://vision-books.vercel.app

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
