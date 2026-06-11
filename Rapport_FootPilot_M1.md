# FootPilot — Application Mobile-First de Gestion de Club de Football

## Rapport de Projet Annuel — Master 1 Ingénierie du Web

---

**Équipe projet**

| Nom | Rôle |
|-----|------|
| Alix P | Développeur |
| Yoann G | Scrum Master |
| Anis G | Product Owner |
| Irvine F | Lead Développeur |

**Promotion :** Master 1 Ingénierie du Web  
**Année académique :** 2025-2026  
**Date de soutenance :** Mai 2026  
**Dépôt Git :** Monorepo FootPilot (branche `main`)

---

## Remerciements

Nous tenons à remercier l'ensemble du corps enseignant du Master 1 Ingénierie du Web pour l'encadrement pédagogique tout au long de cette année. Ce projet a été l'occasion de mettre en pratique les enseignements reçus en développement web full-stack, en gestion de projet agile et en déploiement applicatif.

Nous remercions également les joueurs et entraîneurs qui ont accepté de tester l'application en conditions réelles et dont les retours ont guidé nos itérations successives.

---

## Sommaire

| Chapitre | Page approximative |
|---|---|
| Introduction | 4 |
| 1. Présentation du projet | 5 |
| 2. Gestion de projet — Méthode Scrum | 6 |
| 3. Architecture technique | 9 |
| 4. Base de données PostgreSQL | 13 |
| 5. Sécurité | 16 |
| 6. Internationalisation (i18n) | 18 |
| 7. Dockerisation et déploiement | 19 |
| 8. CI/CD | 21 |
| 9. Tests | 22 |
| 10. SEO | 23 |
| Conclusion | 24 |
| Perspectives | 25 |
| Annexes | 26 |
| Glossaire | 32 |

---

## Introduction

Le monde du sport amateur souffre d'un manque criant d'outils numériques adaptés à ses contraintes. Les clubs de football de district gèrent encore trop souvent leurs effectifs via des tableaux Excel, leurs convocations par SMS groupés et leurs résultats sur des cahiers papier. Les logiciels existants sont soit trop complexes pour un usage associatif, soit trop coûteux pour les budgets modestes des clubs amateurs.

FootPilot est né de ce constat. Notre équipe de quatre étudiants en Master 1 Ingénierie du Web a conçu et développé une application web mobile-first complète permettant à un club de football de gérer l'intégralité de son cycle de vie numérique : gestion des membres, organisation des équipes par catégories, planification des événements (matchs et entraînements), suivi des présences, statistiques individuelles et collectives, messagerie interne et diffusion d'actualités.

Ce rapport présente en détail le travail réalisé : les choix technologiques et leur justification, l'organisation Scrum adoptée, l'architecture logicielle mise en place, les mécanismes de sécurité, le pipeline de déploiement, et les perspectives d'évolution du projet.

---

## Chapitre 1 — Présentation du projet

### 1.1 Contexte et problématique

Un club de football amateur regroupe plusieurs profils d'utilisateurs aux besoins distincts. Le gestionnaire (président ou secrétaire) a besoin d'une vision globale : qui sont les membres, quelles équipes existe-il, quels sont les résultats ? L'entraîneur a besoin d'outils opérationnels : convoquer les joueurs, noter les présences, saisir les buts. Le joueur, enfin, veut simplement consulter son planning et ses statistiques personnelles.

FootPilot répond à ces trois besoins au sein d'une unique application, avec un système de rôles qui adapte automatiquement l'interface et les permissions de chaque utilisateur.

### 1.2 Fonctionnalités développées

Le périmètre fonctionnel de FootPilot couvre :

- **Gestion des membres** : invitation par email avec lien tokenisé, codes de rejoindre (join codes) pour les smartphones, profils complets avec photo de profil, numéro de maillot, poste de jeu.
- **Gestion des équipes** : organisation par catégories (U9, U11, U13, Seniors…), affectation des joueurs et entraîneurs, niveaux de championnat.
- **Planning et événements** : création de matchs et d'entraînements avec lieu géolocalisé, durée, description, covoiturage pour les matchs extérieurs.
- **Feuille d'appel** : saisie des présences (présent, absent justifié, absent non justifié, retard, blessé), notes de performance, buts marqués.
- **Statistiques** : buts, passes décisives, taux de présence, détail des tirs (zone : tête / pied gauche / pied droit, circonstance : jeu ouvert / coup franc / penalty, CSC).
- **Chat** : messagerie par salle (équipe, staff, direction), avec accusés de lecture.
- **Actualités** : publication d'articles pour le club ou une équipe spécifique.
- **Abonnements Stripe** : modèle freemium avec limitation (3 équipes, 30 joueurs en gratuit), abonnement mensuel ou paiement unique pour lever les limites.
- **Internationalisation** : 7 langues (français, anglais, arabe, allemand, espagnol, italien, chinois).

### 1.3 Périmètre technique

La décision d'utiliser un monorepo avec deux packages séparés (`frontend/` et `backend/`) permet une séparation claire des responsabilités tout en facilitant le démarrage du projet avec une seule commande Docker Compose.

---

## Chapitre 2 — Gestion de projet — Méthode Scrum

### 2.1 Équipe et rôles Scrum

L'équipe a adopté la méthode Scrum dès le premier jour du projet. Les rôles ont été définis comme suit :

- **Anis G (Product Owner)** : responsable de la vision produit, de la rédaction et de la priorisation des User Stories dans le Product Backlog. Anis a défini les critères d'acceptation de chaque fonctionnalité et a validé les incréments à la fin de chaque sprint.
- **Yoann G (Scrum Master)** : garant du processus Scrum, animateur des cérémonies (daily standups, sprint planning, rétrospectives). Yoann a également veillé à lever les obstacles rencontrés par l'équipe de développement.
- **Irvine F (Lead Développeur)** : responsable des décisions d'architecture technique, de la mise en place du monorepo, de la configuration Docker et des choix de bibliothèques. Irvine a souvent pris en charge les parties les plus complexes du backend.
- **Alix P (Développeur)** : développement frontend et backend, implémentation des fonctionnalités UI, intégration de l'i18n et des composants Tailwind.

### 2.2 Organisation des sprints

Le projet a été découpé en sprints d'une semaine (durée courte adaptée au cadre académique). Chaque sprint suivait un cycle classique :

1. **Sprint Planning** : sélection des User Stories depuis le Backlog, estimation en points (suite de Fibonacci : 1, 2, 3, 5, 8), définition du Sprint Goal.
2. **Daily Standup** (15 min, format asynchrone certains jours) : Qu'ai-je fait hier ? Que vais-je faire aujourd'hui ? Quels obstacles ?
3. **Sprint Review** : démo de l'incrément au Product Owner.
4. **Sprint Rétrospective** : ce qui a bien fonctionné, ce qui peut être amélioré, actions correctives.

[Ajoutez ici une capture du tableau des sprints / burndown chart]  
*Figure 1 — Burndown chart d'un sprint représentatif (sprint 4)*

### 2.3 Product Backlog et User Stories

Le Product Backlog a été maintenu en ligne via un outil Kanban (voir section 2.5). Les User Stories suivaient le format standard :

> **En tant que** [rôle], **je veux** [action], **afin de** [bénéfice].

Exemples de User Stories du backlog :

| ID | User Story | Priorité | Points |
|----|------------|----------|--------|
| US-001 | En tant que gestionnaire, je veux inviter un joueur par email afin qu'il rejoigne mon club | HAUTE | 5 |
| US-002 | En tant qu'entraîneur, je veux créer un entraînement avec lieu et durée afin de planifier la saison | HAUTE | 3 |
| US-003 | En tant que joueur, je veux consulter mes statistiques personnelles afin de suivre ma progression | MOYENNE | 3 |
| US-004 | En tant que gestionnaire, je veux gérer les catégories d'âge du club afin d'organiser les équipes | HAUTE | 2 |
| US-005 | En tant qu'utilisateur, je veux changer la langue de l'interface afin d'utiliser l'app dans ma langue | BASSE | 5 |
| US-006 | En tant qu'entraîneur, je veux saisir la feuille d'appel lors d'un match afin de noter les présences | HAUTE | 5 |
| US-007 | En tant que gestionnaire, je veux voir le tableau de bord du club afin d'avoir une vue d'ensemble | HAUTE | 3 |
| US-008 | En tant qu'utilisateur, je veux me connecter avec email/mot de passe afin d'accéder à mon espace | HAUTE | 2 |

### 2.4 Vélocité et avancement

Au fil des sprints, l'équipe a progressivement amélioré sa vélocité. Les premiers sprints étaient ralentis par la mise en place de l'environnement (Docker, Prisma, authentification). Les sprints suivants ont été plus productifs une fois les fondations posées.

| Sprint | Points planifiés | Points réalisés | Vélocité |
|--------|-----------------|-----------------|---------|
| Sprint 1 | 15 | 11 | 73 % |
| Sprint 2 | 18 | 16 | 89 % |
| Sprint 3 | 20 | 20 | 100 % |
| Sprint 4 | 22 | 21 | 95 % |
| Sprint 5 | 20 | 20 | 100 % |
| Sprint 6 | 18 | 17 | 94 % |

