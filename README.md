# FootPilot

Gestion de club de football — mobile first, React + Node.js.

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v3 |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Base de données | PostgreSQL 16 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Container | Docker + Docker Compose |

---

## Compte admin par défaut

| Champ | Valeur |
|---|---|
| Email | `admin@footpilot.fr` |
| Mot de passe | `Admin123!` |

> Changez ce mot de passe dès la première connexion en production.

---

## Lancement rapide avec Docker (recommandé)

Tout (base de données + backend + frontend) se lance en une commande.

```bash
# Cloner et se placer dans le projet
cd foot-manger

# Copier les variables d'environnement (optionnel, Docker Compose a des valeurs par défaut)
cp backend/.env.example backend/.env

# Construire et démarrer tous les services
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Adminer (DB UI) | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

**Connexion Adminer :**
- Système : `PostgreSQL`
- Serveur : `db`
- Utilisateur : `footpilot`
- Mot de passe : `footpilot_secret`
- Base de données : `footpilot`

Pour arrêter :
```bash
docker compose down
```

Pour tout remettre à zéro (supprime la base de données) :
```bash
docker compose down -v
```

---

## Développement local (sans Docker)

### Prérequis

- Node.js >= 20 **installé dans WSL/Linux** (pas la version Windows — voir ci-dessous)
- PostgreSQL 16 en local **ou** Docker juste pour la base

> **WSL2 — important** : si `which node` retourne `/mnt/c/...`, vous utilisez le Node.js Windows.
> Il ne fonctionne pas avec les chemins WSL. Installez Node.js dans WSL avec nvm :
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
> source ~/.bashrc
> nvm install 20
> nvm use 20
> ```

### 1. Démarrer seulement la base de données

```bash
docker compose up db -d
```

### 2. Backend

```bash
cd backend

# Variables d'environnement
cp .env.example .env
# Éditer .env si nécessaire (DATABASE_URL, JWT_SECRET)

# Installer les dépendances
npm install

# Créer et migrer la base de données
npx prisma migrate dev --name init

# Injecter l'admin par défaut
npm run db:seed

# Démarrer en mode développement (hot-reload)
npm run dev
```

Le backend tourne sur **http://localhost:3001**.

### 3. Frontend

Dans un autre terminal :

```bash
cd frontend

# Variables d'environnement
cp .env.example .env

# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev
```

Le frontend tourne sur **http://localhost:3000**.

---

## Variables d'environnement

### Backend (`backend/.env`)

| Variable | Description | Valeur par défaut |
|---|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://footpilot:footpilot_secret@localhost:5432/footpilot` |
| `JWT_SECRET` | Clé secrète pour signer les JWT | ⚠️ À changer en prod |
| `PORT` | Port du serveur Express | `3001` |
| `NODE_ENV` | Environnement Node | `development` |

### Frontend (`frontend/.env`)

| Variable | Description | Valeur par défaut |
|---|---|---|
| `VITE_API_URL` | URL du backend (build Docker) | `http://localhost:3001` |

---

## Commandes utiles

### Base de données

> **Note Docker** : le container utilise `prisma db push` (pas de migration history) pour simplifier le démarrage.
> En local (`npm run dev`), utilisez `prisma migrate dev` pour générer des fichiers de migration versionnés.

```bash
# Créer une nouvelle migration après modification du schema Prisma (local dev)
cd backend && npx prisma migrate dev --name <nom>

# Ouvrir l'interface graphique Prisma Studio
npm run db:studio

# Relancer uniquement le seed (admin par défaut)
npm run db:seed
```

### Docker

```bash
# Voir les logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend

# Reconstruire un seul service
docker compose up --build backend

# Se connecter à PostgreSQL
docker compose exec db psql -U footpilot -d footpilot
```

### Frontend

```bash
cd frontend
npm run build    # Build de production
npm run preview  # Prévisualiser le build de production
```

---

## API — Endpoints disponibles

### Auth (`/api/auth`)

| Méthode | Route | Description | Auth requise |
|---|---|---|---|
| `POST` | `/api/auth/login` | Connexion email + mot de passe | Non |
| `GET` | `/api/auth/invitation/:token` | Valider un token d'invitation | Non |
| `POST` | `/api/auth/register` | Créer un compte via invitation | Non |
| `GET` | `/api/auth/me` | Profil utilisateur courant | Oui |

### Admin (`/api/admin`) — ADMIN ou GESTIONNAIRE

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/admin/users` | Liste tous les utilisateurs |
| `PATCH` | `/api/admin/users/:id/role` | Modifier le rôle d'un utilisateur (ADMIN seulement) |
| `DELETE` | `/api/admin/users/:id` | Supprimer un utilisateur (ADMIN seulement) |
| `GET` | `/api/admin/invitations` | Liste toutes les invitations |
| `POST` | `/api/admin/invitations` | Créer une invitation |
| `DELETE` | `/api/admin/invitations/:id` | Supprimer une invitation (ADMIN seulement) |

### Corps des requêtes

**POST `/api/auth/login`**
```json
{ "email": "admin@footpilot.fr", "password": "Admin123!" }
```

**POST `/api/admin/invitations`**
```json
{ "email": "joueur@exemple.com", "role": "JOUEUR", "expiresInDays": 7 }
```

**POST `/api/auth/register`**
```json
{
  "token": "le-token-d-invitation",
  "email": "joueur@exemple.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "password": "MonMotDePasse123",
  "birthDate": "1998-05-15"
}
```

---

## Rôles utilisateurs

| Rôle | Accès |
|---|---|
| `ADMIN` | Tout — gestion des utilisateurs, invitations, rôles |
| `GESTIONNAIRE` | Gestion (pas les rôles, pas supprimer) — peut inviter sauf ADMIN |
| `ENTRAINEUR` | Dashboard entraîneur — planning, feuilles d'appel |
| `JOUEUR` | Dashboard joueur — planning, stats personnelles |

---

## Flux d'invitation

1. L'admin se connecte sur `/login` avec `admin@footpilot.fr`
2. Il accède au dashboard admin `/admin`
3. Il clique sur **➕ Inviter** et choisit le rôle + email optionnel
4. Il copie le lien généré (ex: `http://localhost:3000/register/abc123`)
5. Il envoie le lien à la personne concernée
6. La personne ouvre le lien, remplit ses infos et crée son compte
7. Le lien est invalidé après utilisation

---

## Structure du projet

```
foot-manger/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Modèles de données
│   │   └── seed.ts            # Données initiales (admin)
│   ├── src/
│   │   ├── lib/prisma.ts      # Client Prisma singleton
│   │   ├── middleware/auth.ts  # JWT + vérification de rôle
│   │   ├── routes/
│   │   │   ├── auth.ts        # Login, register, invitation
│   │   │   └── admin.ts       # Gestion users + invitations
│   │   └── index.ts           # Entrée Express
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Appels HTTP (axios)
│   │   ├── components/
│   │   │   ├── layout/        # PhoneShell, BottomNav, RequireAuth
│   │   │   └── ui/            # Button, Input, Card, Badge
│   │   ├── contexts/          # AuthContext (JWT + user)
│   │   ├── pages/
│   │   │   ├── SplashPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── admin/
│   │   │       ├── DashboardPage.tsx
│   │   │       └── CreateInvitationModal.tsx
│   │   ├── types/index.ts
│   │   └── App.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```
