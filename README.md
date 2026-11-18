# Sentinelle — Plateforme de gestion du renseignement

Application web de **collecte, d'analyse et d'exploitation du renseignement**, construite à partir du schéma conceptuel de la base de données ([IMAGE_BD.jpeg](IMAGE_BD.jpeg)).

| Couche | Technologies |
|---|---|
| Base de données | **PostgreSQL** (≥ 13) |
| ORM | **Prisma** 6 (schéma, migrations versionnées, requêtes typées) |
| API | **Node.js** + **Express** 5, authentification JWT, mots de passe bcrypt |
| Interface | **React** 18 + **Vite**, Leaflet (carte), vis-network (graphe), Chart.js (tableaux de bord) |

---

## Démonstration express (sans installer PostgreSQL)

```bash
npm run demo
```

Installe les dépendances si besoin, démarre un PostgreSQL portable dédié (base séparée dans `.demo/`, port 54330), insère les données fictives, compile l'interface et ouvre <http://localhost:4000>. Seul Node.js est requis. `Ctrl + C` arrête tout ; `npm run demo -- --reset` repart de données neuves. Votre `backend/.env` n'est pas utilisé.

Le déroulé complet d'une présentation est décrit dans **[docs/GUIDE_DEMO.md](docs/GUIDE_DEMO.md)**.

---

## Installation sur un nouvel appareil

### Prérequis

- **Node.js 18.18 ou plus** (LTS 22 conseillée) — <https://nodejs.org>
- **Git**
- **PostgreSQL : facultatif.** Deux modes au choix pendant `npm run setup` :

| Mode | Quand l'utiliser | Ce qui se passe |
|---|---|---|
| **1 — PostgreSQL installé** | PostgreSQL est déjà sur le poste (ou via `docker compose up -d`) | Le setup demande hôte, port, utilisateur et mot de passe |
| **2 — PostgreSQL portable** | Rien n'est installé, poste de démo, nouvel arrivant | Une vraie instance PostgreSQL 17 (paquet `embedded-postgres`) est lancée **automatiquement** par `npm run dev` / `npm start`. Données dans `backend/.pgdata/`. Aucun mot de passe à saisir |

Le mode choisi est enregistré dans `backend/.env` (`DB_MODE="local"` ou `"system"`).

### Trois commandes

```bash
git clone <url-du-depot>
cd <dossier-du-depot>
npm run setup
```

Le script `setup` :

1. installe les dépendances du backend et du frontend ;
2. propose le **mode de base** (installé ou portable — le portable est proposé par défaut si aucun PostgreSQL ne répond sur le port 5432) ;
3. vérifie la connexion (ou démarre le PostgreSQL portable) et **crée la base en UTF-8** si elle n'existe pas ;
4. écrit `backend/.env` avec un secret JWT aléatoire ;
5. crée les tables (migrations Prisma) ;
6. insère des **données de démonstration fictives**.

Puis lancez l'application :

```bash
npm run dev
```

Ouvrez <http://localhost:5173>.

> Installation sans question (CI, script) :
> `DB_MODE=local npm run setup -- --yes` (PostgreSQL portable) ou `DB_MODE=system PGPASSWORD=monmdp npm run setup -- --yes`
> (variables reconnues : `DB_MODE`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `APP_PORT`).
> Pour changer de base plus tard : `npm run setup -- --reconfigure`.

### Comptes de démonstration

Mot de passe commun : **`Demo2026!pass`**

| E-mail | Rôle | Habilitation |
|---|---|---|
| `admin@projet.local` | Administrateur | Secret |
| `responsable@projet.local` | Responsable | Secret |
| `analyste@projet.local` | Analyste | Confidentiel |
| `decideur@projet.local` | Décideur | Confidentiel |
| `operateur@projet.local` | Opérateur terrain | Diffusion restreinte |

---

## Commandes utiles (à la racine)