*Note : les points reflètent la complexité relative estimée, pas des heures de travail.*

[Ajoutez ici une capture du graphique de vélocité]  
*Figure 2 — Vélocité de l'équipe sur les 6 sprints*

### 2.5 Tableau Kanban

Le tableau Kanban utilisé comportait les colonnes suivantes :

- **Backlog** : toutes les User Stories non planifiées
- **Sprint Backlog** : stories sélectionnées pour le sprint courant
- **In Progress** : en cours de développement
- **Code Review** : Pull Request ouverte, en attente de revue
- **Done** : validé par le Product Owner

[Ajoutez ici une capture du tableau Kanban]  
*Figure 3 — Tableau Kanban du projet FootPilot*

### 2.6 Conventions de développement

L'équipe a adopté la convention **Conventional Commits** (https://www.conventionalcommits.org/en/v1.0.0/) pour tous les messages de commit. Cette convention impose un format structuré qui facilite la lecture de l'historique et l'automatisation du changelog.

**Format :** `type(scope): description`

**Types utilisés :**
- `feat` : nouvelle fonctionnalité (`feat(player): create new entity Player`)
- `fix` : correction de bug (`fix(trainer): update entity Trainer, add name attribute`)
- `chore` : tâche de maintenance (`chore: improve planning UI`)
- `ci` : configuration CI/CD (`ci: add new stage`)
- `docs` : documentation (`docs: create dev doc`)
- `test` : tests (`test: add player tests`)

**Nommage des branches :** `feature/fp-001/backend/` où `fp-001` est l'identifiant du ticket Kanban.

---

## Chapitre 3 — Architecture technique

### 3.1 Vue d'ensemble de la stack

FootPilot est une application web full-stack organisée en monorepo. Voici la stack technologique complète :

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend — Framework | React | 18.3.1 |
| Frontend — Build tool | Vite | 5.3.1 |
| Frontend — Language | TypeScript | 5.4.5 |
| Frontend — Styling | Tailwind CSS | 3.4.4 |
| Frontend — Routing | React Router | v6.24.0 |
| Frontend — HTTP client | Axios | 1.7.2 |
| Frontend — Icons | Lucide React | 0.400.0 |
| Backend — Framework | Express.js | 4.19.2 |
| Backend — Language | TypeScript | 5.4.5 |
| Backend — ORM | Prisma | 5.14.0 |
| Backend — Validation | Zod | 3.23.8 |
| Backend — Auth | jsonwebtoken | 9.0.2 |
| Backend — Passwords | bcryptjs | 2.4.3 |
| Backend — Email | Nodemailer | 8.0.7 |
| Backend — Upload | Multer | 1.4.5-lts.1 |
| Backend — Images | Sharp | 0.33.5 |
| Backend — Paiements | Stripe | 22.1.0 |
| Base de données | PostgreSQL | 16 (Alpine) |
| Containerisation | Docker Compose | 3.9 |

### 3.2 Architecture backend

Le backend est une API REST Express.js en TypeScript. Son point d'entrée est `src/index.ts`.

**Structure des dossiers :**
```
backend/
├── prisma/
│   └── schema.prisma          # Source de vérité du schéma DB
├── src/
│   ├── index.ts               # Point d'entrée, montage des routes
│   ├── routes/                # 15 fichiers router (un par ressource)
│   │   ├── auth.ts
│   │   ├── gestionnaire.ts
│   │   ├── clubs.ts
│   │   ├── categories.ts
│   │   ├── equipes.ts
│   │   ├── joueurs.ts
│   │   ├── entraineurs.ts
│   │   ├── evenements.ts
│   │   ├── statistiques.ts
│   │   ├── actualites.ts
│   │   ├── images.ts
│   │   ├── join-codes.ts
│   │   ├── chat.ts
│   │   ├── billing.ts
│   │   └── webhooks.ts
│   ├── middleware/
│   │   └── auth.ts            # verifyToken + requireRole
│   └── lib/
│       ├── prisma.ts          # Singleton Prisma client
│       ├── email.ts           # Templates + envoi Nodemailer
│       └── upload.ts          # Multer + Sharp processing
└── Dockerfile
```

**Le fichier `src/index.ts`** configure l'application Express avec les middlewares essentiels (CORS, JSON body parser) et monte chaque router sur son préfixe `/api/resource`. Un détail important : le webhook Stripe nécessite le corps HTTP brut (non parsé en JSON), c'est pourquoi il est monté **avant** le middleware `express.json()` :

```typescript
// Le webhook Stripe nécessite le corps brut — doit être monté AVANT express.json
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
app.use(express.json({ limit: '2mb' }));
```

L'API expose également un endpoint de health check sur `/api/health` qui retourne `{ status: 'ok', timestamp: ... }`, utile pour les sondes Docker et les futurs systèmes d'orchestration.

**Le singleton Prisma (`src/lib/prisma.ts`)** évite les fuites de connexions lors du hot-reload en développement (ts-node-dev). Le pattern `globalThis` permet de réutiliser l'instance déjà créée :

```typescript
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**La gestion des images (`src/lib/upload.ts`)** utilise Multer en mode mémoire (pas de fichiers temporaires sur le disque) et Sharp pour recompresser et redimensionner les images téléversées. Toutes les images sont converties en WebP (qualité 82) et limitées à 800×800 pixels, quelle que soit la taille d'entrée. Les formats acceptés sont JPEG, PNG et WebP. La limite de taille est de 5 Mo par fichier :

```typescript
export async function processImage(buffer: Buffer, maxWidth = 800, maxHeight = 800) {
  const data = await sharp(buffer)
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return { data, mimeType: 'image/webp', size: data.length };
}
```

Les images sont stockées directement en base de données PostgreSQL dans le modèle `Image` (champ `data` de type `Bytes`), ce qui simplifie le déploiement en évitant la gestion d'un bucket de stockage objet.

**Validation Zod :** chaque route backend valide ses entrées avec des schémas Zod. Exemple dans `src/routes/auth.ts` :

```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createClubSchema = z.object({
  clubNom: z.string().min(2).max(100),
  clubVille: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});
