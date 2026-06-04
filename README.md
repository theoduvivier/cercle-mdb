# Cercle MDB — Séminaire Marbella

App de coordination des transferts aéroport pour le séminaire Marbella 16-18 juin.

## Setup

### 1. Supabase

Crée un projet sur supabase.com et exécute ce SQL dans l'éditeur :

```sql
create table participants (
  id bigserial primary key,
  nom text not null,
  arr_date text,
  arr_time text,
  arr_flight text,
  dep_date text,
  dep_time text,
  dep_flight text,
  comment text,
  created_at timestamptz default now()
);

alter table participants enable row level security;

create policy "lecture publique" on participants for select using (true);
create policy "insertion publique" on participants for insert with check (true);
create policy "mise a jour publique" on participants for update using (true);
```

### 2. Variables d'environnement

Copie `.env.example` en `.env.local` et remplis :
- `NEXT_PUBLIC_SUPABASE_URL` : l'URL de ton projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : la clé anon publique

### 3. Déploiement Vercel

1. Push ce dossier sur un repo GitHub
2. Importe le repo sur vercel.com
3. Ajoute les variables d'environnement dans Vercel (Settings > Environment Variables)
4. Deploy