| Commande | Rôle |
|---|---|
| `npm run demo` | Démonstration autonome avec PostgreSQL portable |
| `npm run setup` | Installation / configuration complète |
| `npm run dev` | API (port 4000) + interface (port 5173) avec rechargement automatique |
| `npm start` | Compile l'interface puis sert tout sur <http://localhost:4000> (mode production) |
| `npm run db:local` | (mode portable) démarre seule la base, pour pgAdmin / DBeaver — `Ctrl + C` pour arrêter |
| `npm run db:local:reset` | (mode portable) supprime les données locales `backend/.pgdata/` |
| `npm run db:migrate` | Crée une nouvelle migration après modification de `backend/prisma/schema.prisma` |
| `npm run db:deploy` | Applique les migrations existantes |
| `npm run db:seed` | Insère les données de démo (si la base est vide) |
| `npm run db:reset` | **Efface** la base, rejoue les migrations et réinsère les données de démo |
| `npm run db:studio` | Ouvre Prisma Studio pour parcourir les tables |

---

## Fonctionnalités

**Interface de consultation** (conforme au schéma) :

- **Recherche multicritères** : mots-clés, type, statut, classification, crédibilité, type et cotation de la source, tag, entité, période — résultats triables, paginés, exportables en CSV.
- **Dossiers par entité** : fiche signalétique, liens entrants / sortants, informations rattachées, événements, mini-carte ; export PDF (impression).
- **Cartographie** : carte des lieux, couleur selon l'impact maximal des événements, filtres.
- **Réseau relationnel** : graphe interactif des liens, centrage sur une entité avec profondeur 1 à 4, filtre par type.
- **Chronologie** des événements regroupés par mois.
- **Tableau de bord** : indicateurs clés, activité sur 12 mois, répartitions par statut / classification / impact / type de source.
- **Export de rapports** : CSV (séparateur `;`, compatible Excel) et PDF via l'impression du navigateur.

**Gestion des données** : sources, collectes, informations, entités, liens, localisations, événements, documents (dépôt de fichiers avec empreinte SHA-256), tags, utilisateurs.

**Sécurité et traçabilité** :

- connexion par e-mail / mot de passe (bcrypt), jeton JWT, limitation des tentatives ;
- **droits par rôle** (matrice unique dans [backend/src/permissions.js](backend/src/permissions.js)) ;
- **filtrage par habilitation** : un utilisateur ne voit que les informations (et documents / événements liés) de classification ≤ à son niveau ;
- seuls les responsables valident ou archivent une information ;
- **journal d'audit** (`HISTORIQUE_ACTION`) : connexions, consultations, créations, modifications, suppressions, exports, téléchargements.

### Matrice des droits

| Données | Admin | Responsable | Analyste | Opérateur terrain | Décideur |
|---|:-:|:-:|:-:|:-:|:-:|
| Lecture (selon habilitation) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Saisie sources / collectes / informations / documents | ✓ | ✓ | ✓ | ✓ | — |
| Saisie entités / liens / lieux / événements / tags | ✓ | ✓ | ✓ | — | — |
| Modification | ✓ | ✓ | ✓ | — | — |
| Validation / archivage / suppression | ✓ | ✓ | — | — | — |
| Journal d'audit | ✓ | ✓ | — | — | — |
| Exports | ✓ | ✓ | ✓ | — | ✓ |
| Gestion des utilisateurs | ✓ | — | — | — | — |

### Normes d'ergonomie appliquées

- Contrastes conformes **WCAG 2.1 AA**, thème clair / sombre (préférence système respectée).
- Navigation complète au clavier : lien d'évitement, focus visible, fenêtres modales avec piège du focus et touche Échap, recherche globale `Ctrl + K`.
- Libellés associés à chaque champ, champs obligatoires signalés, messages d'erreur explicites, confirmations avant suppression, notifications d'état.
- Mise en page **responsive** (menu latéral repliable sur tablette / mobile).
- Cotation du renseignement selon la **grille OTAN** (source A–F, information 1–6).

---

## Structure du projet

