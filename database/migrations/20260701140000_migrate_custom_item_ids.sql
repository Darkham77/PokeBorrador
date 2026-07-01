-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: ESTANDARIZACIÓN DE ÍTEMS DE SHOWDOWN
-- Fecha: 2026-07-01
-- Descripción: Convierte todos los IDs de objetos personalizados en la mochila y equipados a formato puro de Showdown (minúsculas, alfanumérico).
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
  v_official_keys := '{"great_ball":"greatball","nature_patch":"naturepatch","timer_ball":"timerball","ultra_ball":"ultraball","master_ball":"masterball","ticket_shiny":"ticketshiny","ticket_cerulean":"ticketcerulean","coal_ore":"coalore","iron_ore":"ironore","net_ball":"netball","big_pearl":"bigpearl","dusk_ball":"duskball","old_amber":"oldamber","3d_printer":"3dprinter","copper_ore":"copperore","light_ball":"lightball","silver_ore":"silverore","star_piece":"starpiece","amulet_coin":"amuletcoin","dome_fossil":"domefossil","luxury_ball":"luxuryball","zaphire_ore":"zaphireore","dragon_scale":"dragonscale","helix_fossil":"helixfossil","laser_cutter":"lasercutter","tungsten_ore":"tungstenore","lab_equipment":"labequipment","ticket_safari":"ticketsafari","food_dispenser":"fooddispenser","medical_device":"medicaldevice","move_relearner":"moverelearner","weather_station":"weatherstation","fishing_rod_good":"fishingrodgood","antimatter_generator":"antimattergenerator","pp_up":"ppup","vigor_candy":"vigorcandy","ticket_mewtwo":"ticketmewtwo","iv_scanner":"ivscanner","ticket_articuno":"ticketarticuno","rare_candy":"rarecandy","ability_pill":"abilitypill","incense_fire":"incensefire","incense_water":"incensewater","incense_grass":"incensegrass","incense_normal":"incensenormal","incense_ghost":"incenseghost","incense_psychic":"incensepsychic","lucky_egg":"luckyegg","super_repel":"superrepel","max_repel":"maxrepel","fishing_rod":"fishingrod","fishing_rod_super":"fishingrodsuper","pickaxe_silver":"pickaxesilver","pickaxe_gold":"pickaxegold","brush_good":"brushgood","brush_super":"brushsuper","gold_ore":"goldore","uranium_ore":"uraniumore","rubi_ore":"rubiore","emmerald_ore":"emmeraldore","topaz_ore":"topazore","diamond_ore":"diamondore","apricorn_blue":"apricornblue","apricorn_red":"apricornred","apricorn_yellow":"apricornyellow","berry_sugar":"berrysugar","bone_fragment":"bonefragment","combee_honey":"combeehoney","electronic_scrap":"electronicscrap","energy_powder":"energypowder","food_scraps":"foodscraps","herb_rare":"herbrare","ice_crystal":"icecrystal","leather_strip":"leatherstrip","liechi_berry":"liechiberry","metal_scrap":"metalscrap","nickel_ore":"nickelore","pecha_berry_wild":"pechaberrywild","petrified_sap":"petrifiedsap","pigment_black":"pigmentblack","pigment_blue":"pigmentblue","pigment_green":"pigmentgreen","pigment_orange":"pigmentorange","pigment_purple":"pigmentpurple","pigment_red":"pigmentred","pigment_white":"pigmentwhite","pigment_yellow":"pigmentyellow","revive_root":"reviveroot","rubber_compound":"rubbercompound","salac_berry":"salacberry","sand_silica":"sandsilica","saw_dust":"sawdust","sweet_sap":"sweetsap","tiny_mushroom":"tinymushroom","tin_ore":"tinore","bronze_alloy":"bronzealloy","chemical_base":"chemicalbase","electrum_alloy":"electrumalloy","glass_bottle":"glassbottle","hardened_alloy":"hardenedalloy","paint_splint":"paintsplint","steel_alloy":"steelalloy","tint_black":"tintblack","tint_blue":"tintblue","tint_green":"tintgreen","tint_orange":"tintorange","tint_purple":"tintpurple","tint_red":"tintred","tint_white":"tintwhite","tint_yellow":"tintyellow","woven_thread":"woventhread","advanced_electronics_module":"advancedelectronicsmodule","antidote_reactive":"antidotereactive","big_battery":"bigbattery","big_cpu":"bigcpu","bolt_nut":"boltnut","bronze_nectar":"bronzenectar","calibrated_weight":"calibratedweight","chemical_essence":"chemicalessence","chemical_resuscitant":"chemicalresuscitant","electronics_module":"electronicsmodule","fat_monitor":"fatmonitor","flat_monitor":"flatmonitor","golden_nectar":"goldennectar","industrial_electronics":"industrialelectronics","medicinal_extract":"medicinalextract","metal_container":"metalcontainer","metal_frame":"metalframe","nuclear_waste":"nuclearwaste","optical_lens":"opticallens","optic_fiber":"opticfiber","organic_fertilizer":"organicfertilizer","paint_coating":"paintcoating","plastic_shell":"plasticshell","reinforced_container":"reinforcedcontainer","reinforced_plastic_shell":"reinforcedplasticshell","reinforced_strap":"reinforcedstrap","rubber_gasket":"rubbergasket","sensor_crystal":"sensorcrystal","silver_nectar":"silvernectar","small_antenna":"smallantenna","small_battery":"smallbattery","small_cpu":"smallcpu","small_monitor":"smallmonitor","sweet_syrup":"sweetsyrup","advanced_workbench":"advancedworkbench","big_antenna":"bigantenna","coal_generator":"coalgenerator","cooking_pot":"cookingpot","energy_modulator":"energymodulator","food_grinder":"foodgrinder","food_processor":"foodprocessor","industrial_battery":"industrialbattery","lapidary_machine":"lapidarymachine","nuclear_generator":"nucleargenerator","rock_grinder":"rockgrinder","solar_panel":"solarpanel","woodcutting_machine":"woodcuttingmachine"}'::jsonb;

  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    
    -- 1. Migrate Inventory
    v_inventory := v_save_data -> 'inventory';
    IF v_inventory IS NOT NULL AND jsonb_typeof(v_inventory) = 'object' THEN
      v_new_inventory := '{}'::jsonb;
      FOR v_inv_key, v_inv_val IN SELECT * FROM jsonb_each_text(v_inventory) LOOP
        v_clean_key := v_official_keys ->> v_inv_key;
        IF v_clean_key IS NULL THEN
          v_clean_key := v_inv_key;
        END IF;
        
        -- Si hay colisión de claves, sumar valores
        IF v_new_inventory ->> v_clean_key IS NOT NULL THEN
          v_new_inventory := jsonb_set(v_new_inventory, ARRAY[v_clean_key], to_jsonb((v_new_inventory ->> v_clean_key)::INTEGER + v_inv_val::INTEGER));
        ELSE
          v_new_inventory := jsonb_set(v_new_inventory, ARRAY[v_clean_key], to_jsonb(v_inv_val::INTEGER));
        END IF;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{inventory}', v_new_inventory);
    END IF;

    -- 2. Migrate Team Pokémon heldItems
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

    -- 3. Migrate Box Pokémon heldItems
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

  UPDATE public.profiles SET db_version = 16;
  ALTER TABLE public.profiles ALTER COLUMN db_version SET DEFAULT 16;
END $$;

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260701140000'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
