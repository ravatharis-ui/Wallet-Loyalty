-- =============================================================================
-- Personnalisation de la carte de fidélité : couleur et logo du commerce.
-- =============================================================================

-- Couleur principale de la carte client (en-tête et pastilles de progression).
alter table public.businesses
  add column if not exists card_color text not null default '#111827'
    check (card_color ~ '^#[0-9a-fA-F]{6}$');

-- Bucket public pour les logos. La lecture est publique (le logo s'affiche sur
-- la carte et la page d'inscription, toutes deux accessibles sans compte) ;
-- l'écriture passe exclusivement par le serveur avec la service role key.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;
