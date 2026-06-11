# MASTER_ARCHITECTURE.md — FootPilot

> **Objectif :** Ce document permet à tout développeur (ou IA) de recoder FootPilot de zéro dans n'importe quel langage/framework, sans lire le code source. Il décrit l'architecture, la logique métier et les règles de gestion de façon exhaustive et agnostique.

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Modèle de données — Entités & Relations](#2-modèle-de-données--entités--relations)
3. [Routes API, Sécurité et Restrictions](#3-routes-api-sécurité-et-restrictions)
4. [Logique métier & Règles de gestion (Backend)](#4-logique-métier--règles-de-gestion-backend)
5. [Logique frontend & Vues client](#5-logique-frontend--vues-client)
6. [Système de facturation & Abonnements](#6-système-de-facturation--abonnements)
7. [Variables d'environnement & Configuration](#7-variables-denvironnement--configuration)

---

## 1. VUE D'ENSEMBLE DU PROJET

**FootPilot** est une application de gestion de club de football, mobile-first, en langue française. Elle gère la totalité du cycle de vie d'un club : membres, équipes, catégories, joueurs, entraîneurs, matchs, entraînements, présences, buts, statistiques, chat, actualités et abonnements Stripe.

### Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| `GESTIONNAIRE` | Administrateur complet du club. Accès total à toutes les fonctions. |
| `ENTRAINEUR` | Entraîneur. Gère ses équipes, événements, présences. Pas de gestion des membres ou de la facturation. |
| `JOUEUR` | Joueur. Accès en lecture seule à son planning, ses statistiques et l'actualité. |

### Hiérarchie des droits (ordre décroissant)
```
GESTIONNAIRE (propriétaire du club) > GESTIONNAIRE > ENTRAINEUR > JOUEUR
```

### Abonnements (niveaux d'accès)

| Niveau | Accès |
|--------|-------|
| **Gratuit (free)** | 3 équipes max, 30 joueurs max, pas de stats ni de chat |
| **Fondateur (isFounder)** | Toutes les fonctionnalités, limites illimitées |
| **Abonnement actif (active)** | Toutes les fonctionnalités, limites illimitées |
| **Paiement unique (hasUnlockedLimits)** | Limites illimitées, mais pas les stats/chat |

---

## 2. MODÈLE DE DONNÉES — ENTITÉS & RELATIONS

### Enums (types énumérés)

| Enum | Valeurs | Usage |
|------|---------|-------|
| `Role` | GESTIONNAIRE, ENTRAINEUR, JOUEUR | Rôle d'un utilisateur dans le club |
| `Poste` | DEF, MIL, ATT, GB | Position d'un joueur sur le terrain |
| `StatutMatch` | AVENIR, TERMINE, ANNULE | État d'un match |
| `TypeEvenement` | MATCH, ENTRAINEMENT | Type d'événement planifié |
| `StatutPresence` | PRESENT, ABSENT_JUSTIFIE, ABSENT_NON_JUSTIFIE, RETARD, BLESSE | Présence d'un joueur à un événement |
| `ChatRoomType` | EQUIPE, STAFF, DIRECTION | Type de salle de chat |
| `ZoneTir` | TETE, PIED_GAUCHE, PIED_DROIT | Zone de tir d'un but |
| `Circonstance` | JEU_OUVERT, COUP_FRANC, PENALTY | Contexte du but |

---

### Entité : `User`

**Utilité :** Compte utilisateur. Toute personne accédant à l'application est un User. Créé à l'inscription, à l'invitation ou automatiquement comme "stub" pour un joueur ajouté manuellement.

**Attributs :**
| Champ | Type conceptuel | Contrainte | Description |
|-------|----------------|------------|-------------|
| id | UUID | PK | Identifiant unique |
| email | Texte | Unique | Email de connexion (lowercase) |
| password | Texte | Hashé (bcrypt) | Mot de passe |
| firstName | Texte | | Prénom |
| lastName | Texte | | Nom |
| role | Role | | Rôle dans le club |
| clubId | UUID | FK Club | Club d'appartenance |
| profilePic | Texte (URL) | Nullable | URL vers l'image de profil |
| phone | Texte | Nullable | Téléphone |
| birthDate | Date | Nullable | Date de naissance |
| isActive | Booléen | Défaut: true | Compte actif ou désactivé |
| emailVerified | Booléen | Défaut: false | Email confirmé |
| isManual | Booléen | Défaut: false | `true` pour les stubs générés manuellement |
| createdAt | DateTime | Auto | Date de création |

**Relations :**
- Appartient à 1 `Club` (via clubId)
- Peut être propriétaire d'1 `Club` (Club.idOwner)
- Peut avoir 1 profil `Joueur`
- Peut avoir 1 profil `Entraineur`
- Peut créer des `Invitation`, `JoinCode`, `Actualite`, `ChatMessage`
- A des `ChatReadReceipt`
- Peut avoir 1 `EmailVerificationToken`

**Cycle de vie :**
1. Créé via inscription (invitation, code de jointure, création de club)
2. Email vérifié → `emailVerified = true` → connexion autorisée
3. Peut être désactivé (`isActive = false`) par un supérieur
4. Peut être supprimé (hard delete) par un gestionnaire

---

### Entité : `Club`

**Utilité :** Entité racine. Tout le contenu de l'application appartient à un club. Créé lors de l'inscription du premier gestionnaire.

**Attributs :**
| Champ | Type conceptuel | Contrainte | Description |
|-------|----------------|------------|-------------|
| id | UUID | PK | |
| nom | Texte | | Nom du club |
| ville | Texte | | Ville |
| logoUrl | Texte | Nullable | URL logo |
| description | Texte | Nullable | Description libre |
| idOwner | UUID | FK User | Propriétaire du club |
| stripeCustomerId | Texte | Nullable, Unique | ID client Stripe |
| subscriptionStatus | Texte | Défaut: 'free' | 'free' \| 'active' \| 'past_due' \| 'canceled' |
| hasUnlockedLimits | Booléen | Défaut: false | Paiement unique pour lever les limites |
| isFounder | Booléen | Défaut: false | Accès fondateur (illimité, configuré en base) |

**Relations :**
- A 1 propriétaire `User` (idOwner)
- Contient N `User`, `Categorie`, `Equipe`, `Joueur`, `Entraineur`, `Invitation`, `JoinCode`, `Actualite`, `ChatRoom`

---

### Entité : `Categorie`

**Utilité :** Regroupe les équipes par tranche d'âge (ex: U-12, U-18, Senior). Permet d'organiser les entraînements par catégorie.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| nom | Texte | Nom de la catégorie (unique par club) |
| clubId | UUID | FK Club |

**Relations :**
- Appartient à 1 `Club`
- Contient N `Equipe`
- Peut être liée à N `Evenement` de type ENTRAINEMENT

**Cycle de vie :** Créée par GESTIONNAIRE. Supprimable uniquement si aucune équipe ne lui est rattachée.

---

### Entité : `Equipe`

**Utilité :** Une équipe de compétition ou d'entraînement. Regroupe des joueurs et des entraîneurs. Est la clé d'organisation des événements.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| clubId | UUID | FK Club |
| categorieId | UUID | FK Categorie (Nullable) |
| nomEquipe | Texte | Nom affiché |
| niveauChampionnat | Texte | Niveau de compétition (ex: "Régional 2") |

**Relations :**
- Appartient à 1 `Club`, 0-1 `Categorie`
- A N `JoueurEquipe` (joueurs actifs et anciens)
- A N `EntraineurEquipe` (coachs affectés)
- A N `Evenement`
- A 0-1 `ChatRoom` de type EQUIPE
- A N `Actualite`

---

### Entité : `Joueur`

**Utilité :** Profil sportif d'un joueur. Toujours lié à un `User`. Créé automatiquement lors d'une inscription joueur, ou manuellement par un gestionnaire/entraîneur (génère un User stub).

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK User (Unique) |
| clubId | UUID | FK Club |
| birthDate | Date | Nullable |
| poste | Poste | DEF/MIL/ATT/GB |
| numeroMaillot | Entier | Nullable |
| photoUrl | Texte | Nullable |

**Relations :**
- Lié à 1 `User` (unique)
- Appartient à 1 `Club`
- A N `JoueurEquipe` (historique des équipes)
- A N `Presence` (présences aux événements)
- A N `But` (comme buteur ou passeur)

---

### Entité : `Entraineur`

**Utilité :** Profil entraîneur. Toujours lié à un `User`. Les GESTIONNAIRE obtiennent aussi un profil Entraineur généré automatiquement quand ils sont affectés à une équipe.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK User (Unique) |
| clubId | UUID | FK Club |
| phone | Texte | Nullable |
| photoUrl | Texte | Nullable |

**Relations :**
- Lié à 1 `User`
- A N `EntraineurEquipe`

---

### Entité : `JoueurEquipe` (table de jonction)

**Utilité :** Historique complet des affiliations joueur↔équipe. Utilise `dateFin` comme suppression logique (soft delete).

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| joueurId | UUID | FK Joueur (PK composite) |
| equipeId | UUID | FK Equipe (PK composite) |
| dateDebut | DateTime | Date d'entrée dans l'équipe |
| dateFin | DateTime | Nullable — Date de sortie (NULL = membre actif) |

**Règle :** Un joueur est actif dans une équipe si `dateFin IS NULL`.

---

### Entité : `EntraineurEquipe` (table de jonction)

**Utilité :** Affectation d'un entraîneur à une équipe.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| entraineurId | UUID | FK Entraineur (PK composite) |
| equipeId | UUID | FK Equipe (PK composite) |

---

### Entité : `Evenement`

**Utilité :** Événement planifié (match ou entraînement). Entité polymorphe : les champs utilisés dépendent du `type`.

**Attributs communs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| type | TypeEvenement | MATCH ou ENTRAINEMENT |
| equipeId | UUID | FK Equipe |
| dateHeure | DateTime | Date et heure de début |
| duree | Entier | Durée en minutes (défaut: 120) |
| annule | Booléen | Événement annulé |
| lieu | Texte | Nullable |
| latitude | Décimal | Nullable |
| longitude | Décimal | Nullable |
| description | Texte | Nullable |
| snapshotPris | Booléen | Défaut: false — Présences figées |

**Attributs MATCH uniquement :**
| Champ | Type | Description |
|-------|------|-------------|
| adversaire | Texte | Nom de l'équipe adverse |
| scoreDom | Entier | Nullable — Buts à domicile |
| scoreExt | Entier | Nullable — Buts à l'extérieur |
| statutMatch | StatutMatch | AVENIR / TERMINE / ANNULE |
| placesCovoiturage | Entier | Nullable — Places dispo en covoiturage |

**Attributs ENTRAINEMENT uniquement :**
| Champ | Type | Description |
|-------|------|-------------|
| categorieId | UUID | FK Categorie — Nullable |

**Relations :**
- Appartient à 1 `Equipe`
- A N `Presence`
- A N `But`

---

### Entité : `Presence`

**Utilité :** Enregistre la présence (ou l'absence) d'un joueur à un événement. Créée automatiquement lors du premier accès à la feuille d'appel après la fin de l'événement.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| evenementId | UUID | FK Evenement (PK composite) |
| joueurId | UUID | FK Joueur (PK composite) |
| statut | StatutPresence | PRESENT par défaut |
| note | Entier | 1-5, Nullable — Note de performance |
| buts | Entier | 0 par défaut — Buts marqués (match) |
| commentaire | Texte | Nullable |

---

### Entité : `But`

**Utilité :** Détail d'un but marqué lors d'un match. Permet le suivi statistique précis des buts et passes décisives.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| evenementId | UUID | FK Evenement |
| buteurId | UUID | FK Joueur |
| passeurId | UUID | FK Joueur — Nullable |
| minute | Entier | Minute du but |
| zoneTir | ZoneTir | TETE / PIED_GAUCHE / PIED_DROIT |
| circonstance | Circonstance | JEU_OUVERT / COUP_FRANC / PENALTY |
| estCSC | Booléen | Défaut: false — Contre son camp |

---

### Entité : `Actualite`

**Utilité :** Publication d'une actualité club ou équipe. Peut être diffusée par email à tous les membres actifs.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| auteurId | UUID | FK User |
| clubId | UUID | FK Club |
| equipeId | UUID | FK Equipe — Nullable (club-wide si null) |
| titre | Texte | |
| contenu | Texte | |
| createdAt | DateTime | Auto |

---

### Entité : `JoinCode`

**Utilité :** Code d'invitation auto-service. Permet à quelqu'un de rejoindre le club sans email, via un lien à partager.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| code | Texte (6 chars) | Unique, alphanumérique |
| role | Role | ENTRAINEUR ou JOUEUR (pas GESTIONNAIRE) |
| clubId | UUID | FK Club |
| createdBy | UUID | FK User |
| expiresAt | DateTime | Expiration |
| usedCount | Entier | Nombre de fois utilisé |

---

### Entité : `Invitation`

**Utilité :** Invitation par email classique. Un gestionnaire/entraîneur envoie un lien unique à une personne précise.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| token | Texte | UUID unique |
| email | Texte | Email destinataire |
| firstName | Texte | |
| lastName | Texte | |
| role | Role | Rôle proposé |
| createdBy | UUID | FK User |
| clubId | UUID | FK Club |
| expiresAt | DateTime | 7 jours par défaut |
| usedAt | DateTime | Nullable — Date d'utilisation |

---

### Entité : `ChatRoom`

**Utilité :** Salle de discussion. Créée à la demande, jamais supprimée. Trois types : direction (gestionnaires), staff (gestionnaires+entraîneurs), équipe (membres de l'équipe).

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| type | ChatRoomType | EQUIPE / STAFF / DIRECTION |
| clubId | UUID | FK Club |
| equipeId | UUID | FK Equipe — Nullable, Unique (une room par équipe) |

**Relations :**
- A N `ChatMessage`
- A N `ChatReadReceipt`

---

### Entité : `ChatMessage`

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| roomId | UUID | FK ChatRoom |
| senderId | UUID | FK User |
| content | Texte | 1-2000 caractères |
| createdAt | DateTime | Auto |

---

### Entité : `ChatReadReceipt`

**Utilité :** Trace la dernière lecture d'une salle par un utilisateur. Permet de calculer les messages non lus.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| userId | UUID | FK User (PK composite) |
| roomId | UUID | FK ChatRoom (PK composite) |
| lastReadAt | DateTime | Dernière lecture |

---

### Entité : `EmailVerificationToken`

**Utilité :** Token de vérification d'email. Envoyé lors de la création de compte. Expire après 24 heures.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK User (Unique) |
| token | Texte | Token unique |
| expiresAt | DateTime | +24h après création |

---

### Entité : `Image`

**Utilité :** Stockage d'images (photos de profil, logos) en base de données sous forme de bytes WebP.

**Attributs :**
| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| data | Bytes | Contenu binaire de l'image |
| mimeType | Texte | Ex: 'image/webp' |
| size | Entier | Taille en octets |
| createdAt | DateTime | Auto |

---

### Diagramme relationnel (conceptuel)

```
Club ──< User ──< Joueur ──< JoueurEquipe >── Equipe
  │                │                              │
  │          Entraineur ──< EntraineurEquipe >────┤
  │                                               │
  ├──< Categorie ──< Equipe ──< Evenement ──< Presence
  │                                     │
  │                                     └──< But
  ├──< Invitation
  ├──< JoinCode
  ├──< Actualite
  └──< ChatRoom ──< ChatMessage
                └──< ChatReadReceipt
```

---

## 3. ROUTES API, SÉCURITÉ ET RESTRICTIONS

### Conventions de sécurité

- **`[PUBLIC]`** : Aucune authentification requise
- **`[AUTH]`** : JWT Bearer token requis
- **`[ROLE:X]`** : Rôle minimum requis (GESTIONNAIRE, ENTRAINEUR, etc.)
- **`[ABONNEMENT]`** : Abonnement actif ou statut fondateur requis
- **`[QUOTA:X]`** : Vérifie la limite d'objets (équipes ou joueurs) du plan gratuit
- **`[PROPRIO]`** : Réservé au propriétaire du club (idOwner)

---

### `/api/auth` — Authentification

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| POST | `/login` | PUBLIC | Connexion email/password |
| POST | `/create-club` | PUBLIC | Création club + compte gestionnaire |
| GET | `/invitation/:token` | PUBLIC | Valide un token d'invitation |
| POST | `/register` | PUBLIC | Inscription via token d'invitation |
| POST | `/verify-email` | PUBLIC | Vérification email |
| POST | `/me/profile-pic` | AUTH | Upload photo de profil |
| GET | `/me` | AUTH | Données de l'utilisateur connecté |

---

### `/api/gestionnaire` — Gestion des membres

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| POST | `/invitations` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Créer une invitation email |
| GET | `/invitations` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Lister les invitations |
| DELETE | `/invitations/:id` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Supprimer une invitation |
| GET | `/users` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Lister les membres du club |
| PATCH | `/users/:id/role` | AUTH + GESTIONNAIRE | Promouvoir ENTRAINEUR→GESTIONNAIRE |
| PATCH | `/users/:id/active` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Activer/désactiver un compte |
| DELETE | `/users/:id` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Supprimer un membre |

**Matrice des droits sur les utilisateurs :**
```
ENTRAINEUR peut agir sur : JOUEUR uniquement
GESTIONNAIRE (non-propriétaire) peut agir sur : JOUEUR + ENTRAINEUR
GESTIONNAIRE (propriétaire) peut agir sur : tous les membres
Personne ne peut agir sur soi-même (suppression/désactivation)
```

---

### `/api/clubs` — Gestion du club

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/:id` | AUTH | Infos du club + compteurs |
| PUT | `/:id` | AUTH + GESTIONNAIRE | Modifier les infos du club |
| POST | `/:id/logo` | AUTH + GESTIONNAIRE | Upload logo du club |
| GET | `/:id/membres` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Membres actifs |

---

### `/api/categories` — Catégories d'équipes

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/` | AUTH | Lister les catégories |
| POST | `/` | AUTH + GESTIONNAIRE | Créer une catégorie |
| PUT | `/:id` | AUTH + GESTIONNAIRE | Modifier |
| DELETE | `/:id` | AUTH + GESTIONNAIRE | Supprimer (interdit si équipes liées) |

---

### `/api/equipes` — Équipes

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/` | AUTH | Lister les équipes du club |
| GET | `/:id` | AUTH | Détail d'une équipe |
| POST | `/` | AUTH + GESTIONNAIRE ou ENTRAINEUR + QUOTA:equipes | Créer une équipe |
| PUT | `/:id` | AUTH + coach de l'équipe (ou GESTIONNAIRE) | Modifier |
| DELETE | `/:id` | AUTH + ENTRAINEUR coach de l'équipe | Supprimer |
| POST | `/:id/joueurs` | AUTH + coach de l'équipe | Ajouter un joueur |
| DELETE | `/:id/joueurs/:joueurId` | AUTH + coach de l'équipe | Retirer un joueur (soft delete) |
| POST | `/:id/entraineurs` | AUTH + règles complexes (voir §4) | Affecter un entraîneur |
| DELETE | `/:id/entraineurs/:entraineurId` | AUTH + coach de l'équipe | Retirer un entraîneur |

---

### `/api/joueurs` — Joueurs

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Lister les joueurs du club |
| GET | `/:id` | AUTH | Détail d'un joueur |
| POST | `/` | AUTH + GESTIONNAIRE ou ENTRAINEUR + QUOTA:joueurs | Créer un joueur manuel |
| PUT | `/:id` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Modifier |
| DELETE | `/:id` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Supprimer |

---

### `/api/entraineurs` — Entraîneurs

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Lister les entraîneurs |
| GET | `/:id` | AUTH | Détail d'un entraîneur |
| PUT | `/:id` | AUTH (propriétaire du profil ou GESTIONNAIRE) | Modifier |

---

### `/api/evenements` — Événements (matchs & entraînements)

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/` | AUTH | Lister les événements (filtrés selon le rôle) |
| GET | `/:id` | AUTH | Détail d'un événement |
| POST | `/` | AUTH + GESTIONNAIRE ou ENTRAINEUR (coach de l'équipe) | Créer un événement |
| PUT | `/:id` | AUTH + coach de l'équipe | Modifier (interdit si passé) |
| DELETE | `/:id` | AUTH + coach de l'équipe | Supprimer (interdit si passé) |
| GET | `/:id/appel` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Feuille d'appel (3 états) |
| POST | `/:id/appel` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Saisir les présences |
| PUT | `/:id/score` | AUTH + coach | Saisir le score (MATCH uniquement) |
| GET | `/:id/buts` | AUTH | Lister les buts |
| POST | `/:id/buts` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Enregistrer un but |
| DELETE | `/:id/buts/:butId` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Supprimer un but |

---

### `/api/statistiques` — Statistiques

> **Toutes les routes requièrent `[AUTH]` + `[ABONNEMENT]`, sauf `/clubs/:id`**

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/joueurs/moi` | AUTH + ABONNEMENT | Stats du joueur connecté |
| GET | `/joueurs/:id` | AUTH + ABONNEMENT | Stats d'un joueur |
| GET | `/equipes/:id` | AUTH + ABONNEMENT | Stats d'une équipe |
| GET | `/clubs/:id` | AUTH (gratuit) | Vue d'ensemble du club |

---

### `/api/actualites` — Actualités

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/` | AUTH | Lister (paginé, 20/page) |
| POST | `/` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Créer + diffusion email async |
| DELETE | `/:id` | AUTH + GESTIONNAIRE | Supprimer |

---

### `/api/images` — Images

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/:id` | PUBLIC | Servir l'image (cache 1 an) |

---

### `/api/join-codes` — Codes de jointure

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| POST | `/` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Créer un code |
| GET | `/` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Lister les codes |
| DELETE | `/:id` | AUTH + GESTIONNAIRE ou ENTRAINEUR | Supprimer un code |
| GET | `/validate/:code` | PUBLIC | Valider un code |
| POST | `/use` | PUBLIC + Rate limiting | Rejoindre via un code |

**Rate limiting `/use` :**
- Par IP : 5 tentatives/heure
- Par email : 3 tentatives/15 minutes

---

### `/api/chat` — Chat

> **Toutes les routes requièrent `[AUTH]` + `[ABONNEMENT]`**

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| GET | `/rooms` | AUTH + ABONNEMENT | Lister les salles accessibles |
| GET | `/rooms/:id/messages` | AUTH + ABONNEMENT | Messages (pagination curseur) |
| POST | `/rooms/:id/messages` | AUTH + ABONNEMENT | Envoyer un message |
| POST | `/rooms/:id/read` | AUTH + ABONNEMENT | Marquer comme lu |

**Matrice d'accès aux salles :**
```
DIRECTION (type) : GESTIONNAIRE uniquement
STAFF (type)     : GESTIONNAIRE + ENTRAINEUR
EQUIPE (type)    : membres actifs de l'équipe (tous rôles)
```

---

### `/api/billing` — Facturation

> **Toutes les routes requièrent `[AUTH]` + `[GESTIONNAIRE]`**

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/status` | Statut abonnement + compteurs |
| POST | `/checkout/subscription` | Créer session paiement mensuel (Stripe) |
| POST | `/checkout/payment` | Créer session paiement unique (Stripe) |
| POST | `/portal` | Accéder au portail de gestion Stripe |

---

### `/api/webhooks` — Webhooks Stripe

| Méthode | Route | Protection | Description |
|---------|-------|------------|-------------|
| POST | `/stripe` | Signature Stripe (raw body) | Synchronisation statuts |

---

## 4. LOGIQUE MÉTIER & RÈGLES DE GESTION (BACKEND)

### 4.1 Authentification & Inscription

#### Connexion (`POST /api/auth/login`)
```
ENTRÉE : email, password
PROCESSUS :
  1. Normaliser email en minuscules
  2. Chercher l'utilisateur par email
  3. SI non trouvé → 401 "Identifiants invalides"
  4. Vérifier bcrypt(password, user.password)
  5. SI faux → 401 "Identifiants invalides"
  6. SI emailVerified = false → 401 "Email non vérifié"
  7. SI isActive = false → 401 "Compte désactivé"
  8. Générer JWT (payload: userId, role, clubId), expiry 7 jours
SORTIE : { token, user (avec isOwner booléen) }
```

#### Création de club (`POST /api/auth/create-club`)
```
ENTRÉE : clubNom, clubVille, firstName, lastName, email, password
PROCESSUS (transaction atomique) :
  1. Vérifier que l'email n'existe pas déjà
  2. Hasher le password
  3. Créer le Club
  4. Créer le User (role=GESTIONNAIRE, clubId=club.id)
  5. Lier Club.idOwner = user.id (UPDATE)
  6. Créer EmailVerificationToken (expiry +24h)
  7. Envoyer email de vérification
SORTIE : 201 { message: "Vérifiez votre email" }
```

#### Inscription via token d'invitation (`POST /api/auth/register`)
```
ENTRÉE : token, email (optionnel, override), firstName, lastName, password, birthDate
PROCESSUS :
  1. Chercher l'invitation par token
  2. SI non trouvée → 404
  3. SI usedAt non null → 400 "Déjà utilisée"
  4. SI expiresAt < maintenant → 400 "Expirée"
  5. Créer User (role=invitation.role, email override possible)
  6. SI role=JOUEUR → créer Joueur (poste=MIL par défaut)
  7. SI role=ENTRAINEUR → créer Entraineur
  8. Marquer invitation.usedAt = maintenant
  9. Générer JWT
SORTIE : 201 { token, user }
```

#### Inscription via code (`POST /api/join-codes/use`)
```
ENTRÉE : code, firstName, lastName, email, password, confirmPassword, birthDate
PROCESSUS :
  1. Vérifier rate limits (IP + email)
  2. Chercher le code (insensible à la casse)
  3. SI expiré → 410 "Code expiré"
  4. Vérifier password === confirmPassword
  5. SI user non vérifié existe avec cet email → supprimer le compte précédent
  6. Transaction atomique :
     a. Créer User (emailVerified=false)
     b. Créer Joueur ou Entraineur selon le rôle du code
     c. Incrémenter joinCode.usedCount
     d. Créer EmailVerificationToken
     e. Envoyer email de vérification
SORTIE : 201 { message: "Vérifiez votre email" }
NOTE : Pas de JWT immédiat — l'email doit être vérifié d'abord
```

#### Vérification email (`POST /api/auth/verify-email`)
```
ENTRÉE : token
PROCESSUS :
  1. Chercher EmailVerificationToken
  2. SI non trouvé → 404
  3. SI expiré → 400
  4. Mettre à jour user.emailVerified = true
  5. Supprimer le token
SORTIE : { message: "Email vérifié" }
```

---

### 4.2 Gestion des membres

#### Inviter un membre
```
RÈGLES :
- ENTRAINEUR ne peut pas inviter un GESTIONNAIRE
- Maximum 30 invitations actives simultanément
- Durée par défaut : 7 jours (configurable, max 30 jours)
- Envoi immédiat de l'email avec le lien d'inscription
```

#### Promouvoir un utilisateur
```
RÈGLES :
- Seul un GESTIONNAIRE peut promouvoir
- Promotion possible uniquement : ENTRAINEUR → GESTIONNAIRE
- Seul le propriétaire peut promouvoir d'autres gestionnaires
```

#### Activer/désactiver ou supprimer un utilisateur
```
HIÉRARCHIE (qui peut agir sur qui) :
  ENTRAINEUR → JOUEUR uniquement
  GESTIONNAIRE (non-propriétaire) → JOUEUR + ENTRAINEUR
  GESTIONNAIRE (propriétaire) → tout le monde
  
RESTRICTIONS :
  - Personne ne peut se désactiver soi-même
  - Personne ne peut se supprimer soi-même
  - Suppression = hard delete (User + profils Joueur/Entraineur)
```

---

### 4.3 Gestion des équipes

#### Créer une équipe
```
ENTRÉE : nomEquipe, niveauChampionnat, categorieId (optionnel)
PROCESSUS :
  1. Vérifier quota (plan gratuit : 3 équipes max)
  2. Créer Equipe
  3. Créer EntraineurEquipe pour le créateur (auto-affectation)
     → Si créateur est GESTIONNAIRE sans profil Entraineur, créer le profil d'abord
SORTIE : 201 { equipe avec coach initial }
```

#### Affecter un entraîneur à une équipe
```
RÈGLES COMPLEXES :
  Si acteur = GESTIONNAIRE :
    - Auto-affectation : toujours autorisée
    - Affectation d'un autre : seulement si le GESTIONNAIRE est déjà coach de l'équipe
    
  Si acteur = ENTRAINEUR :
    - Auto-affectation : seulement si l'équipe n'a PAS encore de coach
    - Affectation d'un autre : seulement si l'ENTRAINEUR est déjà coach de l'équipe
```

#### Retirer un joueur d'une équipe
```
PROCESSUS : Soft delete → JoueurEquipe.dateFin = maintenant
(L'historique est préservé pour les statistiques et présences passées)
```

---

### 4.4 Gestion des joueurs manuels

```
Création d'un joueur sans compte réel :
  1. Générer un email factice : stub-{randomHex16}@footpilot.internal
  2. Créer User (isManual=true, isActive=false, emailVerified=false)
  3. Créer Joueur lié
  
Ce joueur ne peut PAS se connecter.
Il apparaît dans les listes et feuilles d'appel.
Sa suppression supprime aussi le User stub.
```

---

### 4.5 Système de présences (feuille d'appel — 3 états)

C'est la logique la plus complexe de l'application.

```
GET /api/evenements/:id/appel → selon l'état de l'événement :

ÉTAT 1 — Snapshot déjà pris (snapshotPris = true) :
  → Retourner directement les enregistrements Presence existants
  → Aucune modification du snapshot possible (liste figée)

ÉTAT 2 — Événement terminé, première consultation :
  (Condition : dateHeure + duree < maintenant ET snapshotPris = false)
  PROCESSUS :
    1. Calculer l'heure de fin de l'événement (dateHeure + duree minutes)
    2. Récupérer la liste des joueurs actifs dans l'équipe à l'heure de fin
       (JoueurEquipe où dateDebut <= heureFin ET (dateFin IS NULL OU dateFin >= heureFin))
    3. Supprimer les présences "fantômes" (joueurs qui n'étaient plus dans l'équipe à la fin)
    4. Pour chaque joueur de la liste finale :
       - SI Presence existe déjà → la conserver
       - SI non → créer Presence (statut=PRESENT, note=3)
    5. Mettre snapshotPris = true (atomique)
  → Retourner la liste figée

ÉTAT 3 — Événement futur ou en cours :
  (snapshotPris = false ET événement pas encore terminé)
  PROCESSUS :
    1. Récupérer la liste des joueurs actuellement actifs dans l'équipe
    2. LEFT JOIN avec les présences existantes
    3. Pour les joueurs sans présence : valeurs par défaut (PRESENT, note=3)
  → Retourner liste en temps réel (pas figée)
```

```
POST /api/evenements/:id/appel — Saisir les présences :
ENTRÉE : tableau [{ joueurId, statut, note, buts, commentaire }]
PROCESSUS :
  SI snapshotPris = true :
    → Vérifier que chaque joueurId est dans le snapshot existant
    → Sinon rejeter (403 ou ignoré selon implémentation)
  POUR CHAQUE joueur dans le payload :
    → UPSERT Presence (créer ou mettre à jour)
```

---

### 4.6 Statistiques (gating abonnement)

```
Stats joueur (individuel) :
  - Entraînements : total, présents, absents justifiés, absents non justifiés, retards, blessés
  - Matchs : mêmes compteurs
  - Note moyenne : moyenne des notes non-null et >= 1
  - Buts : somme de Presence.buts (pas la table But)
  - Passes décisives : count de But où passeurId = joueur.id
  - Taux de victoire : (matchs terminés gagnés / total matchs terminés) * 100

Stats équipe :
  - Victoires, défaites, nuls
  - Buts pour, buts contre
  - Taux de victoire
  - (Uniquement matchs avec statutMatch=TERMINE et scores renseignés)

Stats club (gratuit) :
  - Compteurs : catégories, équipes, joueurs, membres, entraîneurs, matchs, entraînements
```

---

### 4.7 Chat (salles auto-créées)

```
GET /api/chat/rooms — Logique d'auto-création :
  POUR GESTIONNAIRE :
    - Auto-créer salle DIRECTION si inexistante (club-wide)
    - Auto-créer salle STAFF si inexistante
    - Accès à toutes les salles EQUIPE
  POUR ENTRAINEUR :
    - Auto-créer salle STAFF si inexistante
    - Accès aux salles EQUIPE des équipes dont il est coach
  POUR JOUEUR :
    - Accès aux salles EQUIPE des équipes dont il est membre actif

COMPTAGE DES NON-LUS :
  unreadCount = count(messages.createdAt > receipt.lastReadAt)
  SI pas de receipt → tous les messages sont non lus
```

---

### 4.8 Webhooks Stripe

```
POST /api/webhooks/stripe
NOTE : Ce endpoint doit recevoir le BODY RAW (avant JSON.parse)
       pour valider la signature Stripe

Événements traités :
  checkout.session.completed :
    SI mode = 'subscription' :
      → Trouver club par stripeCustomerId
      → subscriptionStatus = 'active'
    SI mode = 'payment' :
      → hasUnlockedLimits = true

  customer.subscription.updated :
    → Synchroniser subscriptionStatus selon Stripe :
      'active' → 'active'
      'past_due' → 'past_due'
      autre → 'canceled'

  customer.subscription.deleted :
    → subscriptionStatus = 'canceled'
```

---

### 4.9 Traitement des images

```
Pipeline upload :
  1. Multer : accepte JPEG, PNG, WebP, GIF (max 5 Mo)
  2. Sharp : redimensionner à max 800×800 (ratio préservé)
  3. Convertir en WebP qualité 82
  4. Stocker dans table Image (data bytes, mimeType, size)
  5. Retourner URL : /api/images/{id}

Serveur d'images (/api/images/:id) :
  - Public (pas d'auth)
  - Header : Content-Type selon mimeType
  - Header : Cache-Control: public, max-age=31536000, immutable
```

---

### 4.10 Envoi d'emails

```
Emails envoyés :
  1. Invitation classique :
     - Template HTML avec lien /register/:token
     - Expiry 7 jours

  2. Vérification email :
     - Template HTML avec lien /verify-email/:token
     - Expiry 24 heures

  3. Diffusion actualité :
     - Envoyé à TOUS les membres actifs du club
     - Envoi asynchrone (non-bloquant pour la réponse API)
     - Template HTML avec titre + contenu

Configuration email :
  - Dev : Ethereal (SMTP de test, emails captés)
  - Prod : SMTP configuré via variables d'environnement
```

---

## 5. LOGIQUE FRONTEND & VUES CLIENT

### 5.1 Structure des routes

#### Routes publiques
```
/                → SplashPage (page d'accueil marketing)
/login           → LoginPage
/register/:token → RegisterPage (inscription via invitation)
/create-club     → CreateClubPage
/join[/:code]    → JoinPage (inscription via code)
/verify-email/:token → VerifyEmailPage
```

#### Routes GESTIONNAIRE + ENTRAINEUR (`/admin/*`)
```
/admin                  → Dashboard admin
/admin/membres          → Gestion des membres (3 onglets)
/admin/equipes          → Liste des équipes
/admin/equipes/:id      → Détail équipe + gestion
/admin/joueurs          → Liste des joueurs
/admin/planning         → Planning général (calendrier)
/admin/matchs           → Gestion des matchs
/admin/entrainements    → Gestion des entraînements
/admin/actualites       → Gestion des actualités
/admin/club             → Paramètres club (GESTIONNAIRE uniquement)
```

#### Routes tous rôles (`/dashboard/*`)
```
/dashboard              → Tableau de bord personnel
/dashboard/planning     → Mon planning
/dashboard/matchs       → Mes matchs
/dashboard/entrainements → Mes entraînements
/dashboard/actualites   → Actualités
/dashboard/equipes      → Mes équipes
/dashboard/joueurs      → Joueurs de mes équipes (ENTRAINEUR/GESTIONNAIRE)
/dashboard/stats        → Mes statistiques (JOUEUR uniquement)
```

#### Route commune
```
/profile → Page de profil utilisateur
```

---

### 5.2 Garde d'accès (RequireAuth)

```
LOGIQUE RequireAuth :
  1. Attendre isLoading = false (bootstrap de l'auth)
  2. SI pas de user → redirect /login
  3. SI roles[] défini ET user.role pas dans roles[] → redirect /dashboard
  4. Sinon → render children

Login post-auth :
  → SI role = GESTIONNAIRE ou ENTRAINEUR → redirect /admin
  → SI role = JOUEUR → redirect /dashboard
```

---

### 5.3 Gestion de l'état global (Contextes)

#### AuthContext
```
État : { user, token, isLoading }
Persistence : localStorage ('fp_token', 'fp_user')
Bootstrap : appel getMe() au montage → met à jour l'état user
  
Methods :
  login(token, user) → stocke dans localStorage + state
  logout()           → vide localStorage + state + redirect /login
  updateUser(patch)  → merge partiel + mise à jour localStorage
```

#### ChatContext
```
État : { isOpen, initialRoomId, totalUnread }
Polling : refreshUnread() toutes les 30 secondes
Methods :
  openChat(roomId?) → ouvre le panneau chat
  closeChat()       → ferme + refresh compteur de non-lus
```

#### BillingContext
```
État : status d'abonnement du club
Utilisé pour : afficher bandeaux d'upgrade, bloquer accès aux features premium
```

#### ThemeContext
```
Bascule light/dark mode
Persistence : localStorage
```

#### I18nContext
```
Langue actuelle (fr par défaut)
Fournit t() function pour les traductions
```

---

### 5.4 Client API (Axios)

```
Configuration :
  baseURL: '/api' (proxy Vite vers localhost:3001 en dev)
  
Intercepteur requête :
  → Ajoute header : Authorization: Bearer {token depuis localStorage}
  
Intercepteur réponse :
  → SI status 401 :
     1. Supprimer 'fp_token' et 'fp_user' de localStorage
     2. Redirect vers /login
```

---

### 5.5 Affichage conditionnel selon le rôle

```
Navigation Sidebar :
  GESTIONNAIRE : 9 liens admin + lien Paramètres Club
  ENTRAINEUR   : 9 liens admin (sans Paramètres Club)
  JOUEUR       : 6 liens dashboard uniquement

Page Membres (/admin/membres) :
  Onglet Membres :
    → Bouton "Promouvoir" visible uniquement si :
       acteur = GESTIONNAIRE (propriétaire) ET cible = ENTRAINEUR
    → Bouton "Désactiver" : selon hiérarchie des droits
    
  Onglet Invitations :
    → Champ rôle : ENTRAINEUR peut inviter JOUEUR uniquement
    
  Onglet Codes :
    → Tous GESTIONNAIRE et ENTRAINEUR
```

---

### 5.6 Gestion des abonnements côté client

```
Si l'API retourne 402 Payment Required :
  → Afficher modal/banner "Fonctionnalité Premium"
  → Proposer link vers /admin/club (page facturation)

Page /admin/club :
  → Affiche statut actuel (free / active / past_due / canceled)
  → Bouton "S'abonner" → appel /api/billing/checkout/subscription → redirect Stripe
  → Bouton "Débloquer les limites" → appel /api/billing/checkout/payment → redirect Stripe
  → Bouton "Gérer mon abonnement" → appel /api/billing/portal → redirect Stripe Portal
```

---

### 5.7 Pages principales — logique détaillée

#### Page de planning (`/admin/planning` et `/dashboard/planning`)
```
GESTIONNAIRE/ENTRAINEUR : Tous les événements du club
  - Filtres : par équipe, par type (MATCH/ENTRAINEMENT), par période
  
JOUEUR : Uniquement les événements :
  - À venir dans les équipes actuelles
  - Passés avec une Presence enregistrée à son nom
```

#### Feuille d'appel (composant dans les pages matchs/entraînements)
```
Affichage selon état snapshot :
  État 1 (figé) : liste readonly avec indicateurs de présence
  État 2/3 (éditable) : checkboxes/selects pour chaque joueur
    - Champs : statut de présence, note (1-5), buts (si match), commentaire
  
Soumission → POST /api/evenements/:id/appel
```

#### Statistiques joueur (`/dashboard/stats`)
```
JOUEUR uniquement
Données : getMyStats() → si 402 → afficher écran upgrade
Affiche :
  - Taux de présence (graphique)
  - Buts et passes décisives
  - Note moyenne
  - Comparaison entraînements vs matchs
```

---

### 5.8 Internationalisation

```
Système i18n avec 7 langues :
  fr (référence), en, de, es, it, zh, ar

Règle de gestion :
  - Seul fr.json est maintenu
  - Les 6 autres fichiers sont figés
  
Clés disponibles (catégories) :
  auth, join, splash, nav, roles, postes, common, members, messages, etc.
```

---

## 6. SYSTÈME DE FACTURATION & ABONNEMENTS

### Flux d'abonnement mensuel

```
1. Gestionnaire clique "S'abonner" sur /admin/club
2. POST /api/billing/checkout/subscription
   → Créer ou récupérer Stripe Customer (email + nom du club)
   → Sauvegarder stripeCustomerId dans Club
   → Créer Stripe Checkout Session (mode=subscription)
3. Redirect vers URL Stripe → paiement
4. Stripe webhook : checkout.session.completed (mode=subscription)
   → Mettre à jour club.subscriptionStatus = 'active'
5. Utilisateur redirigé vers /admin/club?success=true
```

### Flux paiement unique (déblocage des limites)

```
1. Gestionnaire clique "Débloquer les limites"
2. POST /api/billing/checkout/payment
   → Même logique Stripe Customer
   → Stripe Checkout Session (mode=payment)
3. Webhook : checkout.session.completed (mode=payment)
   → club.hasUnlockedLimits = true
NOTE : hasUnlockedLimits ne donne PAS accès aux stats/chat
       Il lève uniquement les quotas (équipes + joueurs)
```

### Gestion du portail client

```
POST /api/billing/portal → Stripe Billing Portal
Permet : voir les factures, modifier le moyen de paiement, résilier
```

### Synchronisation des statuts via webhooks

```
Statuts Stripe → statuts FootPilot :
  'active'   → 'active'   (accès complet)
  'past_due' → 'past_due' (accès maintenu temporairement, avertissement)
  'canceled' → 'canceled' (accès bloqué)
  'trialing' → 'active'   (période d'essai)
```

### Middleware de vérification

```
requireSubscription() :
  SI club.isFounder = true → autoriser
  SI club.subscriptionStatus = 'active' → autoriser
  SINON → 402 Payment Required

checkClubLimits('equipes') :
  SI club.isFounder = true → autoriser
  SI club.hasUnlockedLimits = true → autoriser
  SI count(equipes) >= 3 → 402 "Limite atteinte"

checkClubLimits('joueurs') :
  SI club.isFounder = true → autoriser
  SI club.hasUnlockedLimits = true → autoriser
  SI count(joueurs) >= 30 → 402 "Limite atteinte"
```

---

## 7. VARIABLES D'ENVIRONNEMENT & CONFIGURATION

### Backend (`backend/.env`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://user:pass@localhost:5432/footpilot` |
| `JWT_SECRET` | Clé secrète pour signer les JWT | Chaîne aléatoire longue |
| `PORT` | Port d'écoute du backend | `3001` |
| `CORS_ORIGIN` | Origine autorisée pour CORS | `http://localhost:3000` |
| `APP_URL` | URL du frontend (liens dans emails) | `http://localhost:3000` |
| `SMTP_HOST` | Serveur SMTP | `smtp.ethereal.email` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Utilisateur SMTP | |
| `SMTP_PASS` | Mot de passe SMTP | |
| `SMTP_FROM` | Adresse d'expéditeur | `noreply@footpilot.fr` |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret de validation webhooks Stripe | `whsec_...` |
| `STRIPE_PRICE_ID_SUBSCRIPTION` | ID du prix Stripe pour l'abonnement mensuel | `price_...` |
| `STRIPE_PRICE_ID_PAYMENT` | ID du prix Stripe pour le paiement unique | `price_...` |

### Frontend (`frontend/.env`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_API_URL` | URL du backend | `http://localhost:3001` |

---

## NOTES D'IMPLÉMENTATION CRITIQUES

1. **Webhooks Stripe** : Le middleware `express.raw()` doit être appliqué AVANT `express.json()` sur la route `/api/webhooks/stripe`. L'ordre de montage des routes dans l'application est crucial.

2. **Singleton Prisma** : En développement avec hot-reload, utiliser un singleton global pour le client Prisma afin d'éviter la saturation du pool de connexions.

3. **Snapshot de présences** : La logique de gel du snapshot (État 2) est critique pour l'intégrité des données historiques. Elle doit être atomique (transaction) pour éviter les doubles snapshots en cas de requêtes concurrentes.

4. **Emails asynchrones** : La diffusion d'actualités par email est intentionnellement non-bloquante (`sendActualiteEmail()` appelé sans `await`). Une erreur d'envoi ne doit pas faire échouer la création de l'actualité.

5. **Rate limiting** : Le rate limiting des codes de jointure est en mémoire. En production avec plusieurs instances, il faudrait utiliser Redis ou une base de données partagée.

6. **Images en base** : Les images sont stockées en bytes dans la base de données. Pour scaler, préférer S3 ou un CDN. Les URLs `/api/images/:id` devraient être remplacées par des URLs de CDN.

7. **Polling du chat** : Les compteurs de non-lus sont récupérés par polling toutes les 30 secondes. Pour une meilleure expérience temps réel, envisager WebSockets ou SSE (Server-Sent Events).

8. **Entraîneur auto-créé** : Quand `GET /api/entraineurs` est appelé, les profils `Entraineur` pour tous les GESTIONNAIRE du club sont créés automatiquement si inexistants (`createMany` avec `skipDuplicates: true`). Cette opération a des effets de bord.
