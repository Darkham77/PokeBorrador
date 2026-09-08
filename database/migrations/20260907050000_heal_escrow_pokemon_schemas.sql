-- PostgreSQL Migration: 20260907050000_heal_escrow_pokemon_schemas
-- Description: Normalizes species, status, and natures across escrow and in-transit Pokémon tables (claim_queue, market_listings, trade_offers).

DO $$
DECLARE
  r RECORD;
  v_asset JSONB;
  v_poke JSONB;
  v_nature TEXT;
  v_norm_nature TEXT;
  v_status TEXT;
  v_clean_status JSONB;
  v_species TEXT;
  v_nature_map JSONB;
BEGIN
  v_nature_map := '{
    "serio": "serious", "seria": "serious", "serious": "serious",
    "firme": "adamant", "adamant": "adamant",
    "timido": "bashful", "timida": "bashful", "tímido": "bashful", "tímida": "bashful", "bashful": "bashful",
    "osado": "bold", "osada": "bold", "bold": "bold",
    "audaz": "brave", "brave": "brave",
    "sereno": "calm", "serena": "calm", "calm": "calm",
    "cauto": "careful", "cauta": "careful", "careful": "careful",
    "docil": "docile", "dócil": "docile", "docile": "docile",
    "amable": "gentle", "gentle": "gentle",
    "fuerte": "hardy", "hardy": "hardy",
    "activa": "hasty", "activo": "hasty", "active": "hasty", "hasty": "hasty",
    "agitada": "impish", "agitado": "impish", "impish": "impish",
    "alegre": "jolly", "jovial": "jolly", "jolly": "jolly",
    "floja": "lax", "flojo": "lax", "lax": "lax",
    "hurana": "lonely", "hurano": "lonely", "huraña": "lonely", "huraño": "lonely", "lonely": "lonely",
    "afable": "mild", "moderada": "mild", "moderado": "mild", "mild": "mild",
    "modesta": "modest", "modesto": "modest", "modest": "modest",
    "ingenua": "naive", "ingenuo": "naive", "naive": "naive",
    "picara": "naughty", "picaro": "naughty", "pícara": "naughty", "pícaro": "naughty", "naughty": "naughty",
    "mansa": "quiet", "manso": "quiet", "tranquila": "quiet", "tranquilo": "quiet", "tasa": "quiet", "quiet": "quiet",
    "rara": "quirky", "raro": "quirky", "quirky": "quirky",
    "alocada": "rash", "alocado": "rash", "rash": "rash",
    "placida": "relaxed", "placido": "relaxed", "plácida": "relaxed", "plácido": "relaxed", "relaxed": "relaxed",
    "grosera": "sassy", "grosero": "sassy", "sassy": "sassy",
    "miedosa": "timid", "miedoso": "timid", "timid": "timid"
  }'::jsonb;

  -- 1. claim_queue
  FOR r IN SELECT id, asset_data FROM public.claim_queue WHERE (asset_data->>'type') = 'pokemon' LOOP
    v_asset := r.asset_data;
    v_poke := v_asset -> 'data';
    IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
      v_species := COALESCE(v_poke->>'species', v_poke->>'id');
      IF v_species IS NOT NULL THEN
        v_poke := jsonb_set(v_poke, '{species}', to_jsonb(v_species));
      END IF;

      v_status := lower(COALESCE(v_poke->>'status', ''));
      IF v_status IN ('sleep', 'slp') THEN v_clean_status := '"slp"'::jsonb;
      ELSIF v_status IN ('poison', 'psn') THEN v_clean_status := '"psn"'::jsonb;
      ELSIF v_status IN ('burn', 'brn') THEN v_clean_status := '"brn"'::jsonb;
      ELSIF v_status IN ('paralysis', 'par') THEN v_clean_status := '"par"'::jsonb;
      ELSIF v_status IN ('freeze', 'frz') THEN v_clean_status := '"frz"'::jsonb;
      ELSIF v_status IN ('toxic', 'tox') THEN v_clean_status := '"tox"'::jsonb;
      ELSE v_clean_status := '""'::jsonb;
      END IF;
      v_poke := jsonb_set(v_poke, '{status}', v_clean_status);

      v_nature := v_poke->>'nature';
      IF v_nature IS NOT NULL THEN
        v_norm_nature := v_nature_map->>lower(v_nature);
        IF v_norm_nature IS NOT NULL THEN
          v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_norm_nature));
        ELSE
          v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(lower(v_nature)));
        END IF;
      END IF;

      v_asset := jsonb_set(v_asset, '{data}', v_poke);
      UPDATE public.claim_queue SET asset_data = v_asset WHERE id = r.id;
    END IF;
  END LOOP;

  -- 2. market_listings
  FOR r IN SELECT id, data FROM public.market_listings WHERE listing_type = 'pokemon' LOOP
    v_poke := r.data;
    IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' THEN
      v_species := COALESCE(v_poke->>'species', v_poke->>'id');
      IF v_species IS NOT NULL THEN
        v_poke := jsonb_set(v_poke, '{species}', to_jsonb(v_species));
      END IF;

      v_status := lower(COALESCE(v_poke->>'status', ''));
      IF v_status IN ('sleep', 'slp') THEN v_clean_status := '"slp"'::jsonb;
      ELSIF v_status IN ('poison', 'psn') THEN v_clean_status := '"psn"'::jsonb;
      ELSIF v_status IN ('burn', 'brn') THEN v_clean_status := '"brn"'::jsonb;
      ELSIF v_status IN ('paralysis', 'par') THEN v_clean_status := '"par"'::jsonb;
      ELSIF v_status IN ('freeze', 'frz') THEN v_clean_status := '"frz"'::jsonb;
      ELSIF v_status IN ('toxic', 'tox') THEN v_clean_status := '"tox"'::jsonb;
      ELSE v_clean_status := '""'::jsonb;
      END IF;
      v_poke := jsonb_set(v_poke, '{status}', v_clean_status);

      v_nature := v_poke->>'nature';
      IF v_nature IS NOT NULL THEN
        v_norm_nature := v_nature_map->>lower(v_nature);
        IF v_norm_nature IS NOT NULL THEN
          v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_norm_nature));
        ELSE
          v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(lower(v_nature)));
        END IF;
      END IF;

      UPDATE public.market_listings SET data = v_poke WHERE id = r.id;
    END IF;
  END LOOP;

  -- 3. trade_offers (offer_pokemon and request_pokemon)
  FOR r IN SELECT id, offer_pokemon, request_pokemon FROM public.trade_offers WHERE offer_pokemon IS NOT NULL OR request_pokemon IS NOT NULL LOOP
    v_poke := r.offer_pokemon;
    IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' AND (v_poke->>'id') IS NOT NULL THEN
      v_species := COALESCE(v_poke->>'species', v_poke->>'id');
      IF v_species IS NOT NULL THEN
        v_poke := jsonb_set(v_poke, '{species}', to_jsonb(v_species));
      END IF;

      v_status := lower(COALESCE(v_poke->>'status', ''));
      IF v_status IN ('sleep', 'slp') THEN v_clean_status := '"slp"'::jsonb;
      ELSIF v_status IN ('poison', 'psn') THEN v_clean_status := '"psn"'::jsonb;
      ELSIF v_status IN ('burn', 'brn') THEN v_clean_status := '"brn"'::jsonb;
      ELSIF v_status IN ('paralysis', 'par') THEN v_clean_status := '"par"'::jsonb;
      ELSIF v_status IN ('freeze', 'frz') THEN v_clean_status := '"frz"'::jsonb;
      ELSIF v_status IN ('toxic', 'tox') THEN v_clean_status := '"tox"'::jsonb;
      ELSE v_clean_status := '""'::jsonb;
      END IF;
      v_poke := jsonb_set(v_poke, '{status}', v_clean_status);

      v_nature := v_poke->>'nature';
      IF v_nature IS NOT NULL THEN
        v_norm_nature := v_nature_map->>lower(v_nature);
        IF v_norm_nature IS NOT NULL THEN
          v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_norm_nature));
        ELSE
          v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(lower(v_nature)));
        END IF;
      END IF;

      UPDATE public.trade_offers SET offer_pokemon = v_poke WHERE id = r.id;
    END IF;

    v_poke := r.request_pokemon;
    IF v_poke IS NOT NULL AND jsonb_typeof(v_poke) = 'object' AND (v_poke->>'id') IS NOT NULL THEN
      v_species := COALESCE(v_poke->>'species', v_poke->>'id');
      IF v_species IS NOT NULL THEN
        v_poke := jsonb_set(v_poke, '{species}', to_jsonb(v_species));
      END IF;

      v_status := lower(COALESCE(v_poke->>'status', ''));
      IF v_status IN ('sleep', 'slp') THEN v_clean_status := '"slp"'::jsonb;
      ELSIF v_status IN ('poison', 'psn') THEN v_clean_status := '"psn"'::jsonb;
      ELSIF v_status IN ('burn', 'brn') THEN v_clean_status := '"brn"'::jsonb;
      ELSIF v_status IN ('paralysis', 'par') THEN v_clean_status := '"par"'::jsonb;
      ELSIF v_status IN ('freeze', 'frz') THEN v_clean_status := '"frz"'::jsonb;
      ELSIF v_status IN ('toxic', 'tox') THEN v_clean_status := '"tox"'::jsonb;
      ELSE v_clean_status := '""'::jsonb;
      END IF;
      v_poke := jsonb_set(v_poke, '{status}', v_clean_status);

      v_nature := v_poke->>'nature';
      IF v_nature IS NOT NULL THEN
        v_norm_nature := v_nature_map->>lower(v_nature);
        IF v_norm_nature IS NOT NULL THEN
          v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_norm_nature));
        ELSE
          v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(lower(v_nature)));
        END IF;
      END IF;

      UPDATE public.trade_offers SET request_pokemon = v_poke WHERE id = r.id;
    END IF;
  END LOOP;

  -- 4. Update system_config db_version
  INSERT INTO public.system_config (key, value)
  VALUES ('db_version', '20260907050000'::jsonb)
  ON CONFLICT (key)
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
