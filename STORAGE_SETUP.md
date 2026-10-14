# Configuration du stockage Firebase — VISION BOOKS

Le code du site téléverse désormais les ressources gratuites dans Firebase Storage, au lieu d'intégrer les fichiers en Base64 dans Firestore.

## Étape nécessaire avant d'activer le téléversement

1. Ouvrir la console Firebase du projet `gen-lang-client-0082810984`.
2. Ouvrir **Storage → Rules**.
3. Copier le contenu complet de `storage.rules` dans l'éditeur.
4. Publier les règles.
5. Tester un petit PDF depuis l'administration, puis ouvrir son URL dans une fenêtre privée pour confirmer que le guide gratuit est accessible.
6. Vérifier qu'un utilisateur non administrateur ne peut pas téléverser de fichier.

Les règles autorisent la lecture publique uniquement pour les ressources de la collection `lead-magnets`, destinées à être offertes. Elles n'autorisent pas la lecture des autres chemins, notamment les éventuels fichiers audio payants.

**Important :** un commit GitHub ou un déploiement Vercel ne publie pas automatiquement les règles Firebase. Ne considère pas l'upload comme validé tant que les règles n'ont pas été publiées et testées dans Firebase.
