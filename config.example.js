// ──────────────────────────────────────────────────────────────
//  app-placement — Configuration
//  Copier ce fichier en config.js et renseigner vos identifiants.
//  Ne pas committer config.js (déjà dans .gitignore)
// ──────────────────────────────────────────────────────────────

// ⚠️ SÉCURITÉ : ce token Airtable est visible côté client (dans le
// navigateur). Utilisez un Personal Access Token à portée limitée :
// lecture + écriture sur CETTE base uniquement, jamais un token
// "tous accès". Pour une app en production avec des données
// sensibles, préférez un proxy backend (Netlify Function).
const AIRTABLE_TOKEN     = "COLLER_ICI_VOTRE_TOKEN_AIRTABLE";
const AIRTABLE_BASE_ID   = "COLLER_ICI_VOTRE_BASE_ID";       // ex: appXXXXXXXXXXXXXX
const AIRTABLE_TABLE_NAME = "Candidats";

// URL du webhook Make — déclenché UNIQUEMENT au clic
// "Marquer comme placé" (fan-out vers 4 services OAuth)
const MAKE_WEBHOOK_URL = "COLLER_ICI_VOTRE_URL_MAKE";
