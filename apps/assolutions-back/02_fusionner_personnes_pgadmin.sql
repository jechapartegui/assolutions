/*
===============================================================================
FUSION LOGIQUE DE DEUX PERSONNES — VERSION PGADMIN ROBUSTE
===============================================================================

UTILISATION
-----------
1. Modifier uniquement les quatre variables au début du bloc DECLARE :
   - v_id_conserve
   - v_id_source
   - v_supprimer_source
   - v_mode_test

2. Laisser v_mode_test := true pour le premier lancement.

3. Cliquer n'importe où dans le bloc, puis utiliser « Execute Query ».
   Le fichier entier est un unique bloc DO : pgAdmin exécute donc tout ensemble.

4. Lire le résultat dans l'onglet « Messages ».

5. Après validation, mettre v_mode_test := false et relancer.
   Il n'y a plus de COMMIT ou ROLLBACK à modifier manuellement.

IMPORTANT
---------
- true  : test complet, puis annulation automatique ;
- false : application réelle de la fusion.
===============================================================================
*/

DO $fusion$
DECLARE
    /*
    ===========================================================================
    SEULS PARAMÈTRES À MODIFIER
    ===========================================================================
    */
    v_id_conserve integer := 123;          -- personne conservée
    v_id_source integer := 456;            -- personne absorbée
    v_supprimer_source boolean := false;   -- false = archive ; true = supprime
    v_mode_test boolean := true;           -- true = annule ; false = applique

    v_lignes bigint;
    v_restant bigint;
    v_nom_conserve text;
    v_nom_source text;
    v_types_personne text[] := ARRAY[
        'personne', 'person', 'adherent', 'adhérent', 'membre', 'member'
    ];
    r record;
