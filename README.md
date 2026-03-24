# CreaContenu - Authentication (Supabase)

Cette version contient uniquement le module d'authentification:

- Connexion
- Inscription
- Deconnexion
- Protection des pages privees

Le projet respecte une architecture FSD avec les couches:

- app
- pages
- widgets
- features
- entities
- shared

## Configuration Supabase

Creez un fichier `.env` a la racine du projet avec:

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

## Commandes

Installation:

```bash
npm install
```

Lancer en dev:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Tests (Vitest + React Testing Library):

```bash
npm run test
```
