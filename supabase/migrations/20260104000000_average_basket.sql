-- =============================================================================
-- Panier moyen : permet de chiffrer en euros l'activité des clients fidèles.
-- =============================================================================

-- Stocké en centimes : pas d'arrondi flottant sur une valeur affichée au
-- commerçant. Nul tant qu'il ne l'a pas renseigné, auquel cas le chiffre
-- d'affaires n'est pas affiché plutôt que d'être estimé à tort.
alter table public.businesses
  add column if not exists average_basket_cents int
    check (average_basket_cents is null or average_basket_cents between 0 and 1000000);
