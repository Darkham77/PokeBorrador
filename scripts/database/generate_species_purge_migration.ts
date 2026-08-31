// fallow-ignore-file security-sink
import fs from 'node:fs';
import path from 'node:path';
import { ENABLED_POKEMON_IDS } from '../../src/data/system/constants.ts';

export function generateSpeciesPurgeMigration() {
  const enabledListSql = ENABLED_POKEMON_IDS.map(id => `'${id}'`).join(',');
  const enabledArrayPg = `ARRAY[\n    ${ENABLED_POKEMON_IDS.map(id => `'${id}'`).join(', ')}\n  ]`;

  // Build PostgreSQL migration
  const pgSql = `-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: PURGA DE ESPECIES Y HUEVOS NO HABILITADOS (PostgreSQL)
-- Fecha: 2026-08-31
-- Descripción: Generado automáticamente a partir de ENABLED_POKEMON_IDS (Single Source of Truth).
--              Elimina de 'game_saves' (team, box, eggs, daycareWarehouse) cualquier Pokémon o huevo
--              cuya especie no pertenezca a la whitelist global,
--              preservando el Save Shield para que ninguna cuenta quede con 0 Pokémon.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_enabled TEXT[] := ${enabledArrayPg};
  v_eggs JSONB;
  v_new_eggs JSONB;
  v_elem JSONB;
  v_sp TEXT;
  v_team JSONB;
  v_new_team JSONB;
  v_box JSONB;
  v_new_box JSONB;
  v_wh JSONB;
  v_new_wh JSONB;
  v_changed BOOLEAN;
  v_promoted JSONB;
  v_rescue_starter JSONB;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    IF v_save_data IS NULL THEN CONTINUE; END IF;

    IF jsonb_typeof(v_save_data) = 'string' THEN
      BEGIN
        v_save_data := (v_save_data #>> '{}')::jsonb;
      EXCEPTION WHEN OTHERS THEN
        CONTINUE;
      END;
    END IF;

    IF jsonb_typeof(v_save_data) != 'object' THEN CONTINUE; END IF;

    v_changed := FALSE;

    -- 1. Purgar Huevos (saveData.eggs)
    v_eggs := v_save_data -> 'eggs';
    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_elem IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        IF v_elem IS NOT NULL AND jsonb_typeof(v_elem) = 'object' THEN
          v_sp := COALESCE(NULLIF(v_elem ->> 'id', ''), NULLIF(v_elem ->> 'pokemonId', ''), NULLIF(v_elem ->> 'species', ''));
          IF v_sp = ANY(v_enabled) THEN
            v_new_eggs := v_new_eggs || v_elem;
          ELSE
            v_changed := TRUE;
          END IF;
        END IF;
      END LOOP;
      IF v_new_eggs != v_eggs THEN
        v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_eggs);
        v_changed := TRUE;
      END IF;
    END IF;

    -- 2. Purgar Caja (saveData.box)
    v_box := v_save_data -> 'box';
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_elem IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        IF v_elem IS NOT NULL AND jsonb_typeof(v_elem) = 'object' THEN
          v_sp := v_elem ->> 'id';
          IF v_sp = ANY(v_enabled) THEN
            v_new_box := v_new_box || v_elem;
          ELSE
            v_changed := TRUE;
          END IF;
        END IF;
      END LOOP;
      IF v_new_box != v_box THEN
        v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
        v_changed := TRUE;
      END IF;
    END IF;

    -- 3. Purgar Equipo (saveData.team)
    v_team := v_save_data -> 'team';
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_elem IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        IF v_elem IS NOT NULL AND jsonb_typeof(v_elem) = 'object' THEN
          v_sp := v_elem ->> 'id';
          IF v_sp = ANY(v_enabled) THEN
            v_new_team := v_new_team || v_elem;
          ELSE
            v_changed := TRUE;
          END IF;
        END IF;
      END LOOP;

      -- Garantía Save Shield: El equipo no puede quedar con 0 Pokémon
      IF jsonb_array_length(v_new_team) = 0 THEN
        IF v_save_data -> 'box' IS NOT NULL AND jsonb_array_length(v_save_data -> 'box') > 0 THEN
          v_promoted := (v_save_data -> 'box') -> 0;
          v_new_team := jsonb_build_array(v_promoted);
          v_save_data := jsonb_set(v_save_data, '{box}', (v_save_data -> 'box') - 0);
          v_changed := TRUE;
        ELSE
          -- Inyectar Bulbasaur Nv. 5 de rescate
          v_rescue_starter := jsonb_build_object(
            'uid', 'bulbasaur-' || floor(extract(epoch from now()) * 1000)::text,
            'id', 'bulbasaur',
            'species', 'bulbasaur',
            'name', 'Bulbasaur',
            'level', 5,
            'exp', 0,
            'expNeeded', 135,
            'hp', 20,
            'maxHp', 20,
            'atk', 10,
            'def', 10,
            'spa', 12,
            'spd', 12,
            'spe', 10,
            'type', 'grass',
            'type2', 'poison',
            'types', jsonb_build_array('grass', 'poison'),
            'isShiny', false,
            'gender', 'm',
            'nature', 'hardy',
            'ability', 'overgrow',
            'vigor', 10,
            'maxVigor', 10,
            'ivs', jsonb_build_object('hp', 15, 'atk', 15, 'def', 15, 'spa', 15, 'spd', 15, 'spe', 15),
            'moves', jsonb_build_array(
              jsonb_build_object('id', 'tackle', 'name', 'Placaje', 'type', 'normal', 'cat', 'physical', 'power', 40, 'acc', 100, 'pp', 35, 'maxPP', 35),
              jsonb_build_object('id', 'growl', 'name', 'Gruñido', 'type', 'normal', 'cat', 'status', 'power', 0, 'acc', 100, 'pp', 40, 'maxPP', 40)
            ),
            'isIllegal', false,
            'illegalReasons', '[]'::jsonb
          );
          v_new_team := jsonb_build_array(v_rescue_starter);
          v_changed := TRUE;
        END IF;
      END IF;

      IF v_new_team != v_team THEN
        v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
        v_changed := TRUE;
      END IF;
    END IF;

    -- 4. Purgar Guardería Depósito (saveData.daycareWarehouse)
    v_wh := v_save_data -> 'daycareWarehouse';
    IF v_wh IS NOT NULL AND jsonb_typeof(v_wh) = 'array' THEN
      v_new_wh := '[]'::jsonb;
      FOR v_elem IN SELECT * FROM jsonb_array_elements(v_wh) LOOP
        IF v_elem IS NOT NULL AND jsonb_typeof(v_elem) = 'object' THEN
          v_sp := COALESCE(NULLIF(v_elem ->> 'species', ''), NULLIF(v_elem ->> 'id', ''));
          IF v_sp LIKE 'egg_%' THEN
            v_sp := split_part(v_sp, '_', 3);
          END IF;
          IF v_sp = ANY(v_enabled) THEN
            v_new_wh := v_new_wh || v_elem;
          ELSE
            v_changed := TRUE;
          END IF;
        END IF;
      END LOOP;
      IF v_new_wh != v_wh THEN
        v_save_data := jsonb_set(v_save_data, '{daycareWarehouse}', v_new_wh);
        v_changed := TRUE;
      END IF;
    END IF;

    IF v_changed THEN
      UPDATE public.game_saves SET save_data = v_save_data, last_save_id = gen_random_uuid(), updated_at = NOW() WHERE user_id = r.user_id;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260831010000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

UPDATE public.game_saves SET last_save_id = gen_random_uuid();
`;

  // Build SQLite migration
  const sqliteSql = `-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: PURGA DE ESPECIES Y HUEVOS NO HABILITADOS (SQLite)
-- Fecha: 2026-08-31
-- Descripción: Generado automáticamente a partir de ENABLED_POKEMON_IDS (Single Source of Truth).
-- =====================================================

-- 1. Purgar Huevos (saveData.eggs)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.eggs',
  coalesce((
    SELECT json_group_array(json(egg_item.value))
    FROM json_each(save_data, '$.eggs') AS egg_item
    WHERE coalesce(nullif(json_extract(egg_item.value, '$.id'), ''), nullif(json_extract(egg_item.value, '$.pokemonId'), ''), nullif(json_extract(egg_item.value, '$.species'), '')) IN (${enabledListSql})
  ), json_array())
)
WHERE json_valid(save_data) AND json_type(save_data, '$.eggs') = 'array';

-- 2. Purgar Caja (saveData.box)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.box',
  coalesce((
    SELECT json_group_array(json(box_item.value))
    FROM json_each(save_data, '$.box') AS box_item
    WHERE box_item.value IS NOT NULL AND json_extract(box_item.value, '$.id') IN (${enabledListSql})
  ), json_array())
)
WHERE json_valid(save_data) AND json_type(save_data, '$.box') = 'array';

-- 3. Purgar Equipo (saveData.team)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  coalesce((
    SELECT json_group_array(json(team_item.value))
    FROM json_each(save_data, '$.team') AS team_item
    WHERE team_item.value IS NOT NULL AND json_extract(team_item.value, '$.id') IN (${enabledListSql})
  ), json_array())
)
WHERE json_valid(save_data) AND json_type(save_data, '$.team') = 'array';

-- 4. Purgar Guardería Depósito (saveData.daycareWarehouse)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.daycareWarehouse',
  coalesce((
    SELECT json_group_array(json(wh_item.value))
    FROM json_each(save_data, '$.daycareWarehouse') AS wh_item
    WHERE wh_item.value IS NOT NULL AND coalesce(nullif(json_extract(wh_item.value, '$.species'), ''), nullif(json_extract(wh_item.value, '$.id'), '')) IN (${enabledListSql})
  ), json_array())
)
WHERE json_valid(save_data) AND json_type(save_data, '$.daycareWarehouse') = 'array';

-- 5. Save Shield: Rescate para equipos vacíos en SQLite
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  json_array(
    json_object(
      'uid', 'bulbasaur-' || hex(randomblob(4)),
      'id', 'bulbasaur',
      'species', 'bulbasaur',
      'name', 'Bulbasaur',
      'level', 5,
      'exp', 0,
      'expNeeded', 135,
      'hp', 20,
      'maxHp', 20,
      'atk', 10,
      'def', 10,
      'spa', 12,
      'spd', 12,
      'spe', 10,
      'type', 'grass',
      'type2', 'poison',
      'types', json_array('grass', 'poison'),
      'isShiny', json('false'),
      'gender', 'm',
      'nature', 'hardy',
      'ability', 'overgrow',
      'vigor', 10,
      'maxVigor', 10,
      'ivs', json_object('hp', 15, 'atk', 15, 'def', 15, 'spa', 15, 'spd', 15, 'spe', 15),
      'moves', json_array(
        json_object('id', 'tackle', 'name', 'Placaje', 'type', 'normal', 'cat', 'physical', 'power', 40, 'acc', 100, 'pp', 35, 'maxPP', 35),
        json_object('id', 'growl', 'name', 'Gruñido', 'type', 'normal', 'cat', 'status', 'power', 0, 'acc', 100, 'pp', 40, 'maxPP', 40)
      ),
      'isIllegal', json('false'),
      'illegalReasons', json_array()
    )
  )
)
WHERE json_valid(save_data) AND json_array_length(json_extract(save_data, '$.team')) = 0;

INSERT INTO system_config (key, value) VALUES ('db_version', '"20260831010000"')
ON CONFLICT(key) DO UPDATE SET value = '"20260831010000"';
`;

  const pgPath = path.resolve(process.cwd(), 'database/migrations/20260831010000_purge_disabled_species_and_eggs.sql');
  const sqlitePath = path.resolve(process.cwd(), 'database/migrations/20260831010000_purge_disabled_species_and_eggs.sqlite.sql');

  fs.writeFileSync(pgPath, pgSql, 'utf8');
  fs.writeFileSync(sqlitePath, sqliteSql, 'utf8');
  console.log(`✨ Migración de purga de especies generada desde ENABLED_POKEMON_IDS (${ENABLED_POKEMON_IDS.length} especies habilitadas).`);
}

if (process.argv[1]?.includes('generate_species_purge_migration')) {
  generateSpeciesPurgeMigration();
}
