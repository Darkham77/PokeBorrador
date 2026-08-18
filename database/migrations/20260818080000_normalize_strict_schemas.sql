-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: NORMALIZACIÓN ESTÁTICA DE ESQUEMAS (PostgreSQL)
-- Fecha: 2026-08-18
-- Descripción: Normaliza y asigna estáticamente valores por defecto canónicos
--              a todas las partidas guardadas en game_saves (inventario, team,
--              box, huevos, estadísticas y campos estructurales) para que el
--              esquema de Valibot sea 100% estricto sin usar 'optional()' indebidos.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_team JSONB;
  v_box JSONB;
  v_eggs JSONB;
  v_poke JSONB;
  v_egg JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
  v_new_eggs JSONB;
  v_status TEXT;
  v_clean_status JSONB;
BEGIN
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    IF v_save_data IS NULL OR jsonb_typeof(v_save_data) != 'object' THEN
      CONTINUE;
    END IF;

    -- 1. Normalizar defaults canónicos de primer nivel
    IF v_save_data -> 'gender' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{gender}', '"h"'::jsonb);
    END IF;
    IF v_save_data -> 'badges' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{badges}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'balls' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{balls}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'money' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{money}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'battleCoins' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{battleCoins}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'trainerLevel' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{trainerLevel}', '1'::jsonb);
    END IF;
    IF v_save_data -> 'trainerExp' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{trainerExp}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'trainerExpNeeded' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{trainerExpNeeded}', '100'::jsonb);
    END IF;
    IF v_save_data -> 'inventory' IS NULL OR jsonb_typeof(v_save_data -> 'inventory') != 'object' THEN
      v_save_data := jsonb_set(v_save_data, '{inventory}', '{}'::jsonb);
    END IF;
    IF v_save_data -> 'team' IS NULL OR jsonb_typeof(v_save_data -> 'team') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{team}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'box' IS NULL OR jsonb_typeof(v_save_data -> 'box') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{box}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'eggs' IS NULL OR jsonb_typeof(v_save_data -> 'eggs') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{eggs}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'pokedex' IS NULL OR jsonb_typeof(v_save_data -> 'pokedex') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{pokedex}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'seenPokedex' IS NULL OR jsonb_typeof(v_save_data -> 'seenPokedex') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{seenPokedex}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'defeatedGyms' IS NULL OR jsonb_typeof(v_save_data -> 'defeatedGyms') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{defeatedGyms}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'gymProgress' IS NULL OR jsonb_typeof(v_save_data -> 'gymProgress') != 'object' THEN
      v_save_data := jsonb_set(v_save_data, '{gymProgress}', '{}'::jsonb);
    END IF;
    IF v_save_data -> 'lastGymWins' IS NULL OR jsonb_typeof(v_save_data -> 'lastGymWins') != 'object' THEN
      v_save_data := jsonb_set(v_save_data, '{lastGymWins}', '{}'::jsonb);
    END IF;
    IF v_save_data -> 'lastGymAttempts' IS NULL OR jsonb_typeof(v_save_data -> 'lastGymAttempts') != 'object' THEN
      v_save_data := jsonb_set(v_save_data, '{lastGymAttempts}', '{}'::jsonb);
    END IF;
    IF v_save_data -> 'starterChosen' IS NULL OR jsonb_typeof(v_save_data -> 'starterChosen') != 'boolean' THEN
      v_save_data := jsonb_set(v_save_data, '{starterChosen}', 'false'::jsonb);
    END IF;
    IF v_save_data -> 'stats' IS NULL OR jsonb_typeof(v_save_data -> 'stats') != 'object' THEN
      v_save_data := jsonb_set(v_save_data, '{stats}', '{}'::jsonb);
    END IF;
    IF v_save_data -> 'eloRating' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{eloRating}', '1000'::jsonb);
    END IF;
    IF v_save_data -> 'pvpStats' IS NULL OR jsonb_typeof(v_save_data -> 'pvpStats') != 'object' THEN
      v_save_data := jsonb_set(v_save_data, '{pvpStats}', '{"wins": 0, "losses": 0, "draws": 0}'::jsonb);
    END IF;
    IF v_save_data -> 'rankedMaxElo' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{rankedMaxElo}', '1000'::jsonb);
    END IF;
    IF v_save_data -> 'rankedRewardsClaimed' IS NULL OR jsonb_typeof(v_save_data -> 'rankedRewardsClaimed') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{rankedRewardsClaimed}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'passiveTeamUids' IS NULL OR jsonb_typeof(v_save_data -> 'passiveTeamUids') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{passiveTeamUids}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'passiveTeamActive' IS NULL OR jsonb_typeof(v_save_data -> 'passiveTeamActive') != 'boolean' THEN
      v_save_data := jsonb_set(v_save_data, '{passiveTeamActive}', 'false'::jsonb);
    END IF;
    IF v_save_data -> 'daycare_missions' IS NULL OR jsonb_typeof(v_save_data -> 'daycare_missions') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{daycare_missions}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'daycare_mission_refreshes' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{daycare_mission_refreshes}', '3'::jsonb);
    END IF;
    IF v_save_data -> 'boxCount' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{boxCount}', '4'::jsonb);
    END IF;
    IF v_save_data -> 'chats' IS NULL OR jsonb_typeof(v_save_data -> 'chats') != 'object' THEN
      v_save_data := jsonb_set(v_save_data, '{chats}', '{}'::jsonb);
    END IF;
    IF v_save_data -> 'classLevel' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{classLevel}', '1'::jsonb);
    END IF;
    IF v_save_data -> 'classXP' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{classXP}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'classData' IS NULL OR jsonb_typeof(v_save_data -> 'classData') != 'object' THEN
      v_save_data := jsonb_set(v_save_data, '{classData}', '{"captureStreak": 0, "longestStreak": 0, "reputation": 0, "blackMarketSales": 0, "criminality": 0, "kitCaptures": 0}'::jsonb);
    END IF;
    IF v_save_data -> 'warCoins' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{warCoins}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'warCoinsSpent' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{warCoinsSpent}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'notificationHistory' IS NULL OR jsonb_typeof(v_save_data -> 'notificationHistory') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{notificationHistory}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'marketSoldSeenIds' IS NULL OR jsonb_typeof(v_save_data -> 'marketSoldSeenIds') != 'array' THEN
      v_save_data := jsonb_set(v_save_data, '{marketSoldSeenIds}', '[]'::jsonb);
    END IF;
    IF v_save_data -> 'lastPokemonCenterHeal' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{lastPokemonCenterHeal}', '0'::jsonb);
    END IF;
    IF v_save_data -> 'playtime' IS NULL THEN
      v_save_data := jsonb_set(v_save_data, '{playtime}', '0'::jsonb);
    END IF;

    -- 2. Normalizar Pokémon en Team
    v_team := v_save_data -> 'team';
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
          IF v_poke -> 'uid' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{uid}', to_jsonb(md5(random()::text)));
          END IF;
          IF v_poke -> 'species' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{species}', v_poke -> 'id');
          END IF;
          IF v_poke -> 'isShiny' IS NULL OR jsonb_typeof(v_poke -> 'isShiny') != 'boolean' THEN
            v_poke := jsonb_set(v_poke, '{isShiny}', 'false'::jsonb);
          END IF;
          IF v_poke -> 'expNeeded' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{expNeeded}', '100'::jsonb);
          END IF;
          v_status := lower(coalesce(v_poke ->> 'status', ''));
          IF v_status IN ('sleep', 'slp') THEN v_clean_status := '"slp"'::jsonb;
          ELSIF v_status IN ('poison', 'psn') THEN v_clean_status := '"psn"'::jsonb;
          ELSIF v_status IN ('burn', 'brn') THEN v_clean_status := '"brn"'::jsonb;
          ELSIF v_status IN ('paralysis', 'par') THEN v_clean_status := '"par"'::jsonb;
          ELSIF v_status IN ('freeze', 'frz') THEN v_clean_status := '"frz"'::jsonb;
          ELSIF v_status IN ('toxic', 'tox') THEN v_clean_status := '"tox"'::jsonb;
          ELSE v_clean_status := '""'::jsonb;
          END IF;
          v_poke := jsonb_set(v_poke, '{status}', v_clean_status);
          IF v_poke -> 'ivs' IS NULL OR jsonb_typeof(v_poke -> 'ivs') != 'object' THEN
            v_poke := jsonb_set(v_poke, '{ivs}', '{"hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0}'::jsonb);
          END IF;
          IF v_poke -> 'evs' IS NULL OR jsonb_typeof(v_poke -> 'evs') != 'object' THEN
            v_poke := jsonb_set(v_poke, '{evs}', '{"hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0}'::jsonb);
          END IF;
          IF v_poke -> 'friendship' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{friendship}', '70'::jsonb);
          END IF;
          IF v_poke -> 'nature' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{nature}', '"hardy"'::jsonb);
          END IF;
          v_new_team := v_new_team || v_poke;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    -- 3. Normalizar Pokémon en Box
    v_box := v_save_data -> 'box';
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
          IF v_poke -> 'uid' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{uid}', to_jsonb(md5(random()::text)));
          END IF;
          IF v_poke -> 'species' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{species}', v_poke -> 'id');
          END IF;
          IF v_poke -> 'isShiny' IS NULL OR jsonb_typeof(v_poke -> 'isShiny') != 'boolean' THEN
            v_poke := jsonb_set(v_poke, '{isShiny}', 'false'::jsonb);
          END IF;
          IF v_poke -> 'expNeeded' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{expNeeded}', '100'::jsonb);
          END IF;
          v_status := lower(coalesce(v_poke ->> 'status', ''));
          IF v_status IN ('sleep', 'slp') THEN v_clean_status := '"slp"'::jsonb;
          ELSIF v_status IN ('poison', 'psn') THEN v_clean_status := '"psn"'::jsonb;
          ELSIF v_status IN ('burn', 'brn') THEN v_clean_status := '"brn"'::jsonb;
          ELSIF v_status IN ('paralysis', 'par') THEN v_clean_status := '"par"'::jsonb;
          ELSIF v_status IN ('freeze', 'frz') THEN v_clean_status := '"frz"'::jsonb;
          ELSIF v_status IN ('toxic', 'tox') THEN v_clean_status := '"tox"'::jsonb;
          ELSE v_clean_status := '""'::jsonb;
          END IF;
          v_poke := jsonb_set(v_poke, '{status}', v_clean_status);
          IF v_poke -> 'ivs' IS NULL OR jsonb_typeof(v_poke -> 'ivs') != 'object' THEN
            v_poke := jsonb_set(v_poke, '{ivs}', '{"hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0}'::jsonb);
          END IF;
          IF v_poke -> 'evs' IS NULL OR jsonb_typeof(v_poke -> 'evs') != 'object' THEN
            v_poke := jsonb_set(v_poke, '{evs}', '{"hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0}'::jsonb);
          END IF;
          IF v_poke -> 'friendship' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{friendship}', '70'::jsonb);
          END IF;
          IF v_poke -> 'nature' IS NULL THEN
            v_poke := jsonb_set(v_poke, '{nature}', '"hardy"'::jsonb);
          END IF;
          v_new_box := v_new_box || v_poke;
        ELSIF v_poke IS NULL OR jsonb_typeof(v_poke) = 'null' THEN
          v_new_box := v_new_box || 'null'::jsonb;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    -- 4. Normalizar Huevos (eggs)
    v_eggs := v_save_data -> 'eggs';
    IF v_eggs IS NOT NULL AND jsonb_typeof(v_eggs) = 'array' THEN
      v_new_eggs := '[]'::jsonb;
      FOR v_egg IN SELECT * FROM jsonb_array_elements(v_eggs) LOOP
        IF v_egg IS NOT NULL AND jsonb_typeof(v_egg) = 'object' THEN
          IF v_egg -> 'uid' IS NULL THEN
            v_egg := jsonb_set(v_egg, '{uid}', to_jsonb(md5(random()::text)));
          END IF;
          IF v_egg -> 'id' IS NULL THEN
            v_egg := jsonb_set(v_egg, '{id}', to_jsonb(md5(random()::text)));
          END IF;
          IF v_egg -> 'steps' IS NULL THEN
            v_egg := jsonb_set(v_egg, '{steps}', '0'::jsonb);
          END IF;
          IF v_egg -> 'ready' IS NULL OR jsonb_typeof(v_egg -> 'ready') != 'boolean' THEN
            v_egg := jsonb_set(v_egg, '{ready}', 'false'::jsonb);
          END IF;
          v_new_eggs := v_new_eggs || v_egg;
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{eggs}', v_new_eggs);
    END IF;

    UPDATE public.game_saves SET save_data = v_save_data WHERE user_id = r.user_id;
  END LOOP;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260818080000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
