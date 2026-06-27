-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES A IDS DE SHOWDOWN
-- Fecha: 2026-06-19
-- Descripción: Convierte IDs de especie, habilidades, naturalezas y movimientos de los saves de usuarios a los IDs oficiales de Showdown.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_save_data JSONB;
  v_team JSONB;
  v_box JSONB;
  v_new_team JSONB;
  v_new_box JSONB;
  
  -- Maps
  v_ability_map JSONB;
  v_nature_map JSONB;
  v_move_map JSONB;
  
  -- Loops
  v_poke JSONB;
  v_moves JSONB;
  v_new_moves JSONB;
  v_move JSONB;
  
  -- Keys
  v_poke_id TEXT;
  v_ability TEXT;
  v_nature TEXT;
  v_move_name TEXT;
  v_move_id TEXT;
  v_norm TEXT;
  
  -- Helper norm function
  v_species_map JSONB;
  v_species_key TEXT;
BEGIN
  -- 1. Initialize Mappings (exactly aligned with TS migrator)

  -- Species map: numeric dex ID string → Showdown species ID
  v_species_map := '{
    "1":"bulbasaur","2":"ivysaur","3":"venusaur","4":"charmander","5":"charmeleon","6":"charizard",
    "7":"squirtle","8":"wartortle","9":"blastoise","10":"caterpie","11":"metapod","12":"butterfree",
    "13":"weedle","14":"kakuna","15":"beedrill","16":"pidgey","17":"pidgeotto","18":"pidgeot",
    "19":"rattata","20":"raticate","21":"spearow","22":"fearow","23":"ekans","24":"arbok",
    "25":"pikachu","26":"raichu","27":"sandshrew","28":"sandslash",
    "29":"nidoran_f","30":"nidorina","31":"nidoqueen",
    "32":"nidoran_m","33":"nidorino","34":"nidoking",
    "35":"clefairy","36":"clefable","37":"vulpix","38":"ninetales",
    "39":"jigglypuff","40":"wigglytuff","41":"zubat","42":"golbat",
    "43":"oddish","44":"gloom","45":"vileplume","46":"paras","47":"parasect",
    "48":"venonat","49":"venomoth","50":"diglett","51":"dugtrio",
    "52":"meowth","53":"persian","54":"psyduck","55":"golduck",
    "56":"mankey","57":"primeape","58":"growlithe","59":"arcanine",
    "60":"poliwag","61":"poliwhirl","62":"poliwrath",
    "63":"abra","64":"kadabra","65":"alakazam",
    "66":"machop","67":"machoke","68":"machamp",
    "69":"bellsprout","70":"weepinbell","71":"victreebel",
    "72":"tentacool","73":"tentacruel","74":"geodude","75":"graveler","76":"golem",
    "77":"ponyta","78":"rapidash","79":"slowpoke","80":"slowbro",
    "81":"magnemite","82":"magneton","83":"farfetchd","84":"doduo","85":"dodrio",
    "86":"seel","87":"dewgong","88":"grimer","89":"muk",
    "90":"shellder","91":"cloyster","92":"gastly","93":"haunter","94":"gengar",
    "95":"onix","96":"drowzee","97":"hypno","98":"krabby","99":"kingler",
    "100":"voltorb","101":"electrode","102":"exeggcute","103":"exeggutor",
    "104":"cubone","105":"marowak","106":"hitmonlee","107":"hitmonchan","108":"lickitung",
    "109":"koffing","110":"weezing","111":"rhyhorn","112":"rhydon","113":"chansey",
    "114":"tangela","115":"kangaskhan","116":"horsea","117":"seadra",
    "118":"goldeen","119":"seaking","120":"staryu","121":"starmie",
    "122":"mr_mime","123":"scyther","124":"jynx","125":"electabuzz",
    "126":"magmar","127":"pinsir","128":"tauros","129":"magikarp","130":"gyarados",
    "131":"lapras","132":"ditto","133":"eevee","134":"vaporeon","135":"jolteon","136":"flareon",
    "137":"porygon","138":"omanyte","139":"omastar","140":"kabuto","141":"kabutops",
    "142":"aerodactyl","143":"snorlax","144":"articuno","145":"zapdos","146":"moltres",
    "147":"dratini","148":"dragonair","149":"dragonite","150":"mewtwo","151":"mew",
    "152":"chikorita","153":"bayleef","154":"meganium",
    "155":"cyndaquil","156":"quilava","157":"typhlosion",
    "158":"totodile","159":"croconaw","160":"feraligatr",
    "161":"sentret","162":"furret","163":"hoothoot","164":"noctowl",
    "165":"ledyba","166":"ledian","167":"spinarak","168":"ariados","169":"crobat",
    "170":"chinchou","171":"lanturn","172":"pichu","173":"cleffa","174":"igglybuff",
    "175":"togepi","176":"togetic","177":"natu","178":"xatu",
    "179":"mareep","180":"flaaffy","181":"ampharos","182":"bellossom",
    "183":"marill","184":"azumarill","185":"sudowoodo","186":"politoed",
    "187":"hoppip","188":"skiploom","189":"jumpluff","190":"aipom",
    "191":"sunkern","192":"sunflora","193":"yanma","194":"wooper","195":"quagsire",
    "196":"espeon","197":"umbreon","198":"murkrow","199":"slowking","200":"misdreavus",
    "201":"unown","202":"wobbuffet","203":"girafarig","204":"pineco","205":"forretress",
    "206":"dunsparce","207":"gligar","208":"steelix","209":"snubbull","210":"granbull",
    "211":"qwilfish","212":"scizor","213":"shuckle","214":"heracross","215":"sneasel",
    "216":"teddiursa","217":"ursaring","218":"slugma","219":"magcargo",
    "220":"swinub","221":"piloswine","222":"corsola","223":"remoraid","224":"octillery",
    "225":"delibird","226":"mantine","227":"skarmory",
    "228":"houndour","229":"houndoom","230":"kingdra",
    "231":"phanpy","232":"donphan","233":"porygon2","234":"stantler","235":"smeargle",
    "236":"tyrogue","237":"hitmontop","238":"smoochum","239":"elekid","240":"magby",
    "241":"miltank","242":"blissey","243":"raikou","244":"entei","245":"suicune",
    "246":"larvitar","247":"pupitar","248":"tyranitar","249":"lugia","250":"ho-oh",
    "251":"celebi","351":"castform","823":"corviknight",
    "351_1":"castform-sunny","351_2":"castform-rainy","351_3":"castform-snowy"
  }'::jsonb;

  v_ability_map := '{
    "espesura": "overgrow", "clorofila": "chlorophyll", "marllamas": "blaze", "podersolar": "solarpower",
    "torrente": "torrent", "lluvialigera": "raindish", "vistalince": "keeneye", "alboroto": "soundproof",
    "escape": "runaway", "agallas": "guts", "polvoescudo": "shielddust", "escudopolvo": "shielddust",
    "mudar": "shedskin", "metamorfosis": "shedskin", "electricidadestatica": "static", "pararrayos": "lightningrod",
    "robustez": "sturdy", "nerviosismo": "hustle", "infiltrador": "infiltrator", "humedad": "damp",
    "aclimatacion": "cloudnine", "nadorapido": "swiftswim", "rafaga": "speedboost", "adaptable": "adaptability",
    "curanatural": "naturalcure", "velohumedo": "waterveil", "sebo": "thickfat", "caparazon": "shellarmor",
    "armadurabatalla": "battlearmor", "francotirador": "sniper", "intrepido": "scrappy", "ojocompuesto": "compoundeyes",
    "veloarena": "sandveil", "insonorizar": "soundproof", "intimidacion": "intimidate", "absorbefuego": "flashfire",
    "absorbeagua": "waterabsorb", "efectoespora": "effectspore", "trampaarena": "arenatrap", "recogida": "pickup",
    "espirituvital": "vitalspirit", "sincronia": "synchronize", "cuerpopuro": "clearbody", "despiste": "oblivious",
    "iman": "magnetpull", "fuga": "runaway", "correcaminos": "runaway", "hedor": "stench", "levitacion": "levitate",
    "cabezaroca": "rockhead", "insomnio": "insomnia", "cortefuerte": "hypercutter", "flexibilidad": "limber",
    "escurridizo": "limber", "madrugar": "earlybird", "enjambre": "swarm", "cuerpollama": "flamebody",
    "rastro": "trace", "inmunidad": "immunity", "presion": "pressure", "puntotoxico": "poisonpoint",
    "descarga": "download", "experto": "technician", "absorbevoltio": "voltabsorb", "focointerno": "innerfocus",
    "rivalidad": "rivalry", "muromagico": "magicguard", "prediccion": "forecast", "granencanto": "cutecharm",
    "damp": "damp", "illuminate": "illuminate", "entusiasmo": "hustle"
  }'::jsonb;

  v_nature_map := '{
    "activa": "active", "activo": "active", "hurana": "lonely", "hurano": "lonely",
    "audaz": "brave", "firme": "adamant", "picara": "naughty", "picaro": "naughty",
    "osada": "bold", "osado": "bold", "docil": "docile", "placida": "relaxed",
    "placido": "relaxed", "agitada": "impish", "agitado": "impish", "floja": "lax",
    "flojo": "lax", "timida": "timid", "timido": "timid", "afable": "mild",
    "tasa": "quiet", "seria": "serious", "serio": "serious", "alegre": "jolly",
    "ingenua": "naive", "ingenuo": "naive", "modesta": "modest", "modesto": "modest",
    "raro": "serious", "rara": "quirky", "serena": "calm", "sereno": "calm",
    "amable": "gentle", "grosera": "sassy", "grosero": "sassy", "cauta": "careful",
    "cauto": "careful", "quirky": "quirky", "manso": "quiet", "alocada": "rash",
    "alocado": "rash", "moderado": "serious", "jovial": "jolly", "tranquilo": "calm"
  }'::jsonb;

  v_move_map := '{
    "destructor": "pound", "arena": "sandattack", "portazo": "slam", "acidificacion": "acidarmor",
    "bubblebeam": "bubblebeam", "rodar": "rollout", "huesumerang": "bonemerang", "golpecabeza": "headbutt",
    "picotazo": "peck", "persecucion": "pursuit", "cola": "tailwhip", "chupavidas": "leechlife",
    "envolver": "wrap", "golpekaratazo": "karatechop", "movsismico": "seismictoss", "punolodo": "mudslap",
    "megapuno": "megapunch", "minimizar": "minimize", "pantallahumo": "smokescreen", "huesorus": "bonerush",
    "cuerpopesado": "heavyslam", "cuerpo_pesado": "heavyslam", "picoteo": "pluck", "desenrrollar": "rollout",
    "prevision": "foresight", "punetazo": "pound", "psicocontrol": "psychup", "seguimiento": "pursuit",
    "francotirador": "sniper",
    "placaje": "tackle", "ataquerapido": "quickattack", "hiperrayo": "hyperbeam", "doblefilo": "doubleedge",
    "explosion": "explosion", "autodestruccion": "selfdestruct", "hipercolmillo": "hyperfang", "mordisco": "bite",
    "cuchillada": "slash", "bofetonlodo": "mudslap", "doblebofeton": "doubleslap", "pisoton": "stomp",
    "doblepatada": "doublekick", "atizar": "slam", "golpecuerpo": "bodyslam", "retribucion": "return",
    "enfado": "outrage", "derribo": "takedown", "golpe": "thrash", "punolodo_mudpunch": "mudpunch",
    "patadaignea": "blazekick", "patadasaltoalta": "highjumpkick", "patadasalto": "jumpkick",
    "pajaroosado": "bravebird", "cabezazo": "headbutt", "engullir": "swallow", "punocometa": "cometpunch",
    "bombahuevo": "eggbomb", "uproar": "uproar", "triturar": "crunch", "grunido": "growl",
    "dulcearoma": "sweetscent", "ataquefuria": "furyattack", "esfuerzo": "endeavor", "espejo": "mirrormove",
    "paralizador": "stunspore", "disparodemora": "stringshot", "buclearena": "sandtomb", "golpesfuria": "furyswipes",
    "colmilloveneno": "poisonfang", "punometeoro": "meteormash", "fuegofatuo": "willowisp", "vozarron": "hypervoice",
    "niebla": "haze", "impresionar": "astonish", "danzapetalo": "petaldance", "aromaterapia": "aromatherapy",
    "megacuerno": "megahorn", "latigo": "tailwhip", "fortaleza": "harden", "defensaferrea": "irondefense",
    "agilidad": "agility", "desarrollo": "growth", "danzaespada": "swordsdance", "amnesia": "amnesia",
    "rugido": "roar", "canto": "sing", "somnifera": "sleeppowder", "supersonico": "supersonic",
    "salpicadura": "splash", "furia": "rage", "malicioso": "leer", "chirrido": "screech",
    "diadepago": "payday", "finta": "feintattack", "venganza": "bide", "contoneo": "swagger",
    "tajocruzado": "crosschop", "rastreo": "odorsleuth", "ruedafuego": "flamewheel", "tambor": "bellydrum",
    "premonicion": "futuresight", "kinetico": "kinesis", "truco": "trick", "tirovital": "vitalthrow",
    "velocidadextrema": "extremespeed", "fisura": "fissure", "metronomo": "metronome", "sorpresa": "fakeout",
    "electrocanon": "zapcannon", "tormentaarena": "sandstorm", "relevo": "batonpass", "llantopanto": "faketears",
    "cantomortal": "perishsong", "friopolar": "sheercold", "ondasonica": "sonicboom", "fijarblanco": "lockon",
    "ecometalico": "metalsound", "cortefuria": "furycutter", "falsotortazo": "falseswipe", "vientohielo": "icywind",
    "armaduraacida": "acidarmor", "rencor": "spite", "maldeojo": "meanlook", "punosombra": "shadowpunch",
    "arraigo": "ingrain", "cosquillas": "tickle", "punomareo": "dizzypunch", "aguante": "endure",
    "ciclon": "twister", "danzadragon": "dragondance", "cascada": "waterfall", "girorapido": "rapidspin",
    "reciclaje": "recycle", "disparolodo": "mudshot", "amortiguador": "softboiled", "bostezo": "yawn",
    "anulacion": "disable", "otravez": "encore", "focoenergia": "focusenergy", "refuerzo": "helpinghand",
    "conversion2": "conversion2", "conversion": "conversion", "electrorrayo": "electrorrayo", "sonambulo": "sleeptalk",
    "bloqueo": "block", "deteccion": "detect", "ondaignea": "heatwave", "ataqueaereo": "skyattack",
    "maspsique": "psychup", "rapidez": "swift", "camuflaje": "camouflage", "masacosmica": "cosmicpower",
    "aranazo": "scratch", "garrametal": "metalclaw", "pantallahumo": "smokescreen", "furiadragon": "dragonrage",
    "carasusto": "scaryface", "ataqueala": "wingattack", "remolino": "whirlwind", "supercolmillo": "superfang",
    "acido": "acid", "rizodefensa": "defensecurl", "cornada": "hornattack", "perforador": "horndrill",
    "descanso": "rest", "aireafilado": "aircutter", "magnitud": "magnitude", "triataque": "triattack",
    "patadabaja": "lowkick", "constriccion": "constrict", "maldicion": "curse", "tenaza": "clamp",
    "residuos": "sludge", "puas": "spikes", "clavocanon": "spikecannon", "carga": "charge",
    "chispa": "spark", "mantoespejo": "mirrorcoat", "bombardeo": "barrage", "huesopalo": "boneclub"
  }'::jsonb;

  -- 2. Process game_saves
  FOR r IN SELECT user_id, save_data FROM public.game_saves LOOP
    v_save_data := r.save_data;
    v_team := v_save_data -> 'team';
    v_box := v_save_data -> 'box';

    -- A. Process Team
    IF v_team IS NOT NULL AND jsonb_typeof(v_team) = 'array' THEN
      v_new_team := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_team) LOOP
        -- Set species (Showdown ID)
        v_poke_id := v_poke ->> 'id';
        IF v_poke_id IS NOT NULL THEN
          -- Intentar mapear primero con v_species_map
          v_species_key := regexp_replace(lower(v_poke_id), '[^a-z0-9_]', '', 'g');
          IF v_species_map ->> v_species_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{species}', to_jsonb(v_species_map ->> v_species_key));
          ELSE
            v_poke := jsonb_set(v_poke, '{species}', to_jsonb(regexp_replace(lower(v_poke_id), '[^a-z0-9]', '', 'g')));
          END IF;
        END IF;

        -- Normalize Ability
        v_ability := v_poke ->> 'ability';
        IF v_ability IS NOT NULL THEN
          v_norm := regexp_replace(lower(v_ability), '[^a-z0-9]', '', 'g');
          IF v_ability_map ->> v_norm IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{ability}', to_jsonb(v_ability_map ->> v_norm));
          ELSE
            v_poke := jsonb_set(v_poke, '{ability}', to_jsonb(v_norm));
          END IF;
        END IF;

        -- Normalize Nature
        v_nature := v_poke ->> 'nature';
        IF v_nature IS NOT NULL THEN
          v_norm := regexp_replace(lower(v_nature), '[^a-z0-9]', '', 'g');
          IF v_nature_map ->> v_norm IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_nature_map ->> v_norm));
          ELSE
            v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_norm));
          END IF;
        END IF;

        -- Normalize Moves
        v_moves := v_poke -> 'moves';
        IF v_moves IS NOT NULL AND jsonb_typeof(v_moves) = 'array' THEN
          v_new_moves := '[]'::jsonb;
          FOR v_move IN SELECT * FROM jsonb_array_elements(v_moves) LOOP
            v_move_name := v_move ->> 'name';
            v_move_id := v_move ->> 'id';
            
            v_norm := regexp_replace(lower(coalesce(v_move_name, v_move_id, '')), '[^a-z0-9]', '', 'g');
            IF v_move_map ->> v_norm IS NOT NULL THEN
              v_move := jsonb_set(v_move, '{id}', to_jsonb(v_move_map ->> v_norm));
            ELSE
              v_move := jsonb_set(v_move, '{id}', to_jsonb(v_norm));
            END IF;
            
            v_new_moves := v_new_moves || v_move;
          END LOOP;
          v_poke := jsonb_set(v_poke, '{moves}', v_new_moves);
        END IF;

        v_new_team := v_new_team || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{team}', v_new_team);
    END IF;

    -- B. Process Box
    IF v_box IS NOT NULL AND jsonb_typeof(v_box) = 'array' THEN
      v_new_box := '[]'::jsonb;
      FOR v_poke IN SELECT * FROM jsonb_array_elements(v_box) LOOP
        -- Set species (Showdown ID)
        v_poke_id := v_poke ->> 'id';
        IF v_poke_id IS NOT NULL THEN
          -- Intentar mapear primero con v_species_map
          v_species_key := regexp_replace(lower(v_poke_id), '[^a-z0-9_]', '', 'g');
          IF v_species_map ->> v_species_key IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{species}', to_jsonb(v_species_map ->> v_species_key));
          ELSE
            v_poke := jsonb_set(v_poke, '{species}', to_jsonb(regexp_replace(lower(v_poke_id), '[^a-z0-9]', '', 'g')));
          END IF;
        END IF;

        -- Normalize Ability
        v_ability := v_poke ->> 'ability';
        IF v_ability IS NOT NULL THEN
          v_norm := regexp_replace(lower(v_ability), '[^a-z0-9]', '', 'g');
          IF v_ability_map ->> v_norm IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{ability}', to_jsonb(v_ability_map ->> v_norm));
          ELSE
            v_poke := jsonb_set(v_poke, '{ability}', to_jsonb(v_norm));
          END IF;
        END IF;

        -- Normalize Nature
        v_nature := v_poke ->> 'nature';
        IF v_nature IS NOT NULL THEN
          v_norm := regexp_replace(lower(v_nature), '[^a-z0-9]', '', 'g');
          IF v_nature_map ->> v_norm IS NOT NULL THEN
            v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_nature_map ->> v_norm));
          ELSE
            v_poke := jsonb_set(v_poke, '{nature}', to_jsonb(v_norm));
          END IF;
        END IF;

        -- Normalize Moves
        v_moves := v_poke -> 'moves';
        IF v_moves IS NOT NULL AND jsonb_typeof(v_moves) = 'array' THEN
          v_new_moves := '[]'::jsonb;
          FOR v_move IN SELECT * FROM jsonb_array_elements(v_moves) LOOP
            v_move_name := v_move ->> 'name';
            v_move_id := v_move ->> 'id';
            
            v_norm := regexp_replace(lower(coalesce(v_move_name, v_move_id, '')), '[^a-z0-9]', '', 'g');
            IF v_move_map ->> v_norm IS NOT NULL THEN
              v_move := jsonb_set(v_move, '{id}', to_jsonb(v_move_map ->> v_norm));
            ELSE
              v_move := jsonb_set(v_move, '{id}', to_jsonb(v_norm));
            END IF;
            
            v_new_moves := v_new_moves || v_move;
          END LOOP;
          v_poke := jsonb_set(v_poke, '{moves}', v_new_moves);
        END IF;

        v_new_box := v_new_box || v_poke;
      END LOOP;
      v_save_data := jsonb_set(v_save_data, '{box}', v_new_box);
    END IF;

    -- C. Write back to database
    UPDATE public.game_saves
    SET save_data = v_save_data
    WHERE user_id = r.user_id;
  END LOOP;

  -- 3. Update system_config db_version
  INSERT INTO public.system_config (key, value) 
  VALUES ('db_version', '20260619202000'::jsonb) 
  ON CONFLICT (key) 
  DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

END $$;
