# Étude de cas CI/CD — FootPilot

---

## 1. Description du projet

**FootPilot** est une application web mobile-first de gestion de club de football. Elle permet à un gestionnaire de club de gérer ses membres (joueurs, entraîneurs), d'organiser les événements (matchs, entraînements), de suivre les statistiques et de communiquer via un fil d'actualités.

L'application est organisée en monorepo avec deux parties distinctes :

- **Frontend** : React 18 + Vite + TypeScript + Tailwind CSS — interface utilisateur responsive
- **Backend** : Node.js + Express + TypeScript + Prisma ORM — API REST
- **Base de données** : PostgreSQL 16

Trois rôles utilisateur existent : `GESTIONNAIRE` (admin du club), `ENTRAINEUR` et `JOUEUR`, chacun avec des accès différents à l'application.

---

## 2. Objectifs de la chaîne CI/CD

La mise en place d'une chaîne CI/CD sur ce projet répond à quatre objectifs principaux :

**Garantir la qualité du code** : chaque modification poussée sur la branche principale doit respecter les conventions de code définies (indentation, typage TypeScript, règles ESLint). Sans automatisation, ces vérifications seraient oubliées ou ignorées sous la pression du temps.

**Détecter les régressions tôt** : les tests unitaires sont exécutés automatiquement à chaque push. Si une modification casse une fonctionnalité existante, le pipeline le signale immédiatement avant que le code n'arrive en production.

**Sécuriser l'application en continu** : les dépendances npm peuvent contenir des vulnérabilités connues, et le code peut contenir des failles (injections, XSS, etc.). L'analyse de sécurité automatique permet de détecter ces problèmes sans action manuelle.

**Automatiser le déploiement** : sans CI/CD, déployer manuellement implique des étapes répétitives et sources d'erreurs (oubli de build, mauvaise variable d'environnement, déploiement d'un code non testé). Le pipeline garantit que seul un code validé arrive en production.

---

## 3. Choix des outils CI/CD

### GitHub Actions — Orchestration du pipeline

**GitHub Actions** a été choisi comme outil principal d'orchestration car le code est déjà hébergé sur GitHub. L'intégration est native : aucune infrastructure supplémentaire à configurer, la facturation est incluse dans le plan GitHub, et les workflows se déclenchent automatiquement sur les événements du dépôt (push, pull request).

Comparé à des alternatives comme **Jenkins** (nécessite un serveur dédié à maintenir) ou **GitLab CI** (nécessiterait de migrer vers GitLab), GitHub Actions offre le meilleur rapport simplicité/puissance pour un projet de cette taille.

### Vercel — Hébergement du frontend

**Vercel** est la plateforme de référence pour déployer des applications React/Vite. Elle détecte automatiquement le framework, optimise le build et distribue les fichiers statiques via un CDN mondial. Le déploiement se fait en quelques secondes et l'HTTPS est configuré automatiquement.

### Railway — Hébergement du backend et de la base de données

**Railway** permet de déployer une application Node.js à partir d'un `Dockerfile` et d'héberger une base de données PostgreSQL managée dans le même environnement. C'est la solution la plus simple pour déployer un backend avec base de données sans gérer de serveur.

### CodeQL — Analyse de sécurité statique (SAST)

**CodeQL** est l'outil d'analyse statique de sécurité de GitHub. Il analyse le code source pour détecter des vulnérabilités connues (injections SQL, XSS, exposition de données sensibles, absence de rate limiting, etc.). Il est intégré nativement dans GitHub Actions et publie ses résultats directement dans l'onglet **Security → Code scanning** du dépôt.

### npm audit — Audit des dépendances

**npm audit** vérifie les dépendances du projet contre la base de données publique de vulnérabilités npm (CVE). Il est exécuté sur le frontend et le backend, et bloque le pipeline si une vulnérabilité de niveau `high` ou `critical` est détectée.

---

## 4. Description des étapes du pipeline

Le pipeline est défini dans `.github/workflows/ci.yml` et se déclenche à chaque push ou pull request sur la branche `main`, ainsi que chaque samedi pour l'analyse de sécurité planifiée.

```
Push sur main
      │
      ▼
┌─────────────────────┐
│  Job 1 : Lint &     │
│  TypeScript         │
└──────────┬──────────┘
           │ succès
     ┌─────┴──────┐
     ▼            ▼
┌─────────┐  ┌──────────────┐
│  Job 2  │  │    Job 3     │
│  Tests  │  │  Sécurité    │
└────┬────┘  └──────┬───────┘
     │               │
     └───────┬───────┘
             │ les deux en succès
             ▼
     ┌───────────────┐
     │    Job 4      │
     │  Déploiement  │
     └───────────────┘
```

**Job 1 — Lint & TypeScript** (bloquant pour tout le reste)

