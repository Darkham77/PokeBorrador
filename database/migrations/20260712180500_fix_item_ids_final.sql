-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: IDs DE OBJETOS REZAGADOS (PostgreSQL)
-- Fecha: 2026-07-12
-- Descripción: Corrección final e incondicional de IDs de ítems con guion bajo
--              en los inventarios, equipos y cajas de las partidas guardadas en la nube.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_inventory JSONB;
  v_new_inventory JSONB;
  v_team JSONB;
  v_new_team JSONB;
  v_box JSONB;
  v_new_box JSONB;
  v_poke JSONB;
  v_inv_key TEXT;
  v_inv_val INT;
  v_clean_key TEXT;
  v_item TEXT;
  v_official_keys JSONB;
BEGIN
  v_official_keys := '{
    "ice_heal": "iceheal",
    "burn_heal": "burnheal",
    "paralyze_heal": "paralyzeheal",
    "full_heal": "fullheal",
    "hyper_potion": "hyperpotion",
    "super_potion": "superpotion",
    "max_potion": "maxpotion",
    "soda_pop": "sodapop",
    "full_restore": "fullrestore",
    "revive_max": "revivemax",
    "elixir_max": "elixirmax",
    "fire_stone": "firestone",
    "water_stone": "waterstone",
    "thunder_stone": "thunderstone",
    "leaf_stone": "leafstone",
    "moon_stone": "moonstone",
    "sun_stone": "sunstone",
    "exp_share": "expshare",
    "shell_bell": "shellbell",
    "choice_band": "choiceband",
    "focus_sash": "focussash",
    "scope_lens": "scopelens",
    "power_weight": "powerweight",
    "power_bracer": "powerbracer",
    "power_belt": "powerbelt",
    "power_lens": "powerlens",
    "power_band": "powerband",
    "power_anklet": "poweranklet",
    "destiny_knot": "destinyknot",
    "vigor_restorer": "vigorrestorer",
    "dawn_stone": "dawnstone",
    "dusk_stone": "duskstone",
    "shiny_stone": "shinystone",
    "ice_stone": "icestone",
    "hard_stone": "hardstone",
    "choice_scarf": "choicescarf",
    "choice_specs": "choicespecs",
    "dragon_fang": "dragonfang",
    "dive_ball": "diveball",
    "absorb_bulb": "absorbbulb",
    "aguav_berry": "aguavberry",
    "air_balloon": "airballoon",
    "apicot_berry": "apicotberry",
    "aspear_berry": "aspearberry",
    "auspicious_armor": "auspiciousarmor",
    "babiri_berry": "babiriberry",
    "beast_ball": "beastball",
    "binding_band": "bindingband",
    "black_sludge": "blacksludge",
    "booster_energy": "boosterenergy",
    "cell_battery": "cellbattery",
    "charti_berry": "chartiberry",
    "cheri_berry": "cheriberry",
    "cherish_ball": "cherishball",
    "chesto_berry": "chestoberry",
    "chilan_berry": "chilanberry",
    "chipped_pot": "chippedpot",
    "chople_berry": "chopleberry",
    "clear_amulet": "clearamulet",
    "coba_berry": "cobaberry",
    "colbur_berry": "colburberry",
    "cornerstone_mask": "cornerstonemask",
    "covert_cloak": "covertcloak",
    "cracked_pot": "crackedpot",
    "custap_berry": "custapberry",
    "damp_rock": "damprock",
    "draco_plate": "dracoplate",
    "dread_plate": "dreadplate",
    "dream_ball": "dreamball",
    "dubious_disc": "dubiousdisc",
    "earth_plate": "earthplate",
    "eject_button": "ejectbutton",
    "eject_pack": "ejectpack",
    "electric_seed": "electricseed",
    "enigma_berry": "enigmaberry",
    "fairy_feather": "fairyfeather",
    "fast_ball": "fastball",
    "figy_berry": "figyberry",
    "fist_plate": "fistplate",
    "flame_orb": "flameorb",
    "flame_plate": "flameplate",
    "float_stone": "floatstone",
    "focus_band": "focusband",
    "friend_ball": "friendball",
    "galarica_cuff": "galaricacuff",
    "galarica_wreath": "galaricawreath",
    "ganlon_berry": "ganlonberry",
    "grassy_seed": "grassyseed",
    "grepa_berry": "grepaberry",
    "grip_claw": "gripclaw",
    "haban_berry": "habanberry",
    "heal_ball": "healball",
    "hearthflame_mask": "hearthflamemask",
    "heat_rock": "heatrock",
    "heavy_ball": "heavyball",
    "heavy_duty_boots": "heavydutyboots",
    "hondew_berry": "hondewberry",
    "iapapa_berry": "iapapaberry",
    "icicle_plate": "icicleplate",
    "icy_rock": "icyrock",
    "insect_plate": "insectplate",
    "iron_ball": "ironball",
    "iron_plate": "ironplate",
    "jaboca_berry": "jabocaberry",
    "kasib_berry": "kasibberry",
    "keep_berry": "keepberry",
    "kelpsy_berry": "kelpsyberry",
    "lansat_berry": "lansatberry",
    "leppa_berry": "leppaberry",
    "level_ball": "levelball",
    "light_clay": "lightclay",
    "loaded_dice": "loadeddice",
    "love_ball": "loveball",
    "lum_berry": "lumberry",
    "luminous_moss": "luminousmoss",
    "lure_ball": "lureball",
    "mago_berry": "magoberry",
    "malicious_armor": "maliciousarmor",
    "maranga_berry": "marangaberry",
    "masterpiece_teacup": "masterpieceteacup",
    "meadow_plate": "meadowplate",
    "mirror_herb": "mirrorherb",
    "wish_seed": "wishseed",
    "moon_ball": "moonball",
    "normal_gem": "normalgem",
    "occa_berry": "occaberry",
    "oran_berry": "oranberry",
    "oval_stone": "ovalstone",
    "park_ball": "parkball",
    "passho_berry": "passhoberry",
    "payapa_berry": "payapaberry",
    "pecha_berry": "pechaberry",
    "persim_berry": "persimberry",
    "petaya_berry": "petayaberry",
    "pixie_plate": "pixieplate",
    "pomeg_berry": "pomegberry",
    "power_herb": "powerherb",
    "premier_ball": "premierball",
    "prism_scale": "prismscale",
    "protective_pads": "protectivepads",
    "psychic_seed": "psychicseed",
    "punching_glove": "punchingglove",
    "qualot_berry": "qualotberry",
    "rawst_berry": "rawstberry",
    "razor_claw": "razorclaw",
    "razor_fang":"razorfang",
    "reaper_cloth": "reapercloth",
    "red_card": "redcard",
    "repeat_ball": "repeatball",
    "rindo_berry": "rindoberry",
    "ring_target": "ringtarget",
    "room_service": "roomservice",
    "roseli_berry": "roseliberry",
    "rowap_berry": "rowapberry",
    "safari_ball": "safariball",
    "safety_goggles": "safetygoggles",
    "shed_shell": "shedshell",
    "shuca_berry": "shucaberry",
    "snow_ball": "snowball",
    "soul_dew": "souldew",
    "splash_plate": "splashplate",
    "spooky_plate": "spookyplate",
    "sport_ball": "sportball",
    "starf_berry": "starfberry",
    "sticky_barb": "stickybarb",
    "stone_plate": "stoneplate",
    "strange_ball": "strangeball",
    "sweet_apple": "sweetapple",
    "syrupy_apple": "syrupyapple",
    "tamato_berry": "tamatoberry",
    "tanga_berry": "tangaberry",
    "tart_apple": "tartapple",
    "terrain_extender": "terrainextender",
    "throat_spray": "throatspray",
    "toxic_orb": "toxicorb",
    "toxic_plate": "toxicplate",
    "unremarkable_teacup": "unremarkableteacup",
    "utility_umbrella": "utilityumbrella",
    "wacan_berry": "wacanberry",
    "wellspring_mask": "wellspringmask",
    "wiki_berry": "wikiberry",
    "yache_berry": "yacheberry",
    "zap_plate": "zapplate",
    "berry_bronze": "berrybronze",
    "berry_silver": "berrysilver",
    "berry_gold": "berrygold",
    "pecha_berry_wild": "pechaberrywild"
  }'::jsonb;

  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    v_inventory := v_save_data -> 'inventory';

    IF v_inventory IS NOT NULL AND jsonb_typeof(v_inventory) = 'object' THEN
      v_new_inventory := '{}'::jsonb;
      FOR v_inv_key, v_inv_val IN SELECT * FROM jsonb_each_text(v_inventory) LOOP
        v_clean_key := v_official_keys ->> v_inv_key;
        IF v_clean_key IS NULL THEN
          v_clean_key := v_inv_key;
        END IF;

        IF v_new_inventory ->> v_clean_key IS NOT NULL THEN
          v_new_inventory := jsonb_set(v_new_inventory, ARRAY[v_clean_key], to_jsonb((v_new_inventory ->> v_clean_key)::INTEGER + v_inv_val::INTEGER));
        ELSE
          v_new_inventory := jsonb_set(v_new_inventory, ARRAY[v_clean_key], to_jsonb(v_inv_val::INTEGER));
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{inventory}', v_new_inventory);
    END IF;

    v_team := v_save_data -> 'team';
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        v_item := v_poke ->> 'heldItem';
        IF v_item IS NOT NULL THEN
          v_clean_key := v_official_keys ->> v_item;
          IF v_clean_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{heldItem}', to_jsonb(v_clean_key));
          END IF;
        END IF;
        v_new_team := v_new_team || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    v_box := v_save_data -> 'box';
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        v_item := v_poke ->> 'heldItem';
        IF v_item IS NOT NULL THEN
          v_clean_key := v_official_keys ->> v_item;
          IF v_clean_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{heldItem}', to_jsonb(v_clean_key));
          END IF;
        END IF;
        v_new_box := v_new_box || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    UPDATE public.game_saves SET save_data = v_save_data WHERE user_id = r.user_id;
  END LOOP;

  -- Actualizar versión a 20260712180500
  UPDATE public.profiles SET db_version = 17;
  ALTER TABLE public.profiles ALTER COLUMN db_version SET DEFAULT 17;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260712180500'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
