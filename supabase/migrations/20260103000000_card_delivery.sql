-- =============================================================================
-- Remise de la carte au client : email de bienvenue et renvoi du lien.
-- =============================================================================

-- Deux nouveaux types de message. Le lien de la carte est le seul moyen pour un
-- client de retrouver ses points : il doit arriver dans sa boîte dès
-- l'inscription, et pouvoir être renvoyé à la demande.
alter table public.messages
  drop constraint if exists messages_type_check;

alter table public.messages
  add constraint messages_type_check check (
    type in (
      'welcome',
      'card_recovery',
      'inactive_30_days',
      'inactive_60_days',
      'reward_available',
      'campaign'
    )
  );
