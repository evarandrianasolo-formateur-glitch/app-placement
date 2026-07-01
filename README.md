# app-placement — Suivi candidats + fan-out placement

Application de suivi des candidats pour Marie Fontaine (RH). Le point clé de
ce projet : **l'app ne passe par Make que pour UNE seule action** — le reste
se fait en direct avec Airtable.

---

## Pourquoi cette architecture (et pas "tout dans Make")

| Action | Chemin | Pourquoi |
|---|---|---|
| Lire la liste des candidats | **App → Airtable direct** | Une lecture n'a besoin d'aucune orchestration. Passer par Make ajouterait une latence et un point de panne sans aucun bénéfice. |
| Changer un statut simple (En cours → Entretien) | **App → Airtable direct** | Une seule écriture, un seul service. Make n'apporte rien ici. |
| Marquer un candidat "Placé" | **App → Make → 4 services** | **Le seul cas qui justifie Make.** Un événement unique doit déclencher 4 actions dans 4 services OAuth différents (Google Docs, Google Calendar, Slack, Google Sheets). Coder et maintenir ces 4 authentifications OAuth (refresh tokens, scopes, gestion d'erreur par service) en Netlify Function représenterait plusieurs jours de dev. Make a ces connecteurs déjà prêts — l'auth se fait en 2 clics dans son interface, pas en code. |

**Le critère à retenir** : Make se justifie quand une seule action doit
orchestrer plusieurs services externes déjà pré-connectés (OAuth), pas
pour une simple lecture/écriture vers un seul outil.

---

## Stack

- **App** : HTML/CSS/JS vanilla, déployée sur Netlify
- **Lecture/écriture simple** : Airtable REST API (appel direct depuis le navigateur)
- **Orchestration placement** : Make.com (1 scénario, 4 branches en parallèle)
- **Services fan-out** : Google Docs, Google Calendar, Slack, Google Sheets

---

## Setup local

```bash
git clone https://github.com/[votre-compte]/app-placement
cd app-placement
cp config.example.js config.js
# Renseigner AIRTABLE_TOKEN, AIRTABLE_BASE_ID, MAKE_WEBHOOK_URL dans config.js
```

Sans config.js rempli, l'app tourne en mode démo avec 3 candidats fictifs —
pratique pour tester l'interface avant d'avoir branché Airtable et Make.

---

## Structure Airtable

**Table : Candidats**

| Champ | Type | Notes |
|---|---|---|
| Nom | Text | |
| Email | Email | |
| Poste | Text | |
| Statut | Single select | En cours / Entretien / Placé |
| Entreprise_cliente | Text | Rempli au placement (par Make) |
| Date_debut_mission | Date | Rempli au placement (par Make) |
| Salaire_annuel | Number | Rempli au placement (par Make) |
| Montant_commission | Number | Rempli au placement (par Make) |
| Date_placement | Date | Rempli au placement (par Make) |
| Contrat_doc_url | URL | Rempli par Make — lien du contrat généré |

> Remarque : l'app écrit directement le champ `Statut` pour "En cours" ↔
> "Entretien". Elle n'écrit PAS "Placé" ni les champs de placement — c'est
> Make qui le fait, après avoir orchestré les 4 services. Ça évite une
> désynchronisation entre "ce que l'app pense" et "ce qui a vraiment été fait".

---

## Token Airtable — portée à limiter

Créer un **Personal Access Token** (pas la clé API legacy) sur
[airtable.com/create/tokens](https://airtable.com/create/tokens) avec :
- Scope : `data.records:read` + `data.records:write`
- Accès limité à **cette base uniquement**, pas "toutes les bases"

Ce token est visible côté client (dans le code source du navigateur) — la
limitation de portée est donc la seule protection réelle en l'absence de
backend. Pour une app avec des données plus sensibles, préférer un proxy
via Netlify Function qui garde le token côté serveur.

---

## Make — Scénario "Placement candidat"

Un seul scénario, déclenché uniquement par le clic "Marquer comme placé".

### [1] Webhooks → Custom webhook

- Nom : `placement-candidat`
- Copier l'URL générée → la coller dans `MAKE_WEBHOOK_URL` (config.js)
- Données reçues : `candidat_id`, `candidat_nom`, `candidat_email`, `poste`,
  `entreprise_cliente`, `date_debut`, `salaire_annuel`,
  `montant_commission`, `date_placement`

### [2] Router — 4 branches en parallèle

Ajouter un module **Router** juste après le webhook. Par défaut, Make
exécute **toutes les branches d'un router** (sauf si vous ajoutez des
filtres différenciants) — ici on veut justement que les 4 partent en même
temps.

---

#### BRANCHE A — Google Docs : créer le contrat

**Module : Google Docs → Create a Document from a Template**
- Template Doc ID : [ID de votre modèle de contrat, préparé en amont avec
  des variables du type `{{NOM_CANDIDAT}}`, `{{POSTE}}`, `{{ENTREPRISE}}`,
  `{{SALAIRE}}`, `{{DATE_DEBUT}}`]
- Variables à remplacer :
  - `NOM_CANDIDAT` → `{{1.candidat_nom}}`
  - `POSTE` → `{{1.poste}}`
  - `ENTREPRISE` → `{{1.entreprise_cliente}}`
  - `SALAIRE` → `{{1.salaire_annuel}}`
  - `DATE_DEBUT` → `{{1.date_debut}}`
- Dossier de destination : `/Contrats/{{1.entreprise_cliente}}/`
- Récupérer l'URL du doc créé en sortie → utilisée en [6]

---

#### BRANCHE B — Google Calendar : événement d'onboarding

**Module : Google Calendar → Create an Event**
- Calendrier : celui de Marie
- Titre : `Onboarding — {{1.candidat_nom}} chez {{1.entreprise_cliente}}`
- Date de début : `{{1.date_debut}}`
- Durée : 1h
- Description : `Premier jour de mission pour {{1.candidat_nom}} ({{1.poste}}). Contact : {{1.candidat_email}}`
- Invités : ajouter `{{1.candidat_email}}` si pertinent

---

#### BRANCHE C — Slack : notification équipe

**Module : Slack → Create a Message**
- Canal : `#placements`
- Message :
```
🎉 Nouveau placement !
*{{1.candidat_nom}}* → {{1.poste}} chez *{{1.entreprise_cliente}}*
Début de mission : {{1.date_debut}}
Commission : {{1.montant_commission}} €
```

---

#### BRANCHE D — Google Sheets : tracker commissions

**Module : Google Sheets → Add a Row**
- Spreadsheet : "Tracker Commissions 2026"
- Feuille : "Placements"
- Colonnes à mapper :
  - Date → `{{1.date_placement}}`
  - Candidat → `{{1.candidat_nom}}`
  - Entreprise → `{{1.entreprise_cliente}}`
  - Salaire → `{{1.salaire_annuel}}`
  - Commission → `{{1.montant_commission}}`

---

### [6] Après les 4 branches — Airtable : Update a record (hors router, à la suite)

Une fois les 4 branches terminées, ajouter un module final (en dehors du
router, connecté après) :

**Module : Airtable → Update a record**
- Record ID : `{{1.candidat_id}}`
- Champs à mettre à jour :
  - Statut → `Placé`
  - Entreprise_cliente → `{{1.entreprise_cliente}}`
  - Date_debut_mission → `{{1.date_debut}}`
  - Salaire_annuel → `{{1.salaire_annuel}}`
  - Montant_commission → `{{1.montant_commission}}`
  - Date_placement → `{{1.date_placement}}`
  - Contrat_doc_url → `{{2.url}}` (sortie de la branche A, Google Docs)

> C'est ce module qui synchronise enfin l'Airtable que l'app relit ensuite
> — cohérent avec la règle : Make est responsable d'écrire "Placé", pas l'app.

---

## Déploiement Netlify

1. Pusher le repo sur GitHub (config.js reste local, jamais commité)
2. Netlify → "Add new site" → "Import from Git"
3. Build settings : vide (pas de build step, HTML statique)
4. Deploy

---

## Point de vigilance pédagogique

Ce projet illustre volontairement **la limite** entre ce qui doit passer
par Make et ce qui ne doit pas y passer. Si un apprenant demande "pourquoi
on ne fait pas aussi passer la lecture de la liste par Make ?", la réponse
est : **ça marcherait, mais ce serait plus lent et plus fragile pour zéro
bénéfice** — Make n'ajoute de la valeur que là où il orchestre plusieurs
services externes en une seule fois.
