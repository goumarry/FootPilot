#  FootPilot aaaaaaaaaaaa
Ceci est le test de la branche
Application de gestion de club de football — mobile first.

**Stack :** React 18 + Vite + TypeScript · Node.js + Express + Prisma · PostgreSQL 16 · Docker

---

## Démarrage rapide (Docker)

```bash
# Construire et démarrer tous les services
docker compose up --build
```

| Service | URL |
|---|---|
| Application (frontend) | http://localhost:3000 |
| API (backend) | http://localhost:3001 |
| Interface base de données (Adminer) | http://localhost:8080 |

**Connexion Adminer :** serveur `db` · utilisateur `footpilot` · mot de passe `footpilot_secret` · base `footpilot`

```bash
docker compose down        # Arrêter
docker compose down -v     # Arrêter + supprimer la base de données
```

---

## Rôles

| Rôle | Qui | Accès |
|---|---|---|
| `GESTIONNAIRE` | Créateur du club | Interface `/admin` — membres, catégories, équipes, joueurs, planning, actualités |
| `ENTRAINEUR` | Invité par le gestionnaire | Dashboard — ses équipes, feuilles d'appel, planning, actualités |
| `JOUEUR` | Invité par le gestionnaire | Dashboard — son planning, ses statistiques |

Un club est créé depuis la page publique `/create-club` — cela génère automatiquement le premier compte Gestionnaire.

---

## Flux d'invitation

1. Le Gestionnaire se connecte → `/admin/membres`
2. Il clique **Inviter**, renseigne l'email, le prénom, le nom et le rôle (Entraîneur ou Joueur)
3. Un email est envoyé avec un lien valable 7 jours (ou le lien peut être copié manuellement)
4. La personne ouvre le lien → crée son mot de passe → accède directement à son dashboard
5. Le lien est invalidé après utilisation

---

## Développement local (sans Docker)

**Prérequis :** Node.js ≥ 20 dans WSL/Linux (pas la version Windows)