BEGIN
    /*
    Le journal est temporaire et sert uniquement à produire des NOTICE dans
    l'onglet Messages de pgAdmin.
    */
    DROP TABLE IF EXISTS pg_temp.fusion_personne_audit;

    CREATE TEMP TABLE fusion_personne_audit (
        ordre bigserial,
        etape text NOT NULL,
        objet text NOT NULL,
        lignes_modifiees bigint NOT NULL DEFAULT 0,
        detail text
    ) ON COMMIT DROP;

    /*
    Sous-transaction :
    - en mode test, toutes les modifications sont annulées à la fin ;
    - en mode réel, elles sont conservées à la fin du bloc DO.
    */
    BEGIN
    IF v_id_conserve = v_id_source THEN
        RAISE EXCEPTION 'Les deux identifiants sont identiques : %', v_id_conserve;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.personne WHERE id = v_id_conserve) THEN
        RAISE EXCEPTION 'La personne conservée id=% n''existe pas.', v_id_conserve;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.personne WHERE id = v_id_source) THEN
        RAISE EXCEPTION 'La personne à fusionner id=% n''existe pas.', v_id_source;
    END IF;

    -- Verrouille les deux personnes pendant toute la transaction.
    PERFORM 1
    FROM public.personne
    WHERE id IN (v_id_conserve, v_id_source)
    ORDER BY id
    FOR UPDATE;

    SELECT concat_ws(' ', first_name, last_name) INTO v_nom_conserve
    FROM public.personne WHERE id = v_id_conserve;

    SELECT concat_ws(' ', first_name, last_name) INTO v_nom_source
    FROM public.personne WHERE id = v_id_source;

    INSERT INTO fusion_personne_audit(etape, objet, detail)
    VALUES (
        'PARAMÈTRES',
        'personne',
        format(
            'Conserver #%s (%s) ; absorber #%s (%s) ; suppression=%s',
            v_id_conserve, v_nom_conserve, v_id_source, v_nom_source, v_supprimer_source
        )
    );

    /* ----------------------------------------------------------------------
       1. SOUS-PROFIL PROFESSEUR
       professeur.id est également une FK vers personne.id.
       On crée/complète d'abord le professeur id_conserve, puis on déplace
       toutes les références à professeur id_source.
       ---------------------------------------------------------------------- */
    IF EXISTS (SELECT 1 FROM public.professeur WHERE id = v_id_source) THEN
        INSERT INTO public.professeur AS cible (
            id,
            hourly_rate,
            status,
            num_tva,
            num_siren,
            iban,
            info,
            date_creation,
            date_maj,
            project_id
        )
        SELECT
            v_id_conserve,
            p.hourly_rate,
            p.status,
            p.num_tva,
            p.num_siren,
            p.iban,
            p.info,
            p.date_creation,
            p.date_maj,
            p.project_id
        FROM public.professeur p
        WHERE p.id = v_id_source
        ON CONFLICT (id) DO UPDATE
        SET
            hourly_rate = coalesce(cible.hourly_rate, EXCLUDED.hourly_rate),
            status = coalesce(nullif(cible.status, ''), EXCLUDED.status),
            num_tva = coalesce(nullif(cible.num_tva, ''), EXCLUDED.num_tva),
            num_siren = coalesce(cible.num_siren, EXCLUDED.num_siren),
            iban = coalesce(nullif(cible.iban, ''), EXCLUDED.iban),
            info = coalesce(nullif(cible.info, ''), EXCLUDED.info),
            date_creation = least(cible.date_creation, EXCLUDED.date_creation),
            date_maj = greatest(cible.date_maj, EXCLUDED.date_maj),
            project_id = coalesce(cible.project_id, EXCLUDED.project_id);

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
        VALUES ('PROFESSEUR', 'public.professeur', v_lignes,
                'Création ou complément du profil professeur conservé');
    END IF;

    -- Toutes les FK réelles pointant vers professeur(id), présentes ou futures.
    FOR r IN
        SELECT
            ns.nspname AS schema_name,
            cl.relname AS table_name,
            att.attname AS column_name
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = cl.relnamespace
        JOIN LATERAL unnest(con.conkey) WITH ORDINALITY ck(attnum, ord) ON true
        JOIN LATERAL unnest(con.confkey) WITH ORDINALITY fk(attnum, ord) ON fk.ord = ck.ord
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ck.attnum
        JOIN pg_attribute refatt ON refatt.attrelid = con.confrelid AND refatt.attnum = fk.attnum
        WHERE con.contype = 'f'
          AND con.confrelid = 'public.professeur'::regclass
          AND refatt.attname = 'id'
    LOOP
        EXECUTE format(
            'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
            r.schema_name, r.table_name, r.column_name, r.column_name
        ) USING v_id_conserve, v_id_source;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES (
                'RÉFÉRENCE PROFESSEUR',
                format('%I.%I.%I', r.schema_name, r.table_name, r.column_name),
                v_lignes,
                'FK détectée automatiquement'
            );
        END IF;
    END LOOP;

    -- Colonnes de professeur connues mais dépourvues de FK, par exemple cours.prof_principal_id.
    FOR r IN
        SELECT c.table_schema AS schema_name, c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.column_name IN ('professeur_id', 'prof_principal_id')
          AND c.data_type IN ('smallint', 'integer', 'bigint')
    LOOP
        EXECUTE format(
            'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
            r.schema_name, r.table_name, r.column_name, r.column_name
        ) USING v_id_conserve, v_id_source;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES (
                'RÉFÉRENCE PROFESSEUR',
                format('%I.%I.%I', r.schema_name, r.table_name, r.column_name),
                v_lignes,
                'Colonne professeur sans FK détectée par son nom'
            );
        END IF;
    END LOOP;

    DELETE FROM public.professeur WHERE id = v_id_source;
    GET DIAGNOSTICS v_lignes = ROW_COUNT;
    IF v_lignes > 0 THEN
        INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
        VALUES ('PROFESSEUR', 'public.professeur', v_lignes, 'Ancien profil professeur supprimé');
    END IF;

    /* ----------------------------------------------------------------------
       2. INSCRIPTIONS AUX SÉANCES
       La PK (personne_id, seance_id) impose de consolider les séances communes
       avant de changer l'identifiant.
       ---------------------------------------------------------------------- */
    IF to_regclass('public.inscription_seance') IS NOT NULL THEN
        UPDATE public.inscription_seance cible
        SET
            date_inscription = least(cible.date_inscription, source.date_inscription),
            statut_inscription = coalesce(cible.statut_inscription, source.statut_inscription),
            statut_seance = coalesce(cible.statut_seance, source.statut_seance)
        FROM public.inscription_seance source
        WHERE cible.personne_id = v_id_conserve
          AND source.personne_id = v_id_source
          AND cible.seance_id = source.seance_id;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES ('SÉANCES', 'public.inscription_seance', v_lignes,
                    'Séances communes consolidées ; les valeurs de id_conserve sont prioritaires');
        END IF;

        DELETE FROM public.inscription_seance source
        WHERE source.personne_id = v_id_source
          AND EXISTS (
              SELECT 1
              FROM public.inscription_seance cible
              WHERE cible.personne_id = v_id_conserve
                AND cible.seance_id = source.seance_id
          );

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES ('SÉANCES', 'public.inscription_seance', v_lignes,
                    'Doublons de séances absorbés');
        END IF;

        UPDATE public.inscription_seance
        SET personne_id = v_id_conserve
        WHERE personne_id = v_id_source;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES ('SÉANCES', 'public.inscription_seance', v_lignes,
                    'Inscriptions restantes réaffectées');
        END IF;
    END IF;

    /* ----------------------------------------------------------------------
       3. INSCRIPTIONS AUX SAISONS
       La structure actuelle n'a pas de contrainte unique personne+saison.
       Le script réaffecte, consolide active/date, puis dédoublonne.
       ---------------------------------------------------------------------- */
    IF to_regclass('public.inscription_saison') IS NOT NULL THEN
        UPDATE public.inscription_saison
        SET personne_id = v_id_conserve
        WHERE personne_id = v_id_source;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES ('SAISONS', 'public.inscription_saison', v_lignes,
                    'Inscriptions saison réaffectées');
        END IF;

        WITH stats AS (
            SELECT
                saison_id,
                min(id) AS id_a_garder,
                min(date_inscription) AS premiere_inscription,
                bool_or(active) AS actif
            FROM public.inscription_saison
            WHERE personne_id = v_id_conserve
            GROUP BY saison_id
            HAVING count(*) > 1
        )
        UPDATE public.inscription_saison cible
        SET
            date_inscription = stats.premiere_inscription,
            active = stats.actif
        FROM stats
        WHERE cible.id = stats.id_a_garder;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES ('SAISONS', 'public.inscription_saison', v_lignes,
                    'Valeurs des saisons dupliquées consolidées');
        END IF;

        WITH lignes AS (
            SELECT
                id,
                row_number() OVER (PARTITION BY personne_id, saison_id ORDER BY id) AS numero
            FROM public.inscription_saison
            WHERE personne_id = v_id_conserve
        )
        DELETE FROM public.inscription_saison cible
        USING lignes
        WHERE cible.id = lignes.id
          AND lignes.numero > 1;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES ('SAISONS', 'public.inscription_saison', v_lignes,
                    'Doublons personne+saison supprimés');
        END IF;
    END IF;

    /* ----------------------------------------------------------------------
       4. TOUTES LES FK DIRECTES VERS personne(id)
       Détection dynamique dans le catalogue PostgreSQL.
       professeur.id est exclu car déjà traité plus haut.
       ---------------------------------------------------------------------- */
    FOR r IN
        SELECT
            ns.nspname AS schema_name,
            cl.relname AS table_name,
            att.attname AS column_name
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = cl.relnamespace
        JOIN LATERAL unnest(con.conkey) WITH ORDINALITY ck(attnum, ord) ON true
        JOIN LATERAL unnest(con.confkey) WITH ORDINALITY fk(attnum, ord) ON fk.ord = ck.ord
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ck.attnum
        JOIN pg_attribute refatt ON refatt.attrelid = con.confrelid AND refatt.attnum = fk.attnum
        WHERE con.contype = 'f'
          AND con.confrelid = 'public.personne'::regclass
          AND refatt.attname = 'id'
          AND NOT (ns.nspname = 'public' AND cl.relname = 'professeur' AND att.attname = 'id')
    LOOP
        EXECUTE format(
            'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
            r.schema_name, r.table_name, r.column_name, r.column_name
        ) USING v_id_conserve, v_id_source;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES (
                'FK PERSONNE',
                format('%I.%I.%I', r.schema_name, r.table_name, r.column_name),
                v_lignes,
                'FK vers personne(id) détectée automatiquement'
            );
        END IF;
    END LOOP;

    /* ----------------------------------------------------------------------
       5. COLONNES personne_id SANS FK
       Couvre notamment flux_financier.personne_id et les futures colonnes
       correctement nommées mais non contraintes.
       ---------------------------------------------------------------------- */
    FOR r IN
        SELECT c.table_schema AS schema_name, c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.column_name IN (
              'personne_id', 'person_id', 'adherent_id', 'adhérent_id',
              'membre_id', 'member_id'
          )
          AND c.data_type IN ('smallint', 'integer', 'bigint')
    LOOP
        EXECUTE format(
            'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
            r.schema_name, r.table_name, r.column_name, r.column_name
        ) USING v_id_conserve, v_id_source;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES (
                'COLONNE PERSONNE',
                format('%I.%I.%I', r.schema_name, r.table_name, r.column_name),
                v_lignes,
                'Colonne d’identifiant personne détectée par son nom'
            );
        END IF;
    END LOOP;

    /* ----------------------------------------------------------------------
       6. RÉFÉRENCES POLYMORPHES
       Détecte automatiquement les tables ayant :
       - object_type + object_id ; ou
       - objet_type + objet_id.
       Cela couvre actuellement contacts, addinfo, lien_groupe, note, document.
       ---------------------------------------------------------------------- */
    FOR r IN
        SELECT
            c.table_schema AS schema_name,
            c.table_name,
            max(c.column_name) FILTER (
                WHERE c.column_name IN ('object_id', 'objet_id')
            ) AS id_column,
            max(c.column_name) FILTER (
                WHERE c.column_name IN ('object_type', 'objet_type')
            ) AS type_column
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.column_name IN ('object_id', 'objet_id', 'object_type', 'objet_type')
        GROUP BY c.table_schema, c.table_name
        HAVING count(*) FILTER (WHERE c.column_name IN ('object_id', 'objet_id')) > 0
           AND count(*) FILTER (WHERE c.column_name IN ('object_type', 'objet_type')) > 0
    LOOP
        EXECUTE format(
            'UPDATE %I.%I
             SET %I = $1
             WHERE %I = $2
               AND lower(btrim(%I::text)) = ANY ($3)',
            r.schema_name,
            r.table_name,
            r.id_column,
            r.id_column,
            r.type_column
        ) USING v_id_conserve, v_id_source, v_types_personne;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES (
                'RÉFÉRENCE POLYMORPHE',
                format('%I.%I (%I/%I)', r.schema_name, r.table_name, r.type_column, r.id_column),
                v_lignes,
                'Type reconnu comme personne/adherent/membre'
            );
        END IF;
    END LOOP;

    /* ----------------------------------------------------------------------
       7. CONTRÔLES AVANT ARCHIVAGE/SUPPRESSION
       Toute référence FK ou personne_id restante provoque l'annulation.
       ---------------------------------------------------------------------- */
    v_restant := 0;

    FOR r IN
        SELECT
            ns.nspname AS schema_name,
            cl.relname AS table_name,
            att.attname AS column_name
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = cl.relnamespace
        JOIN LATERAL unnest(con.conkey) WITH ORDINALITY ck(attnum, ord) ON true
        JOIN LATERAL unnest(con.confkey) WITH ORDINALITY fk(attnum, ord) ON fk.ord = ck.ord
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ck.attnum
        JOIN pg_attribute refatt ON refatt.attrelid = con.confrelid AND refatt.attnum = fk.attnum
        WHERE con.contype = 'f'
          AND con.confrelid = 'public.personne'::regclass
          AND refatt.attname = 'id'
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM %I.%I WHERE %I = $1',
            r.schema_name, r.table_name, r.column_name
        ) INTO v_lignes USING v_id_source;

        v_restant := v_restant + v_lignes;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES (
                'ERREUR CONTRÔLE',
                format('%I.%I.%I', r.schema_name, r.table_name, r.column_name),
                v_lignes,
                'Références directes encore présentes vers id_source'
            );
        END IF;
    END LOOP;

    FOR r IN
        SELECT c.table_schema AS schema_name, c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.column_name IN (
              'personne_id', 'person_id', 'adherent_id', 'adhérent_id',
              'membre_id', 'member_id', 'professeur_id', 'prof_principal_id'
          )
          AND c.data_type IN ('smallint', 'integer', 'bigint')
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM %I.%I WHERE %I = $1',
            r.schema_name, r.table_name, r.column_name
        ) INTO v_lignes USING v_id_source;

        v_restant := v_restant + v_lignes;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES (
                'ERREUR CONTRÔLE',
                format('%I.%I.%I', r.schema_name, r.table_name, r.column_name),
                v_lignes,
                'Identifiant source encore présent dans une colonne métier'
            );
        END IF;
    END LOOP;

    -- Vérification des références polymorphes reconnues comme personnes.
    FOR r IN
        SELECT
            c.table_schema AS schema_name,
            c.table_name,
            max(c.column_name) FILTER (
                WHERE c.column_name IN ('object_id', 'objet_id')
            ) AS id_column,
            max(c.column_name) FILTER (
                WHERE c.column_name IN ('object_type', 'objet_type')
            ) AS type_column
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.column_name IN ('object_id', 'objet_id', 'object_type', 'objet_type')
        GROUP BY c.table_schema, c.table_name
        HAVING count(*) FILTER (WHERE c.column_name IN ('object_id', 'objet_id')) > 0
           AND count(*) FILTER (WHERE c.column_name IN ('object_type', 'objet_type')) > 0
    LOOP
        EXECUTE format(
            'SELECT count(*)
             FROM %I.%I
             WHERE %I = $1
               AND lower(btrim(%I::text)) = ANY ($2)',
            r.schema_name,
            r.table_name,
            r.id_column,
            r.type_column
        ) INTO v_lignes USING v_id_source, v_types_personne;

        v_restant := v_restant + v_lignes;
        IF v_lignes > 0 THEN
            INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
            VALUES (
                'ERREUR CONTRÔLE',
                format('%I.%I (%I/%I)', r.schema_name, r.table_name, r.type_column, r.id_column),
                v_lignes,
                'Référence polymorphe personne encore présente vers id_source'
            );
        END IF;
    END LOOP;

    IF v_restant > 0 THEN
        RAISE EXCEPTION
            'Fusion interrompue : % référence(s) à la personne source subsistent.',
            v_restant;
    END IF;

    /* ----------------------------------------------------------------------
       8. PERSONNE SOURCE
       Par défaut elle est archivée : aucun effacement de ses données propres.
       Passer supprimer_source à true uniquement après validation.
       ---------------------------------------------------------------------- */
    IF v_supprimer_source THEN
        DELETE FROM public.personne WHERE id = v_id_source;
        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
        VALUES ('FINALISATION', 'public.personne', v_lignes,
                'Personne source supprimée définitivement');
    ELSE
        UPDATE public.personne
        SET archive = true,
            date_maj = now()
        WHERE id = v_id_source;

        GET DIAGNOSTICS v_lignes = ROW_COUNT;
        INSERT INTO fusion_personne_audit(etape, objet, lignes_modifiees, detail)
        VALUES ('FINALISATION', 'public.personne', v_lignes,
                'Personne source archivée ; ses données propres restent consultables');
    END IF;

    UPDATE public.personne
    SET date_maj = now()
    WHERE id = v_id_conserve;

    INSERT INTO fusion_personne_audit(etape, objet, detail)
    VALUES ('SUCCÈS', 'fusion',
            format('Toutes les références détectées ont été déplacées de #%s vers #%s.',
                   v_id_source, v_id_conserve));

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'JOURNAL DE FUSION : #% vers #% (mode test=%)',
        v_id_source, v_id_conserve, v_mode_test;
    RAISE NOTICE '============================================================';

    FOR r IN
        SELECT ordre, etape, objet, lignes_modifiees, detail
        FROM fusion_personne_audit
        ORDER BY ordre
    LOOP
        RAISE NOTICE '#% | % | % | % ligne(s) | %',
            r.ordre,
            r.etape,
            r.objet,
            r.lignes_modifiees,
            coalesce(r.detail, '');
    END LOOP;

    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE 'ÉTAT DES PERSONNES JUSTE AVANT VALIDATION/ANNULATION';

    FOR r IN
        SELECT
            p.id,
            p.last_name,
            p.first_name,
            p.archive,
            p.compte,
            p.date_maj
        FROM public.personne p
        WHERE p.id IN (v_id_conserve, v_id_source)
        ORDER BY p.id
    LOOP
        RAISE NOTICE 'Personne #% : % % | archive=% | compte=% | date_maj=%',
            r.id,
            coalesce(r.first_name, ''),
            coalesce(r.last_name, ''),
            r.archive,
            r.compte,
            r.date_maj;
    END LOOP;

    IF v_mode_test THEN
        RAISE NOTICE '------------------------------------------------------------';
        RAISE NOTICE 'MODE TEST : toutes les modifications vont être annulées.';
        RAISE NOTICE 'Pour appliquer réellement : v_mode_test := false.';
        RAISE EXCEPTION USING
            ERRCODE = 'P9001',
            MESSAGE = 'ANNULATION_VOLONTAIRE_MODE_TEST';
    ELSE
        RAISE NOTICE '------------------------------------------------------------';
        RAISE NOTICE 'MODE RÉEL : fusion appliquée et validée.';
    END IF;

    EXCEPTION
        WHEN SQLSTATE 'P9001' THEN
            RAISE NOTICE 'ROLLBACK DU MODE TEST EFFECTUÉ : aucune donnée modifiée.';
    END;
END
$fusion$;