```

En cas d'échec de validation, l'API renvoie un `400 Bad Request` avec les erreurs aplaties (`parsed.error.flatten()`).

### 3.3 Architecture frontend

Le frontend est une Single Page Application (SPA) React 18 + Vite + TypeScript.

**Structure des dossiers :**
```
frontend/
├── index.html                 # Shell HTML, lang="fr", meta description, theme-color
├── vite.config.ts             # Proxy /api → backend, alias @/
├── src/
│   ├── App.tsx                # 40+ routes React Router v6
│   ├── main.tsx               # Point d'entrée React
│   ├── api/
│   │   ├── client.ts          # Instance Axios centralisée
│   │   ├── auth.ts
│   │   ├── joueurs.ts
│   │   ├── equipes.ts
│   │   └── ...                # Un fichier par ressource
│   ├── contexts/
│   │   ├── AuthContext.tsx    # User/token + localStorage
│   │   ├── I18nContext.tsx    # Traductions + détection locale
│   │   ├── ThemeContext.tsx   # Mode clair/sombre
│   │   ├── ChatContext.tsx    # État WebSocket / polling chat
│   │   └── BillingContext.tsx # Statut abonnement Stripe
│   ├── components/
│   │   └── layout/
│   │       ├── Sidebar.tsx    # Navigation latérale desktop
│   │       ├── BottomNav.tsx  # Navigation bottom bar mobile
│   │       ├── RequireAuth.tsx # Garde de route avec rôles
│   │       └── LanguageSwitcher.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── JoinPage.tsx
│   │   ├── SplashPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── admin/             # Pages GESTIONNAIRE + ENTRAINEUR
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── MembresPage.tsx
│   │   │   ├── EquipesPage.tsx
│   │   │   ├── JoueursPage.tsx
│   │   │   ├── PlanningPage.tsx
│   │   │   ├── MatchsPage.tsx
│   │   │   ├── EntrainementsPage.tsx
│   │   │   └── ActualitesPage.tsx
│   │   └── dashboard/         # Pages JOUEUR + ENTRAINEUR
│   │       ├── PlanningPage.tsx
│   │       ├── MatchsPage.tsx
│   │       ├── EntrainementsPage.tsx
│   │       ├── StatsPage.tsx
│   │       ├── EquipesPage.tsx
│   │       └── ActualitesPage.tsx
│   ├── types/
│   │   └── index.ts           # Types TypeScript partagés
│   └── i18n/
│       ├── fr.json
│       ├── en.json
│       ├── de.json
│       ├── es.json
│       ├── it.json
│       ├── zh.json
│       └── ar.json
└── Dockerfile
```

**Le client Axios (`src/api/client.ts`)** est configuré pour attacher automatiquement le token JWT depuis le `localStorage` à chaque requête sortante, et pour rediriger vers `/login` en cas de réponse `401` :

```typescript
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('fp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fp_token');
      localStorage.removeItem('fp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

**L'alias de chemin `@/`** évite les imports relatifs en `../../` et est configuré dans `vite.config.ts` (`path.resolve(__dirname, './src')`) ainsi que dans `tsconfig.json`. Exemple d'import : `import RequireAuth from '@/components/layout/RequireAuth'`.

**Le proxy Vite** redirige les appels `/api/*` vers `http://localhost:3001` en développement local. En production, cette responsabilité est assurée par Nginx (voir la section Docker).

**Approche mobile-first :** Tailwind CSS est utilisé avec une approche mobile-first. Les classes de breakpoint (`sm:`, `md:`, `lg:`) sont ajoutées progressivement pour les écrans plus larges. La navigation utilise deux composants distincts : `BottomNav.tsx` (visible sur mobile, icônes en bas d'écran) et `Sidebar.tsx` (visible sur desktop, masquée sur mobile avec `hidden md:flex`).

[Ajoutez ici une capture de la maquette mobile (vue planning joueur)]  
*Figure 4 — Interface mobile-first : vue planning d'un joueur*

[Ajoutez ici une capture de l'interface desktop (vue admin équipes)]  
*Figure 5 — Interface desktop : tableau de gestion des équipes*

### 3.4 Flux de données et providers React

L'application encapsule les routes dans une pile de providers React qui fournissent leurs contextes à tous les composants enfants :

```
<BrowserRouter>
  <I18nProvider>       → traductions + locale
    <ThemeProvider>    → mode clair/sombre
      <AuthProvider>   → user + token + login/logout
        <BillingProvider>  → statut abonnement Stripe
          <ChatProvider>   → rooms + messages
            <Routes>
              ...
```

Ce pattern évite le prop drilling et permet à n'importe quel composant d'accéder aux données globales via les hooks personnalisés : `useAuth()`, `useI18n()`, `useBilling()`.

---

## Chapitre 4 — Base de données PostgreSQL

### 4.1 PostgreSQL 16 et Prisma ORM

FootPilot utilise PostgreSQL 16 (image Docker `postgres:16-alpine`) comme système de gestion de base de données relationnelle. L'accès à la base de données se fait exclusivement via Prisma ORM v5.14, qui joue le rôle de :

- **ORM** : requêtes typées, auto-complétion TypeScript, sécurité contre les injections SQL.
- **Migration tool** : le fichier `prisma/schema.prisma` est la source de vérité. En développement, `npx prisma db push` synchronise directement le schéma. En production (Dockerfile), `npx prisma db push --accept-data-loss` est exécuté au démarrage du conteneur.
- **Générateur de types** : `npx prisma generate` produit le client Prisma typé dans `node_modules/.prisma/client`.

### 4.2 Schéma de données

Le schéma compte **20 modèles** et **8 enums**. Le modèle complet est fourni en Annexe A.

**Enums :**

| Enum | Valeurs |
|------|---------|
| `Role` | `GESTIONNAIRE`, `ENTRAINEUR`, `JOUEUR` |
| `Poste` | `DEF`, `MIL`, `ATT`, `GB` |
| `StatutMatch` | `AVENIR`, `TERMINE`, `ANNULE` |
| `TypeEvenement` | `MATCH`, `ENTRAINEMENT` |
| `StatutPresence` | `PRESENT`, `ABSENT_JUSTIFIE`, `ABSENT_NON_JUSTIFIE`, `RETARD`, `BLESSE` |
| `ChatRoomType` | `EQUIPE`, `STAFF`, `DIRECTION` |
| `ZoneTir` | `TETE`, `PIED_GAUCHE`, `PIED_DROIT` |
| `Circonstance` | `JEU_OUVERT`, `COUP_FRANC`, `PENALTY` |

**Entités principales et leurs relations :**

`Club` est l'entité racine. Tout appartient à un club (cascade delete). Un club est créé par un `User` qui devient automatiquement son propriétaire (`idOwner`).

`User` est le compte d'accès. Un User peut avoir un profil `Joueur` OU un profil `Entraineur` (relation 1-to-1 avec `userId UNIQUE`). Les joueurs ajoutés manuellement par un gestionnaire ont un User stub généré automatiquement avec le flag `isManual: true` et un mot de passe aléatoire.

`Evenement` est le modèle polymorphe central. Le champ `type: TypeEvenement` (MATCH ou ENTRAINEMENT) détermine quels champs optionnels sont renseignés :
- Pour un MATCH : `adversaire`, `scoreDom`, `scoreExt`, `statutMatch`, `placesCovoiturage`
- Pour un ENTRAINEMENT : `categorieId`

`JoueurEquipe` est la table de jonction many-to-many entre joueurs et équipes. Elle contient `dateDebut` et `dateFin` permettant de gérer l'historique des transferts. Les requêtes filtrent sur `dateFin: null` pour n'obtenir que les affiliations actives.

`Presence` est une table de jonction entre `Evenement` et `Joueur` avec une clé primaire composite `(evenementId, joueurId)`. Elle contient le statut de présence, une note de performance, le nombre de buts et un commentaire libre.

`But` enregistre chaque but avec le buteur, le passeur éventuel, la minute, la zone de tir et la circonstance. Le flag `estCSC` (est contre son camp) permet de distinguer les buts marqués normalement des CSC.

[Ajoutez ici le modèle MCD (Modèle Conceptuel de Données) complet]  
*Figure 6 — Modèle Conceptuel de Données de FootPilot*

### 4.3 Indexes et performances

Prisma génère automatiquement des index sur les clés étrangères. Des index composites sont explicitement définis dans le schéma pour les requêtes fréquentes :

```prisma
model JoueurEquipe {
  // ...
  @@index([joueurId, equipeId])
  @@index([equipeId, dateFin])
}
```

L'index `[equipeId, dateFin]` est particulièrement utile pour la requête "donner-moi les joueurs actifs d'une équipe" qui filtre sur `dateFin: null` — pattern très fréquent dans l'application.

### 4.4 Workflow de migration

Le processus de modification du schéma est le suivant :

1. Modifier `prisma/schema.prisma`
2. `npx prisma db push` — applique les changements en base (dev)
3. `npx prisma generate` — régénère le client TypeScript typé
4. Vérifier la cohérence des types dans le code backend
5. Commiter avec le message `feat(db): ...` ou `fix(db): ...`

En production, le Dockerfile du backend exécute `npx prisma db push --accept-data-loss` automatiquement au démarrage du conteneur, ce qui assure que le schéma DB est toujours synchronisé avec le code déployé.

### 4.5 Administration Adminer

En environnement Docker, un service Adminer est disponible sur `http://localhost:8080`. Il permet d'inspecter les tables, d'exécuter des requêtes SQL ad hoc et de visualiser les données sans avoir besoin d'un client PostgreSQL natif. La connexion se fait avec : server=`db`, user=`footpilot`, password=`footpilot_secret`, database=`footpilot`.

[Ajoutez ici une capture de l'interface Adminer avec les tables FootPilot]  
*Figure 7 — Interface Adminer avec le schéma PostgreSQL de FootPilot*

---

## Chapitre 5 — Sécurité

### 5.1 Authentification JWT

FootPilot utilise JSON Web Tokens (JWT) pour l'authentification. Lors de la connexion (`POST /api/auth/login`), le backend génère un token signé avec `HS256` qui contient le payload suivant :

```typescript
interface JwtPayload {
  userId: string;
  role: Role;
  clubId?: string;
}
```

Le token a une expiry de **7 jours** (`{ expiresIn: '7d' }`). Il est retourné dans le corps de la réponse HTTP (pas dans un cookie) et stocké côté client dans le `localStorage` sous la clé `fp_token`.

Le choix du localStorage (plutôt que les cookies HttpOnly) a été fait pour simplifier l'accès depuis l'intercepteur Axios. En production, un stockage en cookie HttpOnly serait préférable pour mitiger les risques XSS.

### 5.2 Middleware d'authentification et d'autorisation

Tout le système de contrôle d'accès backend est concentré dans `src/middleware/auth.ts` :

**`verifyToken`** extrait le token de l'en-tête `Authorization: Bearer <token>`, le vérifie avec `jwt.verify()` et attache le payload décodé à `req.user`. En cas d'absence ou d'invalidité du token, il retourne `401 Unauthorized`.

**`requireRole(...roles)`** vérifie que le rôle de l'utilisateur est dans la liste des rôles autorisés. En cas d'échec, il retourne `403 Forbidden` (et non 401 — la distinction est importante : 401 = non authentifié, 403 = authentifié mais non autorisé).

Ces deux middlewares s'utilisent en composition sur les routes :

```typescript
// Seul GESTIONNAIRE peut créer une invitation
router.post('/invitations', verifyToken, requireRole(Role.GESTIONNAIRE), async (req, res) => { ... });

// GESTIONNAIRE et ENTRAINEUR peuvent lister les joueurs
router.get('/', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => { ... });
```

**Symétrie frontend/backend :** le garde de route `RequireAuth.tsx` implémente la même logique côté client. Il prend un tableau `roles` et redirige vers `/dashboard` si le rôle de l'utilisateur n'est pas dans la liste. Cette double protection (frontend + backend) est une bonne pratique : le frontend protège l'expérience utilisateur, le backend protège les données.

```typescript
export default function RequireAuth({ children, roles }: Props) {
  const { user, isLoading } = useAuth();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

### 5.3 Hachage des mots de passe

Les mots de passe sont hashés avec **bcryptjs** (facteur de coût : 10 rounds par défaut). Lors de la connexion, `bcrypt.compare(password, user.password)` est utilisé pour la vérification. Les mots de passe en clair ne sont jamais stockés ni loggés.

Pour les users stubs générés manuellement (`isManual: true`), un mot de passe aléatoire est généré avec `randomBytes` puis hashé. Ce mot de passe ne sera jamais utilisé car l'utilisateur devra s'inscrire via le lien d'invitation.

### 5.4 CORS

Le middleware CORS est configuré pour n'autoriser que l'origine définie dans la variable d'environnement `CORS_ORIGIN`. En production, cette valeur est l'URL publique du frontend.

```typescript
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
```

En développement (`CORS_ORIGIN=http://localhost:3000`), seul le frontend local est autorisé à appeler l'API. Le fallback `'*'` ne doit être utilisé qu'en développement local sans variable d'environnement configurée.

### 5.5 Flux d'invitation et codes de rejoindre

FootPilot propose deux mécanismes d'inscription :

**Flux invitation email :**
1. Le gestionnaire crée une invitation via `POST /api/gestionnaire/invitations` avec email, prénom, nom, rôle.
2. Le backend génère un token UUID unique (`cuid()`), le stocke en base (`model Invitation`) avec une expiry de 7 jours et envoie un email avec le lien `${APP_URL}/register/${token}`.
3. L'utilisateur clique sur le lien → `GET /register/:token` → formulaire de création de compte.
4. `POST /api/auth/register` : le backend vérifie que le token est valide et non expiré, crée le User, marque le token `usedAt = now()` et retourne un JWT.

**Flux code de rejoindre :**
1. Le gestionnaire génère un code via `POST /api/join-codes` avec le rôle et la date d'expiry.
2. Le code est partagé directement (QR code, message vocal, SMS).
3. L'utilisateur navigue vers `/join/:code` → formulaire d'inscription.
4. `POST /api/auth/join` : le backend vérifie le code, crée le User et incrémente `usedCount`.

Ce second mécanisme est particulièrement adapté aux clubs où tous les joueurs ne disposent pas d'une adresse email.

### 5.6 Validation des données entrantes

Toutes les routes backend valident systématiquement leurs entrées avec **Zod**. Les schémas définissent les types, les longueurs minimales/maximales, les formats (email, URL) et les valeurs autorisées pour les enums. Cette validation à la frontière de l'application garantit l'intégrité des données avant toute interaction avec la base de données.

### 5.7 Isolation par club

Chaque ressource (joueur, équipe, événement…) est filtrée par `clubId = req.user!.clubId`. Il est impossible pour un utilisateur d'un club A d'accéder aux données du club B, même s'il connaît un identifiant d'une ressource de ce club.

---

## Chapitre 6 — Internationalisation (i18n)

### 6.1 Architecture de l'i18n

FootPilot supporte 7 langues : français (`fr`), anglais (`en`), arabe (`ar`), allemand (`de`), espagnol (`es`), italien (`it`) et chinois simplifié (`zh`).

L'internationalisation est implémentée sans bibliothèque externe (pas de i18next ni de react-intl), pour garder une maîtrise totale du code et limiter les dépendances. Le système est entièrement personnalisé via le `I18nContext.tsx`.

### 6.2 Fonctionnement technique

Les traductions sont stockées dans des fichiers JSON dans `src/i18n/`. Le contexte `I18nProvider` charge tous les fichiers statiquement (imports directs dans le bundle Vite) et expose une fonction `t(key)` qui résout les clés en notation pointée :

```typescript
function resolve(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return path; // fallback : retourne la clé si non trouvée
    }
  }
  return typeof cur === 'string' ? cur : path;
}
```

Usage dans les composants : `t('nav.players')` → `"Joueurs"` (en `fr`).

### 6.3 Détection automatique de la locale

Au chargement, le contexte détecte automatiquement la langue de l'utilisateur dans cet ordre de priorité :
1. La préférence sauvegardée en `localStorage` (`fp_locale`)
2. La langue du navigateur (`navigator.language.split('-')[0]`)
3. Fallback sur le français (`fr`)

```typescript
function detectLocale(): Locale {
  const saved = localStorage.getItem('fp_locale') as Locale | null;
  if (saved && saved in translations) return saved;
  const lang = navigator.language.split('-')[0] as Locale;
  return lang in translations ? lang : 'fr';
}
```

### 6.4 Règle de développement pour les traductions

Une règle stricte est définie dans `CLAUDE.md` : **lors de tout ajout de clé de traduction, modifier uniquement `fr.json`**. Les six autres fichiers (`en`, `de`, `es`, `it`, `zh`, `ar`) sont gelés pendant le développement. Cette règle évite de créer des conflits Git sur les fichiers de traduction et permet de se concentrer sur les fonctionnalités plutôt que sur la traduction en cours de développement.

Le fichier `fr.json` est la référence principale. Il couvre toutes les sections de l'application : navigation, rôles, postes, splash screen, formulaires d'authentification, gestion des joueurs, des équipes, des événements, des statistiques, etc.

[Ajoutez ici une capture de l'interface en arabe (RTL) et en anglais]  
*Figure 8 — FootPilot en arabe (écriture droite-gauche) et en anglais*

---

## Chapitre 7 — Dockerisation et déploiement

### 7.1 Architecture Docker Compose

L'environnement de déploiement est entièrement défini dans `docker-compose.yml` (version 3.9). Il comprend **4 services** :

[Ajoutez ici une capture du schéma d'architecture Docker Compose]  
*Figure 9 — Architecture Docker Compose de FootPilot*

**Service `db` — PostgreSQL 16 :**
- Image : `postgres:16-alpine` (image légère)
- Volume persistant : `postgres_data:/var/lib/postgresql/data`
- Health check : `pg_isready -U ${POSTGRES_USER}` toutes les 5 secondes, 10 tentatives max
- Port : `5432:5432`
- Variables : `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` depuis le `.env` racine

**Service `backend` — Node.js Express :**
- Build multi-stage depuis `backend/Dockerfile`
- Dépendance `condition: service_healthy` sur `db` (attend que PostgreSQL soit prêt)
- Port : `3001:3001`
- Variables d'environnement : JWT_SECRET, SMTP_*, APP_URL, CORS_ORIGIN, Stripe keys
- Au démarrage : `npx prisma db push --accept-data-loss && node dist/src/index.js`

**Service `frontend` — Nginx :**
- Build multi-stage : étape 1 (Node.js) compile le bundle Vite, étape 2 (Nginx Alpine) sert les fichiers statiques
- `VITE_API_URL` est injectée comme `ARG` de build Docker et intégrée dans le bundle par Vite
- Configuration Nginx : SPA fallback (`try_files $uri $uri/ /index.html`), proxy `/api/*` → `http://backend:3001`, gzip activé
- Port : `3000:80`

**Service `adminer` :**
- Image : `adminer:latest` avec le thème `pepa-linha`
- Port : `8080:8080`

### 7.2 Dockerfiles multi-stage

**Backend Dockerfile (build multi-stage) :**

```dockerfile
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl      # requis par Prisma
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/@img ./node_modules/@img
COPY prisma ./prisma

EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/index.js"]
```

La copie sélective des modules `sharp` et `@img` est nécessaire car ces modules natifs ont des binaires compilés qui dépendent de l'architecture. Le flag `--ignore-scripts` empêche leur recompilation dans l'étape finale, on les copie donc depuis le builder.

**Frontend Dockerfile (build multi-stage) :**

```dockerfile
FROM node:20-alpine AS builder
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

La variable `VITE_API_URL` est une variable de build Vite (préfixée `VITE_`), elle est baked-in dans le bundle JavaScript à la compilation. C'est pourquoi elle doit être passée comme `ARG` Docker et non comme variable d'environnement runtime.

### 7.3 Configuration Nginx

La configuration Nginx dans `frontend/nginx.conf` joue deux rôles :
1. **SPA fallback** : toutes les URLs inconnues renvoient `index.html`, ce qui permet à React Router de gérer le routing côté client.
2. **Proxy API** : les requêtes vers `/api/` sont proxifiées vers le service `backend:3001` (résolution DNS interne Docker).
3. **Gzip** : compression activée pour les types courants (JSON, CSS, JavaScript, XML).

### 7.4 Commandes de démarrage

```bash
# Démarrage complet (production-like)
docker compose up --build

# Développement local — DB seulement
docker compose up db -d

# Backend en dev
cd backend && npm install && npx prisma db push && npm run dev

# Frontend en dev (autre terminal)
cd frontend && npm install && npm run dev
```

### 7.5 Variables d'environnement

Les variables sensibles sont dans un fichier `.env` à la racine (non commité). Un fichier `.env.example` documente les variables nécessaires :

```env
POSTGRES_DB=footpilot
POSTGRES_USER=footpilot
POSTGRES_PASSWORD=footpilot_secret
JWT_SECRET=change_me_to_a_long_random_string_in_production
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
VITE_API_URL=http://localhost:3001
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@footpilot.fr
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_PAYMENT_PRICE_ID=price_...
```

---

## Chapitre 8 — CI/CD (Intégration et Déploiement Continus)

### 8.1 Philosophie CI/CD

Le CI/CD (Continuous Integration / Continuous Deployment) est la pratique qui consiste à automatiser la vérification et le déploiement du code à chaque modification. L'objectif est de détecter les régressions au plus tôt et de déployer de nouvelles versions sans intervention manuelle.

Dans FootPilot, le CI/CD est conçu pour être déclenché à chaque push sur la branche `main` ou à chaque ouverture de Pull Request.

### 8.2 Pipeline CI/CD — Stages

Un pipeline CI/CD pour FootPilot se découpe en plusieurs stages séquentiels :

**Stage 1 — Lint & Type Check**
- Vérification des types TypeScript : `tsc --noEmit` (backend et frontend)
- Lint du code : ESLint (si configuré)
- Objectif : détecter les erreurs de typage et les violations de style de code

**Stage 2 — Build**
- Build du backend : `npm run build` → compile TypeScript vers `dist/`
- Build du frontend : `npm run build` → bundle Vite vers `dist/`
- Génération du client Prisma : `npx prisma generate`
- Objectif : vérifier que le projet compile sans erreur

**Stage 3 — Docker Build**
- Construction des images Docker : `docker build -f backend/Dockerfile ./backend`
- Construction de l'image frontend avec `--build-arg VITE_API_URL`
- Publication des images sur un registry (Docker Hub ou GitHub Container Registry)
- Objectif : vérifier que les Dockerfiles sont valides

**Stage 4 — Tests** *(à implémenter — voir Chapitre 9)*
- Tests unitaires backend
- Tests d'intégration API
- Tests E2E frontend

**Stage 5 — Deploy**
- Pull de la nouvelle image sur le serveur de production
- `docker compose pull && docker compose up -d`
- Vérification du health check `/api/health`

[Ajoutez ici une capture du pipeline CI/CD (ex: GitHub Actions ou GitLab CI)]  
*Figure 10 — Pipeline CI/CD de FootPilot avec ses stages*

### 8.3 Exemple de configuration GitHub Actions

```yaml
name: CI/CD FootPilot

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci && npx tsc --noEmit
      - run: cd frontend && npm ci && npx tsc --noEmit

  build:
    runs-on: ubuntu-latest
    needs: type-check
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: docker compose build

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          ssh user@server "cd /app && docker compose pull && docker compose up -d"
```

### 8.4 Intégration continue en pratique

Pendant le développement de FootPilot, les pratiques d'intégration continue suivantes ont été appliquées manuellement :
- **Code review** sur chaque Pull Request avant merge sur `main`
- **Conventional Commits** pour maintenir un historique lisible
- **Branching** : chaque fonctionnalité développée sur sa propre branche `feature/fp-XXX/...`
- **Tests manuels** dans Docker Compose avant chaque merge

---

## Chapitre 9 — Tests

### 9.1 État actuel des tests

FootPilot ne dispose pas actuellement de tests automatisés. Cette décision a été prise délibérément en début de projet pour favoriser la vitesse de développement et le delivery de valeur fonctionnelle. En contexte académique avec une équipe de quatre personnes et des délais courts, tester manuellement dans Docker a permis d'avancer plus rapidement.

### 9.2 Tests manuels réalisés

Bien qu'automatisés, des tests manuels systématiques ont été réalisés :

- Test de chaque route API avec un client HTTP (Postman / Bruno)
- Test des scénarios d'inscription par invitation et par code
- Test du système de rôles (vérification que les 403 et les redirections sont bien déclenchés)
- Test des uploads d'images avec différents formats et tailles
- Test du responsive design sur mobile (Chrome DevTools, iPhone SE, Samsung Galaxy)
- Test de la déconnexion automatique sur expiry du JWT
- Test du webhook Stripe en mode simulation (Stripe CLI)

### 9.3 Roadmap tests pour la v2

La roadmap de tests pour la prochaine version du projet est la suivante :

**Tests unitaires backend (Jest + ts-jest) :**
- Fonctions de validation Zod (tester les cas valides et invalides)
- Middleware `verifyToken` et `requireRole` (mock de `req`, `res`, `next`)
- Fonctions utilitaires (`processImage`, `signToken`, `resolve` i18n)

```bash
# Installation
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

**Tests d'intégration API (Supertest) :**
- Scénarios complets : création d'un club → invitation → inscription → connexion
- CRUD complet sur chaque ressource (joueur, équipe, événement)
- Vérification des codes HTTP (200, 201, 400, 401, 403, 404)
- Utilisation d'une base de données de test (PostgreSQL séparée ou SQLite via Prisma adapter)

**Tests E2E frontend (Playwright) :**
- Scénario de connexion et navigation
- Création d'un événement et saisie de la feuille d'appel
- Consultation des statistiques

**Coverage cible :** 70% de couverture sur le backend (logique métier).

---

## Chapitre 10 — SEO (Optimisation pour les moteurs de recherche)

### 10.1 Contexte SEO d'une SPA

FootPilot est une Single Page Application (SPA). Par nature, les SPAs posent des défis SEO car leur contenu est généré dynamiquement par JavaScript. Les moteurs de recherche traditionnels peuvent avoir des difficultés à indexer le contenu rendu côté client.

Cependant, FootPilot est une application privée (accès par invitation / code), donc l'indexation du contenu des pages authentifiées n'est ni nécessaire ni souhaitable. Les optimisations SEO portent sur les pages publiques : splash page, page de connexion, page d'inscription et page de création de club.

### 10.2 Optimisations appliquées

**Balises meta dans `index.html` :**

```html
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FootPilot</title>
    <meta name="description" content="La gestion de club de football, simplifiée pour tous." />
    <meta name="theme-color" content="#6D28D9" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
```

- `lang="fr"` : indication de la langue principale pour les moteurs de recherche et les lecteurs d'écran
- `name="description"` : description concise affichée dans les résultats de recherche
- `name="theme-color"` : couleur du thème affichée dans la barre de navigation sur mobile Android
- Favicon SVG : format vectoriel moderne, s'adapte à toutes les résolutions

**Police optimisée :**

La police `Plus Jakarta Sans` est chargée via Google Fonts avec `<link rel="preconnect">` vers les domaines Google Fonts et gstatic.com. Le `preconnect` est une directive de performance qui établit la connexion TCP/TLS en avance, réduisant le temps de chargement de la police.

**Compression Gzip :**

La configuration Nginx active la compression Gzip sur les types MIME suivants : `text/plain`, `text/css`, `application/json`, `application/javascript`, `text/xml`, `application/xml`, `text/javascript`. Cette compression réduit significativement la taille des fichiers transmis au navigateur (en général 60-80% pour le JavaScript).

**SPA fallback Nginx :**

La directive `try_files $uri $uri/ /index.html` garantit que toutes les URLs de l'application retournent une réponse 200 (et non 404), ce qui est essentiel pour le bon fonctionnement du routing côté client.

**Performances Vite :**

Vite produit un bundle optimisé avec :
- Tree-shaking : suppression du code mort non utilisé
- Code splitting : séparation automatique du code des vendors (node_modules) du code applicatif
- Assets hachés : `main.[hash].js` pour une mise en cache agressive côté navigateur

### 10.3 Opportunités d'amélioration SEO (v2)

- **Server-Side Rendering (SSR)** ou **Static Site Generation (SSG)** pour les pages publiques avec React 18 Server Components ou Next.js (migration partielle possible)
- **Open Graph tags** pour améliorer le partage sur les réseaux sociaux
- **Sitemap.xml** pour faciliter l'indexation des pages publiques
- **Schema.org** markup pour les données sportives

---

## Chapitre 11 — Système de facturation Stripe

### 11.1 Modèle freemium

FootPilot intègre un système de monétisation basé sur Stripe. Le modèle freemium est le suivant :

| Niveau | Limites | Fonctionnalités |
|--------|---------|-----------------|
| Gratuit (`free`) | 3 équipes max, 30 joueurs max | Fonctions de base sans stats ni chat |
| Fondateur (`isFounder`) | Illimitées | Toutes les fonctionnalités |
| Abonnement actif (`active`) | Illimitées | Toutes les fonctionnalités |
| Paiement unique (`hasUnlockedLimits`) | Illimitées | Fonctions de base sans stats ni chat |

### 11.2 Intégration technique

Le service billing est dans `src/routes/billing.ts`. Le service `src/routes/webhooks.ts` reçoit les événements Stripe asynchrones (confirmation de paiement, expiry d'abonnement…).

La route `POST /api/webhooks` est montée avant `express.json()` pour recevoir le corps brut nécessaire à la vérification de signature Stripe :

```typescript
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
```

Le champ `stripeCustomerId` du modèle `Club` permet de lier un club à un client Stripe. Un client est créé automatiquement au premier achat via `stripe.customers.create()`.

---

## Conclusion

FootPilot est le résultat d'un travail collectif intense de quatre étudiants en Master 1 Ingénierie du Web. En partant d'une problématique réelle — le manque d'outils numériques adaptés aux clubs de football amateur — nous avons construit une application complète, fonctionnelle et déployable.

**Ce que nous avons accompli :**

Sur le plan technique, nous avons maîtrisé la mise en place d'un monorepo full-stack TypeScript avec une API REST Express/Prisma, une SPA React 18 mobile-first, une base de données PostgreSQL et un environnement Docker Compose complet. Nous avons implémenté un système de sécurité robuste (JWT, rôles, CORS, validation Zod), un système d'i18n maison en 7 langues, et une intégration Stripe avec webhooks.

Sur le plan de la gestion de projet, la méthode Scrum a structuré notre travail en sprints mesurables avec une vélocité croissante. L'adoption des Conventional Commits et du branching par feature a maintenu un historique Git propre et lisible.

**Ce que nous avons appris :**

Ce projet a confirmé que la qualité de l'architecture initiale conditionne la vitesse de développement sur le long terme. Les choix faits dès le premier sprint — le monorepo, le singleton Prisma, le pattern RequireAuth/requireRole symétrique — ont facilité chaque fonctionnalité ajoutée ensuite.

Nous avons également appris que la dette technique des tests automatisés se fait rapidement sentir. Les tests manuels sont coûteux en temps et les régressions se détectent plus tard.

---

## Perspectives

### Déploiement Cloud et RGPD

La prochaine étape naturelle pour FootPilot est son déploiement sur un Cloud provider (AWS, GCP, Azure ou OVHcloud pour les clubs soucieux de la souveraineté des données). Ce déploiement soulève des questions importantes :

- **RGPD** : les données de joueurs (nom, date de naissance, photo, performance sportive) sont des données personnelles au sens du RGPD. FootPilot devra implémenter un mécanisme de droit à l'oubli, un registre des traitements et une politique de confidentialité claire.
- **Hébergement souverain** : pour les clubs français, OVHcloud ou Scaleway (hébergeurs européens) sont préférables à AWS/Azure pour se conformer aux exigences de localisation des données.
- **Secrets management** : en production Cloud, les variables d'environnement sensibles (JWT_SECRET, clés Stripe) devront être gérées via des services dédiés (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager).

### Migration vers Kubernetes (K8s)

À mesure que FootPilot acquiert des utilisateurs, Docker Compose ne suffira plus pour garantir la haute disponibilité et le passage à l'échelle. La migration vers Kubernetes apporterait :

- **Scaling horizontal** : multiplication automatique des pods backend lors de pics de charge
- **Auto-healing** : redémarrage automatique des containers en échec
- **Rolling updates** : mise à jour des images sans interruption de service (zero-downtime deployment)
- **Resource limits** : contrôle fin de la mémoire et du CPU alloués à chaque service
- **Ingress Controller** : gestion centralisée du TLS et du routing HTTP (remplacement de Nginx)

Un fichier `k8s/` avec les manifests `Deployment`, `Service`, `Ingress` et `ConfigMap` serait la première étape de cette migration.

### Évolutions fonctionnelles prévues

- **Notifications push** : PWA (Progressive Web App) avec Service Workers pour les notifications de convocation
- **SSR** : Next.js pour améliorer le SEO des pages publiques et les temps de chargement initiaux
- **Tests automatisés** : intégration Jest + Supertest + Playwright dans le pipeline CI/CD
- **API WebSocket** : remplacement du polling du chat par une connexion WebSocket persistante (Socket.io)
- **Export PDF** : feuilles d'appel, statistiques de saison exportables en PDF
- **Application mobile native** : React Native pour une expérience mobile optimale (accès aux notifications système, galerie photo)

---

## Annexes

### Annexe A — Schéma Prisma complet

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  GESTIONNAIRE
  ENTRAINEUR
  JOUEUR
}

enum Poste {
  DEF
  MIL
  ATT
  GB
}

enum StatutMatch {
  AVENIR
  TERMINE
  ANNULE
}

enum TypeEvenement {
  MATCH
  ENTRAINEMENT
}

enum StatutPresence {
  PRESENT
  ABSENT_JUSTIFIE
  ABSENT_NON_JUSTIFIE
  RETARD
  BLESSE
}

enum ChatRoomType {
  EQUIPE
  STAFF
  DIRECTION
}

enum ZoneTir {
  TETE
  PIED_GAUCHE
  PIED_DROIT
}

enum Circonstance {
  JEU_OUVERT
  COUP_FRANC
  PENALTY
}

model Image {
  id        String   @id @default(cuid())
  data      Bytes
  mimeType  String   @default("image/webp")
  size      Int
  createdAt DateTime @default(now())
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  firstName     String
  lastName      String
  role          Role      @default(JOUEUR)
  birthDate     DateTime?
  profilePic    String?
  phone         String?
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(true)
  isManual      Boolean   @default(false)
  clubId        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  club               Club?                   @relation(fields: [clubId], references: [id])
  ownedClubs         Club[]                  @relation("ClubOwner")
  invitationsCreated Invitation[]            @relation("InvitationCreator")
  joinCodesCreated   JoinCode[]              @relation("JoinCodeCreator")
  actualites         Actualite[]             @relation("ActualiteAuteur")
  joueurProfile      Joueur?
  entraineurProfile  Entraineur?
  chatMessages       ChatMessage[]
  chatReceipts       ChatReadReceipt[]
  emailVerifToken    EmailVerificationToken?
}

model Club {
  id          String   @id @default(cuid())
  nom         String
  ville       String
  logoUrl     String?
  description String?
  idOwner     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  stripeCustomerId   String?  @unique @map("stripe_customer_id")
  subscriptionStatus String   @default("free") @map("subscription_status")
  hasUnlockedLimits  Boolean  @default(false) @map("has_unlocked_limits")
  isFounder          Boolean  @default(false) @map("is_founder")

  owner       User?        @relation("ClubOwner", fields: [idOwner], references: [id], onDelete: SetNull)
  users       User[]
  categories  Categorie[]
  equipes     Equipe[]
  joueurs     Joueur[]
  entraineurs Entraineur[]
  invitations Invitation[]
  actualites  Actualite[]
  joinCodes   JoinCode[]
  chatRooms   ChatRoom[]
}

model Categorie {
  id     String @id @default(cuid())
  clubId String
  nom    String

  club       Club        @relation(fields: [clubId], references: [id], onDelete: Cascade)
  equipes    Equipe[]
  evenements Evenement[]
}

model Equipe {
  id                String  @id @default(cuid())
  clubId            String
  categorieId       String
  nomEquipe         String
  niveauChampionnat String?

  club      Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  categorie Categorie @relation(fields: [categorieId], references: [id])

  joueurs     JoueurEquipe[]
  entraineurs EntraineurEquipe[]
  evenements  Evenement[]
  actualites  Actualite[]
  chatRoom    ChatRoom?
}

model Joueur {
  id            String    @id @default(cuid())
  userId        String    @unique
  clubId        String
  birthDate     DateTime
  poste         Poste?
  numeroMaillot Int?
  photoUrl      String?

  user  User   @relation(fields: [userId], references: [id])
  club  Club   @relation(fields: [clubId], references: [id], onDelete: Cascade)

  equipes     JoueurEquipe[]
  presences   Presence[]
  butsMarques But[]      @relation("ButsMarques")
  butsPasses  But[]      @relation("ButsPasses")
}

model Entraineur {
  id        String  @id @default(cuid())
  userId    String  @unique
  clubId    String
  phone     String?
  photoUrl  String?

  user    User             @relation(fields: [userId], references: [id])
  club    Club             @relation(fields: [clubId], references: [id], onDelete: Cascade)
  equipes EntraineurEquipe[]
}

model JoueurEquipe {
  id        String    @id @default(cuid())
  joueurId  String
  equipeId  String
  dateDebut DateTime  @default(now())
  dateFin   DateTime?

  joueur Joueur @relation(fields: [joueurId], references: [id], onDelete: Cascade)
  equipe Equipe @relation(fields: [equipeId], references: [id], onDelete: Cascade)

  @@index([joueurId, equipeId])
  @@index([equipeId, dateFin])
}

model EntraineurEquipe {
  entraineurId String
  equipeId     String

  entraineur Entraineur @relation(fields: [entraineurId], references: [id], onDelete: Cascade)
  equipe     Equipe     @relation(fields: [equipeId], references: [id], onDelete: Cascade)

  @@id([entraineurId, equipeId])
}

model Evenement {
  id          String        @id @default(cuid())
  type        TypeEvenement
  equipeId    String
  dateHeure   DateTime
  duree       Int           @default(120)
  annule      Boolean       @default(false)
  lieu        String?
  latitude    Float?
  longitude   Float?
  description String?
  createdAt   DateTime      @default(now())

  adversaire        String?
  scoreDom          Int?
  scoreExt          Int?
  statutMatch       StatutMatch?
  placesCovoiturage Int?
  categorieId       String?
  snapshotPris      Boolean @default(false)

  equipe    Equipe      @relation(fields: [equipeId], references: [id], onDelete: Cascade)
  categorie Categorie?  @relation(fields: [categorieId], references: [id])
  buts      But[]
  presences Presence[]
}

model Presence {
  evenementId String
  joueurId    String
  statut      StatutPresence
  note        Int?
  buts        Int?
  commentaire String?

  evenement Evenement @relation(fields: [evenementId], references: [id], onDelete: Cascade)
  joueur    Joueur    @relation(fields: [joueurId], references: [id], onDelete: Cascade)

  @@id([evenementId, joueurId])
}

model But {
  id           String        @id @default(cuid())
  evenementId  String
  buteurId     String
  passeurId    String?
  minute       Int?
  zoneTir      ZoneTir?
  circonstance Circonstance?
  estCSC       Boolean       @default(false)

  evenement Evenement @relation(fields: [evenementId], references: [id], onDelete: Cascade)
  buteur    Joueur    @relation("ButsMarques", fields: [buteurId], references: [id])
  passeur   Joueur?   @relation("ButsPasses", fields: [passeurId], references: [id])
}

model Actualite {
  id        String   @id @default(cuid())
  auteurId  String
  clubId    String
  equipeId  String?
  titre     String
  contenu   String
  createdAt DateTime @default(now())

  auteur User    @relation("ActualiteAuteur", fields: [auteurId], references: [id])
  club   Club    @relation(fields: [clubId], references: [id], onDelete: Cascade)
  equipe Equipe? @relation(fields: [equipeId], references: [id])
}

model ChatRoom {
  id        String       @id @default(cuid())
  type      ChatRoomType
  clubId    String
  equipeId  String?      @unique
  createdAt DateTime     @default(now())

  club     Club             @relation(fields: [clubId], references: [id], onDelete: Cascade)
  equipe   Equipe?          @relation(fields: [equipeId], references: [id], onDelete: Cascade)
  messages ChatMessage[]
  receipts ChatReadReceipt[]
}

model ChatMessage {
  id        String   @id @default(cuid())
  roomId    String
  senderId  String
  content   String
  createdAt DateTime @default(now())

  room   ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  sender User     @relation(fields: [senderId], references: [id])
}

model ChatReadReceipt {
  userId     String
  roomId     String
  lastReadAt DateTime @default(now())

  user User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  room ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@id([userId, roomId])
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String   @unique
  token     String   @unique @default(cuid())
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Invitation {
  id        String    @id @default(cuid())
  token     String    @unique @default(cuid())
  email     String?
  firstName String?
  lastName  String?
  role      Role      @default(JOUEUR)
  createdBy String
  clubId    String?
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  creator User  @relation("InvitationCreator", fields: [createdBy], references: [id])
  club    Club? @relation(fields: [clubId], references: [id])
}

model JoinCode {
  id        String   @id @default(cuid())
  code      String   @unique
  role      Role
  clubId    String
  createdBy String
  expiresAt DateTime
  usedCount Int      @default(0)
  createdAt DateTime @default(now())

  club    Club @relation(fields: [clubId], references: [id], onDelete: Cascade)
  creator User @relation("JoinCodeCreator", fields: [createdBy], references: [id])
}
```

---

### Annexe B — Routes API complètes

| Méthode | Route | Rôles autorisés | Description |
|---------|-------|-----------------|-------------|
| POST | `/api/auth/login` | Public | Connexion |
| POST | `/api/auth/register` | Public | Inscription via token invitation |
| POST | `/api/auth/create-club` | Public | Création d'un club + compte gestionnaire |
| POST | `/api/auth/join` | Public | Inscription via code de rejoindre |
| GET | `/api/auth/me` | Tous | Profil de l'utilisateur courant |
| GET | `/api/clubs/:id` | Tous | Informations du club |
| PATCH | `/api/clubs/:id` | GESTIONNAIRE | Modifier le club |
| GET | `/api/categories` | Tous | Lister les catégories |
| POST | `/api/categories` | GESTIONNAIRE | Créer une catégorie |
| DELETE | `/api/categories/:id` | GESTIONNAIRE | Supprimer une catégorie |
| GET | `/api/equipes` | Tous | Lister les équipes |
| POST | `/api/equipes` | GESTIONNAIRE, ENTRAINEUR | Créer une équipe |
| GET | `/api/equipes/:id` | Tous | Détail d'une équipe |
| PATCH | `/api/equipes/:id` | GESTIONNAIRE | Modifier une équipe |
| DELETE | `/api/equipes/:id` | GESTIONNAIRE | Supprimer une équipe |
| POST | `/api/equipes/:id/joueurs` | GESTIONNAIRE, ENTRAINEUR | Ajouter un joueur à une équipe |
| DELETE | `/api/equipes/:id/joueurs/:joueurId` | GESTIONNAIRE, ENTRAINEUR | Retirer un joueur d'une équipe |
| GET | `/api/joueurs` | GESTIONNAIRE, ENTRAINEUR | Lister les joueurs |
| POST | `/api/joueurs` | GESTIONNAIRE, ENTRAINEUR | Créer un joueur |
| GET | `/api/joueurs/:id` | Tous | Détail d'un joueur |
| PATCH | `/api/joueurs/:id` | GESTIONNAIRE, ENTRAINEUR | Modifier un joueur |
| DELETE | `/api/joueurs/:id` | GESTIONNAIRE | Supprimer un joueur |
| GET | `/api/entraineurs` | GESTIONNAIRE | Lister les entraîneurs |
| POST | `/api/entraineurs` | GESTIONNAIRE | Créer un entraîneur |
| DELETE | `/api/entraineurs/:id` | GESTIONNAIRE | Supprimer un entraîneur |
| GET | `/api/evenements` | Tous | Lister les événements |
| POST | `/api/evenements` | GESTIONNAIRE, ENTRAINEUR | Créer un événement |
| GET | `/api/evenements/:id` | Tous | Détail d'un événement |
| PATCH | `/api/evenements/:id` | GESTIONNAIRE, ENTRAINEUR | Modifier un événement |
| DELETE | `/api/evenements/:id` | GESTIONNAIRE | Supprimer un événement |
| GET | `/api/evenements/:id/presences` | GESTIONNAIRE, ENTRAINEUR | Feuille d'appel |
| PUT | `/api/evenements/:id/presences` | GESTIONNAIRE, ENTRAINEUR | Sauvegarder la feuille d'appel |
| POST | `/api/evenements/:id/buts` | GESTIONNAIRE, ENTRAINEUR | Ajouter un but |
| DELETE | `/api/evenements/:id/buts/:butId` | GESTIONNAIRE, ENTRAINEUR | Supprimer un but |
| GET | `/api/statistiques` | GESTIONNAIRE, ENTRAINEUR | Stats équipe |
| GET | `/api/statistiques/me` | JOUEUR | Stats personnelles |
| GET | `/api/actualites` | Tous | Lister les actualités |
| POST | `/api/actualites` | GESTIONNAIRE, ENTRAINEUR | Créer une actualité |
| DELETE | `/api/actualites/:id` | GESTIONNAIRE | Supprimer une actualité |
| POST | `/api/images` | Tous | Upload d'image |
| GET | `/api/images/:id` | Public | Récupérer une image |
| GET | `/api/join-codes` | GESTIONNAIRE | Lister les codes |
| POST | `/api/join-codes` | GESTIONNAIRE | Créer un code |
| DELETE | `/api/join-codes/:id` | GESTIONNAIRE | Supprimer un code |
| GET | `/api/chat/rooms` | Tous | Lister les salles de chat |
| GET | `/api/chat/rooms/:id/messages` | Tous | Lire les messages |
| POST | `/api/chat/rooms/:id/messages` | Tous | Envoyer un message |
| POST | `/api/chat/rooms/:id/read` | Tous | Marquer comme lu |
| GET | `/api/gestionnaire/membres` | GESTIONNAIRE | Lister tous les membres |
| POST | `/api/gestionnaire/invitations` | GESTIONNAIRE | Créer une invitation |
| GET | `/api/gestionnaire/invitations` | GESTIONNAIRE | Lister les invitations |
| DELETE | `/api/gestionnaire/membres/:id` | GESTIONNAIRE | Supprimer un membre |
| GET | `/api/billing/status` | Tous | Statut abonnement |
| POST | `/api/billing/checkout` | GESTIONNAIRE | Créer session Stripe |
| POST | `/api/billing/portal` | GESTIONNAIRE | Portail Stripe |
| POST | `/api/webhooks` | Stripe (signature) | Webhooks Stripe |
| GET | `/api/health` | Public | Health check |

---

### Annexe C — Configuration Docker Compose annotée

```yaml
version: '3.9'

services:
  db:
    image: postgres:16-alpine          # Image légère PostgreSQL 16
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data   # Persistance des données
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 10                       # Backend attend ce health check

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3001
      NODE_ENV: production
      APP_URL: ${APP_URL}
      CORS_ORIGIN: ${CORS_ORIGIN}
      # SMTP pour Nodemailer
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM: ${SMTP_FROM}
      # Stripe
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      STRIPE_SUBSCRIPTION_PRICE_ID: ${STRIPE_SUBSCRIPTION_PRICE_ID}
      STRIPE_PAYMENT_PRICE_ID: ${STRIPE_PAYMENT_PRICE_ID}
    depends_on:
      db:
        condition: service_healthy     # Attend que PostgreSQL soit prêt

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}  # Injectée au moment du build
    restart: unless-stopped
    ports:
      - "3000:80"                       # Nginx écoute sur 80
    depends_on:
      - backend

  adminer:
    image: adminer:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      ADMINER_DEFAULT_SERVER: db        # Pré-remplit le champ serveur
      ADMINER_DESIGN: pepa-linha        # Thème visuel
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:                        # Volume nommé pour la persistance PostgreSQL
```

---

### Annexe D — Maquettes (wireframes)

[Ajoutez ici les maquettes Figma ou wireframes de l'application]

*Figure 11 — Wireframe : écran de connexion (mobile)*

*Figure 12 — Wireframe : tableau de bord gestionnaire (desktop)*

*Figure 13 — Wireframe : feuille d'appel entraîneur (mobile)*

*Figure 14 — Wireframe : statistiques joueur (mobile)*

Les maquettes ont été réalisées en respectant les principes de l'approche mobile-first :
- Composants tactiles larges (minimum 44×44px selon les guidelines iOS/Android)
- Navigation par onglets en bas de l'écran sur mobile (pattern natif)
- Hierarchie visuelle claire avec la police Plus Jakarta Sans
- Palette violet/blanc/gris sombre cohérente avec la marque FootPilot (couleur principale : `#6D28D9`)

---

### Annexe E — Flux d'authentification complet

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX INVITATION EMAIL                         │
│                                                                  │
│  Gestionnaire → POST /api/gestionnaire/invitations               │
│       ↓                                                          │
│  Backend crée Invitation (token UUID, expiresAt +7j)             │
│       ↓                                                          │
│  Nodemailer → email avec lien http://app/register/${token}       │
│       ↓                                                          │
│  Utilisateur clique → RegisterPage → saisit prénom/nom/pass      │
│       ↓                                                          │
│  POST /api/auth/register { token, firstName, lastName, password }│
│       ↓                                                          │
│  Backend vérifie : token valide + non expiré + non utilisé       │
│       ↓                                                          │
│  Crée User (bcrypt hash du mot de passe)                         │
│  Marque invitation.usedAt = now()                                │
│  Retourne { token: JWT_7j, user: {...} }                         │
│       ↓                                                          │
│  Frontend : AuthContext.login() → localStorage fp_token + fp_user│
│       ↓                                                          │
│  Redirect → /dashboard ou /admin selon le rôle                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FLUX CODE DE REJOINDRE                        │
│                                                                  │
│  Gestionnaire → POST /api/join-codes { role, expiresAt }         │
│       ↓                                                          │
│  Backend génère code alphanumérique unique                       │
│  Stocke JoinCode en base                                         │
│       ↓                                                          │
│  Partage du code (QR, SMS, oral)                                 │
│       ↓                                                          │
│  Utilisateur navigue → /join/:code → JoinPage                    │
│       ↓                                                          │
│  POST /api/auth/join { code, firstName, lastName, password }     │
│       ↓                                                          │
│  Backend vérifie : code valide + non expiré                      │
│  Crée User, incrémente JoinCode.usedCount                        │
│  Retourne JWT                                                     │
└─────────────────────────────────────────────────────────────────┘
```

*Figure 15 — Diagramme de séquence des deux flux d'inscription*

---

### Glossaire

**API (Application Programming Interface)** : Interface de programmation permettant à deux logiciels de communiquer. Dans FootPilot, l'API REST du backend expose des endpoints HTTP que le frontend consomme.

**Bcrypt** : Algorithme de hachage de mots de passe conçu pour être lent, ce qui rend les attaques par force brute coûteuses.

**CORS (Cross-Origin Resource Sharing)** : Mécanisme de sécurité du navigateur qui restreint les requêtes HTTP vers des domaines différents de celui de la page. Le backend FootPilot configure CORS via la variable `CORS_ORIGIN`.

**CUID** : Identifiant unique (Collision-resistant Unique IDentifier) généré par Prisma pour les clés primaires. Alternative au UUID, légèrement plus court et lisible.

**Docker Compose** : Outil permettant de définir et de lancer des applications multi-conteneurs via un fichier YAML. FootPilot utilise Docker Compose pour orchestrer ses 4 services.

**Enum** : Type de données énuméré, liste fixe de valeurs possibles. Prisma génère les enums PostgreSQL correspondants (`CREATE TYPE`).

**Express.js** : Framework web minimal pour Node.js, utilisé pour le backend FootPilot.

**Freemium** : Modèle économique offrant une version gratuite limitée et des fonctionnalités premium payantes.

**Health check** : Endpoint (`/api/health`) qui vérifie que l'application fonctionne correctement. Utilisé par Docker pour les dépendances de services.

**Hot reload** : Rechargement automatique de l'application lors d'une modification du code, sans redémarrage manuel. Assuré par `ts-node-dev` (backend) et Vite HMR (frontend).

**JWT (JSON Web Token)** : Standard ouvert (RFC 7519) pour créer des tokens d'accès signés. Contient un payload JSON encodé en Base64 et une signature cryptographique.

**Kubernetes (K8s)** : Système d'orchestration de conteneurs open-source qui automatise le déploiement, la mise à l'échelle et la gestion des applications conteneurisées.

**Middleware** : Fonction qui s'intercale dans la chaîne de traitement d'une requête HTTP. Dans Express, les middlewares sont des fonctions `(req, res, next) => void`.

**Monorepo** : Dépôt Git unique contenant plusieurs projets liés (ici, `frontend/` et `backend/`).

**Multer** : Middleware Express pour la gestion des fichiers multipart/form-data (upload de fichiers).

**ORM (Object-Relational Mapper)** : Couche d'abstraction entre le code objet et la base de données relationnelle. Prisma est l'ORM utilisé dans FootPilot.

**PostgreSQL** : Système de gestion de base de données relationnelle open-source, réputé pour sa fiabilité et sa conformité aux standards SQL.

**Prisma** : ORM TypeScript pour Node.js avec génération automatique de types, client de base de données et outil de migration.

**RGPD (Règlement Général sur la Protection des Données)** : Règlement européen (2016/679) encadrant la collecte et le traitement des données personnelles des résidents de l'UE.

**SPA (Single Page Application)** : Application web qui charge une seule page HTML et met à jour dynamiquement le contenu via JavaScript, sans rechargement de page.

**Scrum** : Cadre de travail agile pour la gestion et le développement de produits complexes, basé sur des itérations courtes (sprints), des rôles définis et des cérémonies régulières.

**Sharp** : Bibliothèque Node.js haute performance pour le traitement d'images (redimensionnement, conversion de format, compression).

**Stripe** : Plateforme de paiement en ligne offrant des APIs pour accepter des paiements, gérer des abonnements et traiter des webhooks.

**Tailwind CSS** : Framework CSS utilitaire (utility-first). Plutôt que d'écrire du CSS personnalisé, on compose les styles directement dans le HTML avec des classes prédéfinies.

**Token** : Dans le contexte de FootPilot, désigne soit un JWT (authentification), soit un UUID d'invitation (inscription).

**TypeScript** : Surensemble typé de JavaScript qui se compile vers du JavaScript standard. Apporte la sécurité des types à la compilation.

**User stub** : Compte User généré automatiquement pour un joueur ajouté manuellement par un gestionnaire. Ce compte a `isManual: true` et un mot de passe aléatoire. Il permet de lier le joueur à un User sans que celui-ci ait encore créé son compte.

**Vite** : Outil de build frontend ultra-rapide utilisant les modules ES natifs en développement et Rollup pour la production.

**Webhook** : Mécanisme par lequel un service externe (ici Stripe) notifie l'application d'un événement en envoyant une requête HTTP POST vers un endpoint dédié.

**WebP** : Format d'image moderne développé par Google, offrant une meilleure compression que JPEG et PNG à qualité équivalente. FootPilot convertit toutes les images uploadées en WebP.

**Zod** : Bibliothèque TypeScript de validation de schémas. Permet de valider les données entrantes et de générer automatiquement les types TypeScript correspondants.

---

*Fin du rapport — FootPilot v1.0 — Master 1 Ingénierie du Web — 2025/2026*
