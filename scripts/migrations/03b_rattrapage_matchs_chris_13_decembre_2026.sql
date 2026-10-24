-- PROD-03B | Rattrapage des matchs déjà importés (sans doublons)
-- 1) Associe Chris Alune BA aux rencontres RollerSoccer U11/U15 importées,
--    en complément de Daniel, exclusivement si son contrat de saison est valide.
-- 2) Reporte les cinq rencontres du 12/12/2026 au 13/12/2026.
-- Ne modifie pas le registre assolutions_match_import, ni les clés stables.
-- MODE ESSAI : dernière instruction ROLLBACK; -- MODIFIER en COMMIT après bilan.
-- IMPORTANT : terminer toute précédente transaction avec ROLLBACK; auparavant.
BEGIN;
SET LOCAL TIME ZONE 'Europe/Paris';
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '120s';

CREATE TEMP TABLE _matchs_ujeunes AS
SELECT i.cle, s.seance_id, s.saison_id, s.date_seance::date AS date_avant,
       s.duree_seance, s.calendrier_id
FROM public.assolutions_match_import i
JOIN public.seance s ON s.seance_id=i.seance_id
WHERE i.cle LIKE 'MATCH2627_%_RS_U11_%'
   OR i.cle LIKE 'MATCH2627_%_RS_U15_%';

CREATE TEMP TABLE _matchs_decembre AS
SELECT i.cle, s.seance_id, s.date_seance::date AS date_avant
FROM public.assolutions_match_import i
JOIN public.seance s ON s.seance_id=i.seance_id
WHERE i.cle LIKE 'MATCH2627_20261212_%';

DO $check$
DECLARE
  v_chris integer;
  v_nb integer;
  v_contrat integer;
  v_match record;
BEGIN
  IF (SELECT count(*) FROM _matchs_ujeunes) <> 9 THEN
    RAISE EXCEPTION 'Rattrapage interrompu : % matchs U11/U15 trouvés, attendu 9.',
      (SELECT count(*) FROM _matchs_ujeunes);
  END IF;
  IF (SELECT count(*) FROM _matchs_decembre) <> 5 THEN
    RAISE EXCEPTION 'Rattrapage interrompu : % matchs du 12/12 trouvés, attendu 5.',
      (SELECT count(*) FROM _matchs_decembre);
  END IF;
  -- Recherche par identité dans personne, et non par ID préprod supposé.
  SELECT count(*), min(p.id) INTO v_nb, v_chris
  FROM public.personne p
  JOIN public.professeur prof ON prof.id=p.id
  WHERE lower(btrim(p.first_name)) = 'alune'
    AND lower(btrim(p.last_name)) = 'ba';
  IF v_nb <> 1 THEN
    RAISE EXCEPTION 'Alune BA : % professeurs correspondants (attendu 1). Vérifier personne/contrat_prof.', v_nb;
  END IF;
  FOR v_match IN SELECT * FROM _matchs_ujeunes LOOP
    SELECT count(*), min(cp.id) INTO v_nb, v_contrat
    FROM public.contrat_prof cp
    WHERE cp.professeur_id=v_chris AND cp.saison_id=v_match.saison_id
      AND cp.date_debut <= CASE WHEN v_match.date_avant=DATE '2026-12-12'
                                THEN DATE '2026-12-13' ELSE v_match.date_avant END
      AND (cp.date_fin IS NULL OR cp.date_fin >=
           CASE WHEN v_match.date_avant=DATE '2026-12-12'
                THEN DATE '2026-12-13' ELSE v_match.date_avant END);
    IF v_nb <> 1 THEN
      RAISE EXCEPTION 'Alune BA (personne %), match % : % contrats actifs (attendu 1).',
        v_chris, v_match.cle, v_nb;
    END IF;
  END LOOP;
END $check$;

-- Mise à jour seulement si la date est encore le 12 décembre.
UPDATE public.seance s
SET date_seance=DATE '2026-12-13'
FROM _matchs_decembre d
WHERE s.seance_id=d.seance_id AND s.date_seance::date=DATE '2026-12-12';

-- Ajouter Chris uniquement s'il n'est pas déjà associé au match.
INSERT INTO public.seance_professeur
  (seance_id,minutes,cout,info,created_at,updated_at,professeurcontract_id,statut)
SELECT s.seance_id, s.duree_seance, NULL, 'Encadrement match', now(), now(), cp.id, 'prévue'
FROM _matchs_ujeunes m
JOIN public.seance s ON s.seance_id=m.seance_id
JOIN public.personne p ON lower(btrim(p.first_name)) = 'alune'
 AND lower(btrim(p.last_name)) = 'ba'
JOIN public.professeur prof ON prof.id=p.id
JOIN public.contrat_prof cp ON cp.professeur_id=p.id
 AND cp.saison_id=s.saison_id AND cp.date_debut<=s.date_seance::date
 AND (cp.date_fin IS NULL OR cp.date_fin>=s.date_seance::date)
WHERE NOT EXISTS (
  SELECT 1 FROM public.seance_professeur sp
  WHERE sp.seance_id=s.seance_id AND sp.professeurcontract_id=cp.id
);

-- Bilan de recette AVANT la fin de transaction.
SELECT m.cle, s.seance_id, s.date_seance::date AS date_apres,
       (SELECT count(*) FROM public.seance_professeur sp
        JOIN public.contrat_prof cp ON cp.id=sp.professeurcontract_id
        JOIN public.personne p ON p.id=cp.professeur_id
        WHERE sp.seance_id=s.seance_id AND lower(p.first_name || ' ' || p.last_name) LIKE '%chris%'
          AND lower(p.first_name || ' ' || p.last_name) LIKE '%alune%') AS chris_lie
FROM _matchs_ujeunes m JOIN public.seance s ON s.seance_id=m.seance_id
ORDER BY m.cle;

SELECT d.cle, d.date_avant, s.date_seance::date AS date_apres
FROM _matchs_decembre d JOIN public.seance s ON s.seance_id=d.seance_id ORDER BY d.cle;

ROLLBACK;
