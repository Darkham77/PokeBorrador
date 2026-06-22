-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE MOVIMIENTOS EN SAVES (ACENTOS / Ñ)
-- Fecha: 2026-06-22
-- Descripción: Traduce IDs de movimientos con acentos o letra Ñ a IDs de Showdown en inglés.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save JSONB;
  v_team JSONB;
  v_box JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
  v_poke JSONB;
  v_moves JSONB;
  v_new_moves JSONB;
  v_move JSONB;
  v_move_id TEXT;
  v_move_name TEXT;
  v_norm TEXT;
  v_move_map JSONB;
BEGIN
  -- Definir mapa de traducción explícito para movimientos con acentos, Ñ, espacios o guiones
  v_move_map := '{
    "gruñido": "growl", "grunido": "growl",
    "arañazo": "scratch", "aranazo": "scratch",
    "maldición": "curse", "maldicion": "curse",
    "látigo": "tailwhip", "latigo": "tailwhip",
    "defensaférrea": "irondefense", "defensaferrea": "irondefense",
    "supersónico": "supersonic", "supersonico": "supersonic",
    "díadepago": "payday", "diadepago": "payday",
    "premonición": "futuresight", "premonicion": "futuresight",
    "cinético": "kinesis", "kinetico": "kinesis", "kinético": "kinesis",
    "fríopolar": "sheercold", "friopolar": "sheercold",
    "ondasónica": "sonicboom", "ondasonica": "sonicboom",
    "puñosombra": "shadowpunch", "punosombra": "shadowpunch",
    "anulación": "disable", "anulacion": "disable",
    "focoenergía": "focusenergy", "focoenergia": "focusenergy",
    "sonámbulo": "sleeptalk", "sonambulo": "sleeptalk",
    "detección": "detect", "deteccion": "detect",
    "ataqueaéreo": "skyattack", "ataqueaereo": "skyattack",
    "furiadragón": "dragonrage", "furiadragon": "dragonrage",
    "constricción": "constrict", "constriccion": "constrict",
    "clavocañón": "spikecannon", "clavocanon": "spikecannon",
    "metrónomo": "metronome", "metronomo": "metronome",
    "atracción": "attract", "atraccion": "attract",
    "autodestrucción": "selfdestruct", "autodestruccion": "selfdestruct",
    "bofetónlodo": "mudslap", "bofetonlodo": "mudslap",
    "doblebofetón": "doubleslap", "doblebofeton": "doubleslap",
    "pisotón": "stomp", "pisoton": "stomp",
    "patadaígnea": "blazekick", "patadaignea": "blazekick",
    "puñocometa": "cometpunch", "punocometa": "cometpunch",
    "puñometeoro": "meteormash", "punometeoro": "meteormash",
    "danzapétalo": "petaldance", "danzapetalo": "petaldance",
    "somnífera": "sleeppowder", "somnifera": "sleeppowder",
    "ecometálico": "metalsound", "ecometalico": "metalsound",
    "armaduraácida": "acidarmor", "armaduraacida": "acidarmor",
    "puñomareo": "dizzypunch", "punomareo": "dizzypunch",
    "danzadragón": "dragondance", "danzadragon": "dragondance",
    "ondaígnea": "heatwave", "ondaignea": "heatwave",
    "máspsique": "psychup", "maspsique": "psychup",
    "masacósmica": "cosmicpower", "masacosmica": "cosmicpower",
    "protección": "protect", "proteccion": "protect",
    "sustitución": "substitute", "sustitucion": "substitute",
    "tóxico": "toxic", "toxico": "toxic",
    "reducción": "minimize", "reduccion": "minimize",
    "repetición": "wrap", "repeticion": "wrap"
  }'::jsonb;

  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save := r.save_data;
    v_team := v_save -> 'team';
    v_box := v_save -> 'box';

    -- A. Procesar Team
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        v_moves := v_poke -> 'moves';
        IF v_moves IS NOT NULL AND jsonb_typeof(v_moves) = 'array' THEN
          v_new_moves := '[]'::jsonb;
          FOR v_move IN SELECT * FROM jsonb_array_elements(v_moves) LOOP
            v_move_id := v_move ->> 'id';
            v_move_name := v_move ->> 'name';
            
            -- Normalizar: minúsculas, remover espacios y guiones bajos
            v_norm := regexp_replace(lower(coalesce(v_move_id, v_move_name, '')), '[ _]', '', 'g');
            
            IF v_move_map ->> v_norm IS NOT NULL THEN
              v_move := jsonb_set(v_move, '{id}', to_jsonb(v_move_map ->> v_norm));
            END IF;
            
            v_new_moves := v_new_moves || v_move;
          END LOOP;
          v_poke := jsonb_set(v_poke, '{moves}', v_new_moves);
        END IF;
        v_new_team := v_new_team || v_poke;
      END LOOP;
      v_save := jsonb_set(v_save, '{team}', v_new_team);
    END IF;

    -- B. Procesar Box
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        v_moves := v_poke -> 'moves';
        IF v_moves IS NOT NULL AND jsonb_typeof(v_moves) = 'array' THEN
          v_new_moves := '[]'::jsonb;
          FOR v_move IN SELECT * FROM jsonb_array_elements(v_moves) LOOP
            v_move_id := v_move ->> 'id';
            v_move_name := v_move ->> 'name';
            
            v_norm := regexp_replace(lower(coalesce(v_move_id, v_move_name, '')), '[ _]', '', 'g');
            
            IF v_move_map ->> v_norm IS NOT NULL THEN
              v_move := jsonb_set(v_move, '{id}', to_jsonb(v_move_map ->> v_norm));
            END IF;
            
            v_new_moves := v_new_moves || v_move;
          END LOOP;
          v_poke := jsonb_set(v_poke, '{moves}', v_new_moves);
        END IF;
        v_new_box := v_new_box || v_poke;
      END LOOP;
      v_save := jsonb_set(v_save, '{box}', v_new_box);
    END IF;

    -- Escribir de vuelta a la base de datos
    UPDATE public.game_saves 
    SET save_data = v_save 
    WHERE user_id = r.user_id;
  END LOOP;

  -- Actualizar db_version
  INSERT INTO public.system_config (key, value) 
  VALUES ('db_version', '20260622000200'::jsonb) 
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
