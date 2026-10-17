# Migration de sécurité Firestore — VISION BOOKS

Cette branche prépare une séparation entre :
- `products_public` : fiches publiques, sans URL de téléchargement payant ;
- `products` : catalogue administrateur ;
- `product_private` : URL de téléchargement audio privée, accessible uniquement à l'administrateur.

## Avant toute mise en production

**Ne publiez pas ces règles isolément pendant que l'ancien site reste le site principal.** L'ancien code lit la collection `products` directement. Le nouveau code lit `products_public` pour les visiteurs. La migration et le changement de version doivent être coordonnés pour éviter une page catalogue vide.

## Procédure de bascule contrôlée

1. Vérifier que les produits et liens audio sont sauvegardés.
2. Préparer le nouveau déploiement et confirmer que le compte administrateur Google fonctionne.
3. Dans Firebase Console → Firestore Database → Rules, publier le contenu de `firestore.rules`.
4. Ouvrir l'administration du nouveau déploiement avec le compte administrateur vérifié. La migration se lance automatiquement après la vérification/initialisation Firestore. Attendre le message de réussite dans les logs.
5. Vérifier dans Firestore qu'un produit existe dans `products_public`, que `audio_download_url` est absent de son document public, et que l'URL est conservée dans `product_private`.
6. Tester en navigation privée que le catalogue public fonctionne et qu'un visiteur non connecté ne peut pas lire `products` ou `product_private`.
7. Seulement après ces tests, basculer le domaine principal vers le nouveau projet Vercel et retester l'administration et les commandes WhatsApp.

Les règles Firebase ne sont pas publiées par un commit GitHub ou un déploiement Vercel. La migration doit être confirmée avant la bascule du domaine. En cas d'erreur, arrêter la bascule et conserver l'ancien déploiement le temps de diagnostiquer.