Ce job vérifie que le code respecte les règles de style et de typage définies dans le projet. Il exécute ESLint sur le frontend et le backend pour détecter les erreurs de code (variables non utilisées, imports manquants, mauvaises pratiques React), puis le compilateur TypeScript en mode `--noEmit` pour valider le typage sans produire de fichiers. Si une seule erreur est détectée, le pipeline s'arrête immédiatement : il est inutile de tester ou déployer du code mal typé.

**Job 2 — Tests unitaires** (en parallèle du Job 3)

Ce job exécute les tests automatisés du projet. Le frontend utilise **Vitest** (compatible avec l'écosystème Vite), et le backend utilise **Jest** avec **Supertest** pour tester les routes API. Les tests backend mockent Prisma pour ne pas dépendre d'une vraie base de données en CI. Ce job nécessite que le Job 1 soit vert avant de démarrer.

**Job 3 — Analyse de sécurité** (en parallèle du Job 2)

Ce job comprend deux types d'analyses complémentaires :

- `npm audit` sur le frontend et le backend : vérifie que les dépendances npm ne contiennent pas de vulnérabilités connues de niveau élevé. Si c'est le cas, le pipeline échoue et un développeur doit mettre à jour la dépendance concernée.

- **CodeQL** : analyse statique du code TypeScript/JavaScript à la recherche de failles de sécurité (injections, absence de contrôle d'accès, rate limiting manquant, etc.). CodeQL analyse également les fichiers de workflow GitHub Actions eux-mêmes pour détecter des failles dans le pipeline CI/CD. Les résultats sont publiés dans l'interface GitHub Security.

**Job 4 — Déploiement** (uniquement sur push `main`, après Jobs 2 et 3)

Ce job ne s'exécute que si les Jobs 2 et 3 sont tous les deux verts, et uniquement sur des pushs directs sur `main` (pas sur les pull requests). Il déploie :

- Le **frontend** sur Vercel via la CLI Vercel (`vercel build` puis `vercel deploy --prebuilt`). La variable `VITE_API_URL` est injectée depuis les secrets GitHub pour pointer vers le backend Railway.
- Le **backend** sur Railway via un mécanisme de déploiement automatique : Railway surveille la branche `main` et redéploie automatiquement le service backend dès que la CI est verte.

---

## 5. Justification des choix techniques

**Pourquoi séparer Lint et Tests en deux jobs distincts ?**

Le lint est une vérification syntaxique rapide (moins d'une minute). Si le code ne compile pas, exécuter les tests n'a aucun sens. En plaçant le lint en premier et en faisant dépendre les autres jobs de son succès (`needs: lint-and-typecheck`), on économise du temps de CI sur les erreurs triviales.

**Pourquoi les Jobs 2 et 3 tournent-ils en parallèle ?**

Les tests et l'analyse de sécurité sont indépendants l'un de l'autre. Les exécuter en parallèle réduit le temps total du pipeline d'environ 50% par rapport à une exécution séquentielle.

**Pourquoi utiliser Vercel CLI dans la CI plutôt que le déploiement automatique Vercel ?**

Le frontend utilise une variable d'environnement (`VITE_API_URL`) qui est intégrée dans le bundle JavaScript au moment du build — c'est une particularité de Vite. Si Vercel faisait le build lui-même, cette variable devrait être configurée sur le dashboard Vercel. En faisant le build dans la CI GitHub Actions avec la variable stockée dans les secrets GitHub, on garde une source de vérité unique et on évite de dupliquer la configuration.

**Pourquoi avoir remplacé SMTP (Gmail) par Brevo pour les emails transactionnels ?**

En production, Railway (comme la plupart des hébergeurs cloud) bloque les connexions SMTP sortantes sur le port 587 pour prévenir le spam. Brevo communique via une API HTTP (pas SMTP), ce qui contourne cette restriction. De plus, Brevo permet de vérifier une adresse email expéditeur sans nécessiter la propriété d'un domaine complet, ce qui est adapté à un projet en cours de développement.

**Pourquoi le rate limiting sur les routes sensibles ?**

CodeQL a détecté l'absence de rate limiting sur la route `/api/statistiques`, qui effectue une vérification d'autorisation. Sans limitation, un attaquant peut envoyer des milliers de requêtes par seconde pour tenter de contourner l'authentification (attaque par force brute) ou simplement surcharger le serveur. La limite de 100 requêtes par 15 minutes par IP est suffisante pour un usage normal tout en bloquant les abus.

---

## 6. Cycle de vie détaillé : installations, builds et déploiements

Cette section explique précisément à quel moment les dépendances sont installées et les projets sont compilés tout au long du pipeline.

### Principe important : chaque job repart de zéro

Chaque job GitHub Actions tourne sur une **machine virtuelle fraîche**. Cela signifie que les `node_modules` installés dans le Job 1 ne sont pas disponibles dans le Job 2. Chaque job doit donc réinstaller les dépendances dont il a besoin. C'est une contrainte de l'architecture de GitHub Actions, compensée par un système de **cache** sur le `package-lock.json` pour éviter de retélécharger les packages à chaque fois.

### Job 1 — Lint & TypeScript

| Étape | Ce qui se passe |
|-------|----------------|
| `actions/checkout` | La machine virtuelle télécharge le code source du dépôt |
| `actions/setup-node` | Node.js 20 est installé, le cache npm est configuré |
| `npm ci` (frontend) | Les dépendances du frontend sont installées dans `frontend/node_modules/` |
| `npm ci` (backend) | Les dépendances du backend sont installées dans `backend/node_modules/` |
| `npm run lint` | ESLint analyse le code — **pas de compilation, pas de build** |
| `npm run typecheck` | Le compilateur TypeScript vérifie les types (`tsc --noEmit`) — **pas de build**, il vérifie sans produire de fichiers |

> **Pourquoi pas de build ici ?** Le lint et le typecheck n'ont pas besoin du code compilé. Compiler prendrait du temps inutilement à ce stade.

### Job 2 — Tests unitaires

| Étape | Ce qui se passe |
|-------|----------------|
| `actions/checkout` | Nouveau clone du code sur une nouvelle machine virtuelle |
| `npm ci` (frontend + backend) | Réinstallation des dépendances (depuis le cache si disponible) |
| `npm test` (frontend) | Vitest exécute les tests — il compile les fichiers TypeScript à la volée **en mémoire**, sans produire de `dist/` |
| `npm test` (backend) | Jest + ts-jest fait la même chose — compilation en mémoire uniquement |

> **Pourquoi pas de build ici non plus ?** Vitest et Jest compilent le TypeScript en mémoire pendant l'exécution des tests. Produire un vrai build serait une étape supplémentaire inutile pour juste exécuter des tests.

### Job 3 — Sécurité

| Étape | Ce qui se passe |
|-------|----------------|
| `actions/checkout` | Nouveau clone du code |
| `npm ci` (frontend + backend) | Réinstallation des dépendances — nécessaire pour que `npm audit` puisse lire l'arbre des dépendances installées |
| `npm run audit` | Analyse les `node_modules` installés contre la base de données CVE — **pas de build** |
| CodeQL init | CodeQL prépare son environnement d'analyse |
| CodeQL analyze | CodeQL lit le code source TypeScript directement — **pas besoin de build** pour les langages interprétés/transpilés |

> **Pourquoi installer les dépendances pour npm audit ?** `npm audit` a besoin que les dépendances soient installées pour construire l'arbre complet des dépendances transitives (les dépendances de dépendances).

### Job 4 — Déploiement

C'est le seul job où un vrai build est produit. Il ne s'exécute que sur push direct sur `main`.

| Étape | Ce qui se passe |
|-------|----------------|
| `actions/checkout` | Nouveau clone du code |
| `npm install -g vercel` | La CLI Vercel est installée globalement |
| `npm ci` (frontend) | Les dépendances du frontend sont installées — **indispensable** car le build va en avoir besoin |
| `vercel pull` | La CLI Vercel télécharge la configuration du projet depuis le dashboard Vercel (variables d'environnement de production, paramètres) |
| `vercel build --prod` | **Le vrai build du frontend** : Vite compile tout le TypeScript + React en fichiers JavaScript optimisés dans `.vercel/output/`. La variable `VITE_API_URL` (URL du backend Railway) est injectée et figée dans le bundle à ce moment précis |
| `vercel deploy --prebuilt` | Le dossier `.vercel/output/` déjà compilé est envoyé vers les serveurs Vercel — **pas de recompilation chez Vercel**, il déploie ce qu'on lui envoie |

> **Pourquoi le backend n'est pas buildé dans la CI ?** Railway gère lui-même le build du backend. Quand Railway détecte un nouveau commit sur `main` après que la CI est verte, il exécute le `Dockerfile` du backend qui : (1) compile le TypeScript en JavaScript (`npm run build` → `dist/`), (2) applique le schéma Prisma sur la base de données (`prisma db push`), (3) démarre le serveur Express. Tout cela se passe directement chez Railway, pas dans GitHub Actions.

### Résumé visuel

```
                    MACHINE VIRTUELLE FRAÎCHE à chaque job
                    ┌─────────────────────────────────────┐
Job 1 (Lint)        │ checkout → npm ci → lint → typecheck │  Pas de build
                    └─────────────────────────────────────┘
                    ┌─────────────────────────────────────┐
Job 2 (Tests)       │ checkout → npm ci → tests en mémoire│  Pas de build
                    └─────────────────────────────────────┘
                    ┌─────────────────────────────────────┐
Job 3 (Sécurité)    │ checkout → npm ci → audit → CodeQL  │  Pas de build
                    └─────────────────────────────────────┘
                    ┌─────────────────────────────────────┐
Job 4 (Deploy)      │ checkout → npm ci → vercel build ✓  │  Build frontend ici
                    │              → vercel deploy         │  Build backend chez Railway
                    └─────────────────────────────────────┘
```
