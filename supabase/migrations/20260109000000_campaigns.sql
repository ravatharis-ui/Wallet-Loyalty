-- =============================================================================
-- Campagnes : canal, image, objet, envoi programmé, audiences plus fines.
--
-- Jusqu'ici une campagne était un texte envoyé immédiatement par email à l'un
-- de trois groupes. Le commerçant ne pouvait ni préparer son message à
-- l'avance, ni y mettre une photo, ni toucher les clients qui ont accepté les
-- notifications sans donner leur email.
-- =============================================================================

alter table public.campaigns
  -- 'both' plutôt que deux campagnes : le commerçant écrit un message, pas deux.
  add column if not exists channel text not null default 'email'
    check (channel in ('email', 'push', 'both')),
  -- Objet de l'email. Vide, on retombe sur le nom de la campagne.
  add column if not exists subject text
    check (subject is null or length(trim(subject)) between 1 and 120),
  add column if not exists image_url text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sent'));

-- Les campagnes déjà parties gardent leur statut réel.
update public.campaigns set status = 'sent' where sent_at is not null and status <> 'sent';

create index if not exists campaigns_scheduled_idx
  on public.campaigns (scheduled_at)
  where status = 'scheduled';

-- Deux groupes de plus, tous deux réclamés en boutique : les nouveaux venus
-- qu'on veut faire revenir une deuxième fois, et les habitués qu'on veut
-- récompenser d'une attention.
alter table public.campaigns
  drop constraint if exists campaigns_audience_type_check;

alter table public.campaigns
  add constraint campaigns_audience_type_check check (
    audience_type in (
      'all',
      'inactive_30_days',
      'reward_available',
      'new_this_month',
      'best_customers'
    )
  );

-- Bucket public pour les photos de campagne. Lecture publique (l'image
-- s'affiche dans un email, chez un destinataire non authentifié) ; écriture
-- exclusivement côté serveur avec la service role key.
insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', true)
on conflict (id) do update set public = true;