> Si `which node` retourne `/mnt/c/...`, installez Node.js dans WSL avec nvm :
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
> source ~/.bashrc && nvm install 20 && nvm use 20
> ```

### 1. Démarrer la base de données

```bash
docker compose up db -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # Vérifier DATABASE_URL et JWT_SECRET
npm install
npx prisma db push            # Synchroniser le schéma
npm run dev                   # Hot-reload sur http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # Hot-reload sur http://localhost:3000
```

---

## Variables d'environnement

### `backend/.env`

| Variable | Description | Défaut |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://footpilot:footpilot_secret@localhost:5432/footpilot` |
| `JWT_SECRET` | Clé de signature JWT | ⚠️ À changer en production |
| `PORT` | Port Express | `3001` |
| `SMTP_HOST` | Serveur SMTP | `smtp.ethereal.email` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Identifiant SMTP | — |
| `SMTP_PASS` | Mot de passe SMTP | — |
| `SMTP_FROM` | Adresse expéditeur | `noreply@footpilot.fr` |
| `APP_URL` | URL du frontend (pour les liens d'invitation) | `http://localhost:3000` |

### `frontend/.env`

| Variable | Description | Défaut (build Docker) |
|---|---|---|
| `VITE_API_URL` | URL du backend | `http://localhost:3001` |

---

## API — Référence des routes

### Authentification (`/api/auth`)

| Méthode | Route | Description | Authentification |
|---|---|---|---|
| `POST` | `/api/auth/create-club` | Créer un club + compte Gestionnaire | Non |
| `POST` | `/api/auth/login` | Connexion | Non |
| `GET` | `/api/auth/invitation/:token` | Vérifier un token d'invitation | Non |
| `POST` | `/api/auth/register` | Créer un compte via invitation | Non |
| `GET` | `/api/auth/me` | Profil de l'utilisateur connecté | Oui |

### Gestionnaire (`/api/gestionnaire`) — Gestionnaire uniquement

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/gestionnaire/users` | Membres du club |
| `PATCH` | `/api/gestionnaire/users/:id/role` | Changer le rôle |
| `PATCH` | `/api/gestionnaire/users/:id/active` | Activer / désactiver |
| `DELETE` | `/api/gestionnaire/users/:id` | Supprimer |
| `GET` | `/api/gestionnaire/invitations` | Liste des invitations |
| `POST` | `/api/gestionnaire/invitations` | Créer une invitation |
| `DELETE` | `/api/gestionnaire/invitations/:id` | Supprimer une invitation |

### Clubs, Catégories, Équipes

| Méthode | Route | Rôle minimum |
|---|---|---|
| `GET` | `/api/clubs/:id` | Tous |
| `PUT` | `/api/clubs/:id` | Gestionnaire |
| `GET` | `/api/clubs/:id/membres` | Entraîneur |
| `GET/POST/PUT/DELETE` | `/api/categories` | Gestionnaire |
| `GET/POST/PUT` | `/api/equipes` | Entraîneur |
| `DELETE` | `/api/equipes/:id` | Gestionnaire |
| `POST` | `/api/equipes/:id/joueurs` | Entraîneur |
| `POST` | `/api/equipes/:id/entraineurs` | Gestionnaire |

### Joueurs et Entraîneurs

| Méthode | Route | Description | Rôle minimum |
|---|---|---|---|
| `GET` | `/api/joueurs` | Liste des joueurs du club | Entraîneur |
| `POST` | `/api/joueurs` | Ajouter un joueur manuellement | Entraîneur |
| `PUT` | `/api/joueurs/:id` | Modifier un joueur | Entraîneur |
| `DELETE` | `/api/joueurs/:id` | Supprimer un joueur | Gestionnaire |
| `GET` | `/api/entraineurs` | Liste des entraîneurs | Gestionnaire |
| `PUT` | `/api/entraineurs/:id` | Modifier un entraîneur | Propriétaire ou Gestionnaire |

### Événements, Matchs, Entraînements

| Méthode | Route | Description | Rôle minimum |
|---|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/evenements` | CRUD événements | Entraîneur |
| `POST` | `/api/matchs/:id/buts` | Ajouter un but | Entraîneur |
| `DELETE` | `/api/matchs/:id/buts/:butId` | Supprimer un but | Entraîneur |
| `GET` | `/api/matchs/:id/buts` | Liste des buts | Tous |
| `PUT` | `/api/matchs/:id/score` | Saisir le score | Entraîneur |
| `POST/GET` | `/api/matchs/:id/convocations` | Gérer la liste des convoqués | Entraîneur |
| `POST/GET` | `/api/entrainements/:id/appel` | Feuille d'appel | Entraîneur |

### Statistiques et Actualités

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/statistiques/joueurs/:id` | Stats d'un joueur |
| `GET` | `/api/statistiques/equipes/:id` | Stats d'une équipe |
| `GET` | `/api/statistiques/clubs/:id` | Stats globales du club |
| `GET` | `/api/actualites` | Fil d'actualités du club |
| `POST` | `/api/actualites` | Publier une actualité (Entraîneur+) |
| `DELETE` | `/api/actualites/:id` | Supprimer (Gestionnaire) |

---

## Structure du projet

```
foot-manger/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Modèles de données (source de vérité)
│   └── src/
│       ├── middleware/auth.ts  # Vérification JWT + contrôle des rôles
│       ├── lib/
│       │   ├── prisma.ts       # Client Prisma singleton
│       │   └── email.ts        # Envoi d'emails (invitations, actualités)
│       ├── routes/
│       │   ├── auth.ts         # Login, register, invitation, create-club
│       │   ├── gestionnaire.ts # Gestion des membres et invitations
│       │   ├── clubs.ts
│       │   ├── categories.ts
│       │   ├── equipes.ts
│       │   ├── joueurs.ts
│       │   ├── entraineurs.ts
│       │   ├── evenements.ts
│       │   ├── matchs.ts
│       │   ├── entrainements.ts
│       │   ├── statistiques.ts
│       │   └── actualites.ts
│       └── index.ts            # Point d'entrée Express
├── frontend/
│   └── src/
│       ├── api/                # Fonctions d'appel HTTP (axios)
│       ├── components/
│       │   ├── layout/         # Sidebar, BottomNav, RequireAuth
│       │   └── ui/             # Button, Input, Card, Badge, Modal…
│       ├── contexts/           # AuthContext (JWT + user)
│       ├── pages/
│       │   ├── admin/          # Pages Gestionnaire (/admin/*)
│       │   └── dashboard/      # Pages Entraîneur + Joueur (/dashboard/*)
│       ├── types/index.ts      # Types TypeScript partagés
│       └── App.tsx             # Routage + protection par rôle
├── docker-compose.yml
└── README.md
```

---

## Envoi d'emails (invitations)

### Ce qui est en place

À chaque création d'invitation (page **Membres & invitations → Inviter**), le backend appelle automatiquement `sendInvitationEmail` qui envoie un email HTML avec le lien de création de compte. Le lien ressemble à :

```
http://<APP_URL>/register/<token>
```

En local **sans configuration SMTP**, l'envoi échoue silencieusement (l'invitation est quand même créée, et le lien peut être copié manuellement depuis l'onglet Invitations).

### Activer les emails en production

Ajoutez les variables SMTP dans `docker-compose.yml` (section `backend > environment`) ou dans `backend/.env` (développement local) :

```yaml
# docker-compose.yml — section backend > environment
SMTP_HOST: smtp.gmail.com
SMTP_PORT: "587"
SMTP_USER: votre@gmail.com
SMTP_PASS: "xxxx xxxx xxxx xxxx"   # App Password Gmail (pas le mot de passe du compte)
SMTP_FROM: "FootPilot <votre@gmail.com>"
APP_URL: http://localhost:3000      # ou votre domaine en production
```

#### Option A — Gmail (le plus simple)

1. Activez la [validation en deux étapes](https://myaccount.google.com/security) sur votre compte Google
2. Allez dans **Sécurité → Mots de passe des applications**
3. Créez un mot de passe pour "Application personnalisée"
4. Copiez le mot de passe généré (16 caractères) dans `SMTP_PASS`

#### Option B — Brevo (ex-Sendinblue) — 300 emails/jour gratuits

1. Créez un compte sur [brevo.com](https://www.brevo.com)
2. **SMTP & API → Clés SMTP** → notez le login et le mot de passe
3. `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`

#### Option C — Resend — 3 000 emails/mois gratuits

1. Créez un compte sur [resend.com](https://resend.com)
2. Vérifiez votre domaine (ou utilisez `onboarding@resend.dev` pour tester)
3. `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASS=<votre_API_key>`

#### Tester sans vrai compte (Ethereal — emails fictifs)

[Ethereal Email](https://ethereal.email) intercepte les emails sans les envoyer — utile pour développer :

```bash
# Créer un compte jetable sur https://ethereal.email/create
# puis renseigner les identifiants fournis :
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=xxx@ethereal.email
SMTP_PASS=xxxxx
```

Les emails envoyés apparaissent dans la boîte Ethereal (pas dans une vraie boîte mail).

---

## Commandes utiles

```bash
# Schéma Prisma → synchroniser la base (développement)
cd backend && npx prisma db push

# Régénérer les types TypeScript Prisma (après modification du schema)
cd backend && npx prisma generate

# Ouvrir Prisma Studio (interface graphique de la base)
cd backend && npm run db:studio

# Rebuild d'un seul service Docker
docker compose up --build backend

# Logs en temps réel
docker compose logs -f backend
```