```
├── package.json            Scripts racine (setup, dev, start, db:*)
├── scripts/
│   ├── setup.mjs           Installation guidée (choix PostgreSQL installé / portable)
│   ├── dev.mjs             Lance base portable (si besoin) + API + interface
│   ├── demo.mjs            Démonstration autonome
│   ├── db-local.mjs        Pilotage du PostgreSQL portable
│   ├── with-db.mjs         Exécute une commande avec la base démarrée
│   └── lib/localdb.mjs     PostgreSQL portable (embedded-postgres)
├── docs/GUIDE_DEMO.md      Guide de présentation et de démonstration
├── docker-compose.yml      PostgreSQL facultatif via Docker
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   Modèle de données (13 tables + 2 tables d'association)
│   │   ├── migrations/     Migrations SQL versionnées
│   │   └── seed.js         Données de démonstration
│   ├── src/
│   │   ├── app.js          Application Express
│   │   ├── permissions.js  Matrice des droits
│   │   ├── middleware/     Authentification, gestion des erreurs
│   │   ├── routes/         Une route par table + recherche, stats, analyse, exports
│   │   └── utils/          CRUD générique, audit, filtrage par habilitation
│   └── uploads/            Documents déposés (non versionnés)
└── frontend/
    └── src/
        ├── components/     Layout, tableaux, formulaires, modales…
        ├── pages/          Écrans de l'application
        ├── lib/            API, authentification, libellés, formats
        └── styles/app.css  Design system
```

### Modèle de données

Tables du schéma conceptuel : `source`, `collecte`, `information`, `entite`, `lien_entre_entites`, `localisation`, `evenement`, `document`, `tag`, `info_tag`, `utilisateur`, `historique_action`.

Tables d'association ajoutées pour les relations N–N du schéma : `info_entite` (information ↔ entité, avec rôle) et `evenement_entite` (entités impliquées dans un événement).

Pour modifier le modèle : éditez `backend/prisma/schema.prisma`, puis `npm run db:migrate` (donnez un nom à la migration) et **committez le dossier `migrations/`** pour que les autres membres l'appliquent avec `npm run db:deploy`.

---

## Dépannage

| Problème | Solution |
|---|---|
| `Mot de passe incorrect` pendant le setup | Utilisez le mot de passe choisi à l'installation de PostgreSQL (utilisateur `postgres`). |
| `PostgreSQL ne répond pas` | Démarrez le service : *Services Windows → postgresql-x64-XX → Démarrer*, ou `docker compose up -d`. |
| Accents illisibles / erreur `WIN1252` | La base a été créée sans UTF-8. Supprimez-la (`DROP DATABASE projet_bd;`) puis relancez `npm run setup`. |
| Port 4000 ou 5173 déjà utilisé | Changez `PORT` dans `backend/.env` ou `VITE_PORT` dans `frontend/.env` (voir `.env.example`). |
| `EPERM … query_engine` sous Windows | Arrêtez l'application (`Ctrl + C`) avant de relancer `npm install` ou `setup`. |
| Repartir de zéro | `npm run db:reset` |
| Mode portable : « port occupé » | Un autre PostgreSQL utilise déjà le port 54329 : `npm run setup -- --reconfigure` et choisissez un autre port |
| Mode portable : « créées par PostgreSQL 18 » | Données d'une autre version : `npm run db:local:reset` puis `npm run setup` |
| Changer de mode (installé ↔ portable) | `npm run setup -- --reconfigure` |

Les commandes `db:*` démarrent et arrêtent automatiquement la base en mode portable.

---

## Travail en équipe (Git)

```bash
git pull                    # récupérer les changements
npm run setup               # si de nouvelles dépendances ou migrations sont arrivées
git checkout -b ma-fonctionnalite
# … modifications …
git add . && git commit -m "Description claire"
git push -u origin ma-fonctionnalite   # puis ouvrir une Pull Request
```

Ne versionnez jamais `backend/.env` (il contient le mot de passe PostgreSQL) : il est déjà exclu par `.gitignore`.

> Toutes les données de démonstration sont **fictives**.
