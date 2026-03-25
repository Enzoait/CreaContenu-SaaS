# CreaContenu SaaS Frontend

Application frontend React + TypeScript pour un espace createur de contenu.
Le projet couvre aujourd'hui :

- Authentification Supabase (inscription, connexion, deconnexion, changement de mot de passe)
- Dashboard de pilotage (planning, suivi videos, todo, stats)
- Gestion de compte utilisateur (profil, securite, export des donnees)
- Page videos dediee avec operations CRUD
- Internationalisation FR/EN
- Theme clair/sombre

## Sommaire

- Vision produit
- Fonctionnalites en place
- Architecture
- Stack technique
- Installation et demarrage
- Variables d'environnement
- Scripts disponibles
- Modele de donnees Supabase
- Tests

## Vision produit

Le but de CreaContenu est de centraliser le suivi editorial d'un createur :

- planifier ses contenus,
- suivre l'avancement des videos,
- organiser ses taches,
- conserver ses informations de profil,
- visualiser des indicateurs de progression.

## Fonctionnalites en place

### 1) Authentification

- Inscription email/mot de passe via Supabase Auth
- Connexion et deconnexion
- Changement de mot de passe
- Hydratation automatique de la session au chargement de l'app (AuthBootstrap)
- Protection des routes privees

Routes concernees :

- /auth
- /dashboard
- /account
- /videos

### 2) Dashboard

Le dashboard principal inclut :

- Planning (agenda de publication)
- Suivi des videos (stages idea -> published)
- To-do en colonnes (todo, doing, done)
- Gestion des plateformes
- Recherche globale et filtres
- Visualisations de stats avec Recharts

Les donnees dashboard sont chargees via React Query et agregees depuis plusieurs tables Supabase.

### 3) Gestion du compte

- Consultation et edition des informations de profil
- Onglet securite (base en place)
- Export des donnees personnelles en TXT et PDF

### 4) Page Videos

- Liste des videos avec informations de plateforme, etape et deadline
- Ajout, edition, suppression
- Liens externes auto-generes selon la plateforme

### 5) Experience transverse

- UI animee (GSAP)
- Theme persistant (Zustand + persist)
- Locale persistante (FR/EN)

## Architecture

Le projet suit une architecture FSD (Feature-Sliced Design) :

- app : bootstrap global, routing, providers
- pages : ecrans applicatifs
- widgets : blocs d'interface composites
- features : logique metier orientee use-case
- entities : modeles et acces donnees
- shared : infra commune (api, stores, i18n, ui)

Exemples importants :

- app/routes : AppRouter, ProtectedRoute
- app/model : AuthBootstrap
- widgets/dashboard-overview : coeur du dashboard
- features/auth : formulaires + mutations d'auth
- entities/dashboard/api : CRUD Supabase planning/videos/todos/platforms
- entities/user/api : lecture et upsert du profil

## Stack technique

- React 18
- TypeScript
- Vite 5
- React Router
- TanStack React Query
- Zustand
- React Hook Form + Zod
- Supabase JS
- Recharts
- GSAP
- Vitest + Testing Library
- Sass (SCSS modules)

## Installation et demarrage

Prerequis :

- Node.js 18+
- npm
- Un projet Supabase configure

Etapes :

1. Installer les dependances

   npm install

2. Configurer les variables d'environnement

   creer un fichier .env a la racine :

   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle-anon

3. Lancer en developpement

   npm run dev

4. Ouvrir l'URL indiquee par Vite (en general http://localhost:5173)

## Variables d'environnement

Variables requises :

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Sans ces variables, l'app utilise des valeurs placeholder, ce qui ne permet pas de se connecter a un vrai backend.

## Scripts disponibles

- npm run dev : demarre le serveur de dev
- npm run build : verifie TypeScript puis build production
- npm run preview : previsualise le build
- npm run lint : lance ESLint
- npm run test : lance les tests Vitest (mode run)
- npm run test:watch : lance Vitest en watch

## Modele de donnees Supabase

Tables utilisees actuellement :

- user_data
  - profil utilisateur et informations de contact
- planning_items
  - elements de planning editorial
- video_items
  - suivi des videos par etape
- todo_items
  - taches kanban
- user_platforms
  - liste des plateformes personnalisees

Authentification :

- Supabase Auth (email/password)
- la session est synchronisee dans un store Zustand persistant

## Tests

Le projet contient des tests unitaires et composants, notamment sur :

- routing et protection des pages
- stores (auth, locale, filtres)
- schemas de validation
- widgets principaux (auth panel, app shell, dashboard overview)
- API d'agregation dashboard

Commande :

     npm run test

## Etat du projet

Le socle fonctionnel principal est en place : auth + dashboard + compte + videos.
Les prochaines evolutions peuvent porter sur le durcissement metier (roles, permissions), la couverture de tests supplementaires et l'optimisation des parcours UX.
