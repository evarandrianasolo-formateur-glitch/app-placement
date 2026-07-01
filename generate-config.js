// ──────────────────────────────────────────────────────────────
//  generate-config.js — exécuté par Netlify au build.
//  Génère config.js à partir des variables d'environnement Netlify,
//  pour ne jamais committer les secrets dans le dépôt Git.
//
//  Variables à définir dans Netlify → Site settings → Environment variables :
//    AIRTABLE_TOKEN        (obligatoire)
//    AIRTABLE_BASE_ID      (obligatoire)
//    AIRTABLE_TABLE_NAME   (obligatoire)
//    MAKE_WEBHOOK_URL      (obligatoire pour "Marquer comme placé")
// ──────────────────────────────────────────────────────────────

const fs = require("fs");

const {
  AIRTABLE_TOKEN = "",
  AIRTABLE_BASE_ID = "",
  AIRTABLE_TABLE_NAME = "",
  MAKE_WEBHOOK_URL = "",
} = process.env;

// Avertissement (non bloquant) si une variable manque.
const missing = Object.entries({
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_NAME,
  MAKE_WEBHOOK_URL,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.warn(
    "⚠️  Variables d'environnement manquantes : " + missing.join(", ")
  );
}

// JSON.stringify échappe correctement les guillemets/backslashes.
const config = `// Généré automatiquement au build par generate-config.js — NE PAS ÉDITER.
const AIRTABLE_TOKEN      = ${JSON.stringify(AIRTABLE_TOKEN)};
const AIRTABLE_BASE_ID    = ${JSON.stringify(AIRTABLE_BASE_ID)};
const AIRTABLE_TABLE_NAME = ${JSON.stringify(AIRTABLE_TABLE_NAME)};
const MAKE_WEBHOOK_URL    = ${JSON.stringify(MAKE_WEBHOOK_URL)};
`;

fs.writeFileSync("config.js", config);
console.log("✅ config.js généré depuis les variables d'environnement.");
