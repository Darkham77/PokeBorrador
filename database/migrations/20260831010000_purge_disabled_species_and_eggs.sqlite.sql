-- =====================================================
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
    WHERE coalesce(nullif(json_extract(egg_item.value, '$.id'), ''), nullif(json_extract(egg_item.value, '$.pokemonId'), ''), nullif(json_extract(egg_item.value, '$.species'), '')) IN ('bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise','caterpie','metapod','butterfree','weedle','kakuna','beedrill','pidgey','pidgeotto','pidgeot','rattata','raticate','spearow','fearow','ekans','arbok','pikachu','raichu','sandshrew','sandslash','nidoranf','nidorina','nidoqueen','nidoranm','nidorino','nidoking','clefairy','clefable','vulpix','ninetales','jigglypuff','wigglytuff','zubat','golbat','oddish','gloom','vileplume','paras','parasect','venonat','venomoth','diglett','dugtrio','meowth','persian','psyduck','golduck','mankey','primeape','growlithe','arcanine','poliwag','poliwhirl','poliwrath','abra','kadabra','alakazam','machop','machoke','machamp','bellsprout','weepinbell','victreebel','tentacool','tentacruel','geodude','graveler','golem','ponyta','rapidash','slowpoke','slowbro','magnemite','magneton','farfetchd','doduo','dodrio','seel','dewgong','grimer','muk','shellder','cloyster','gastly','haunter','gengar','onix','drowzee','hypno','krabby','kingler','voltorb','electrode','exeggcute','exeggutor','cubone','marowak','hitmonlee','hitmonchan','lickitung','koffing','weezing','rhyhorn','rhydon','chansey','tangela','kangaskhan','horsea','seadra','goldeen','seaking','staryu','starmie','mrmime','scyther','jynx','electabuzz','magmar','pinsir','tauros','magikarp','gyarados','lapras','ditto','eevee','vaporeon','jolteon','flareon','porygon','omanyte','omastar','kabuto','kabutops','aerodactyl','snorlax','articuno','zapdos','moltres','dratini','dragonair','dragonite','mewtwo','mew','pichu','cleffa','igglybuff','togepi','tyrogue','smoochum','elekid','magby','castform','castform-sunny','castform-rainy','castform-snowy')
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
    WHERE box_item.value IS NOT NULL AND json_extract(box_item.value, '$.id') IN ('bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise','caterpie','metapod','butterfree','weedle','kakuna','beedrill','pidgey','pidgeotto','pidgeot','rattata','raticate','spearow','fearow','ekans','arbok','pikachu','raichu','sandshrew','sandslash','nidoranf','nidorina','nidoqueen','nidoranm','nidorino','nidoking','clefairy','clefable','vulpix','ninetales','jigglypuff','wigglytuff','zubat','golbat','oddish','gloom','vileplume','paras','parasect','venonat','venomoth','diglett','dugtrio','meowth','persian','psyduck','golduck','mankey','primeape','growlithe','arcanine','poliwag','poliwhirl','poliwrath','abra','kadabra','alakazam','machop','machoke','machamp','bellsprout','weepinbell','victreebel','tentacool','tentacruel','geodude','graveler','golem','ponyta','rapidash','slowpoke','slowbro','magnemite','magneton','farfetchd','doduo','dodrio','seel','dewgong','grimer','muk','shellder','cloyster','gastly','haunter','gengar','onix','drowzee','hypno','krabby','kingler','voltorb','electrode','exeggcute','exeggutor','cubone','marowak','hitmonlee','hitmonchan','lickitung','koffing','weezing','rhyhorn','rhydon','chansey','tangela','kangaskhan','horsea','seadra','goldeen','seaking','staryu','starmie','mrmime','scyther','jynx','electabuzz','magmar','pinsir','tauros','magikarp','gyarados','lapras','ditto','eevee','vaporeon','jolteon','flareon','porygon','omanyte','omastar','kabuto','kabutops','aerodactyl','snorlax','articuno','zapdos','moltres','dratini','dragonair','dragonite','mewtwo','mew','pichu','cleffa','igglybuff','togepi','tyrogue','smoochum','elekid','magby','castform','castform-sunny','castform-rainy','castform-snowy')
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
    WHERE team_item.value IS NOT NULL AND json_extract(team_item.value, '$.id') IN ('bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise','caterpie','metapod','butterfree','weedle','kakuna','beedrill','pidgey','pidgeotto','pidgeot','rattata','raticate','spearow','fearow','ekans','arbok','pikachu','raichu','sandshrew','sandslash','nidoranf','nidorina','nidoqueen','nidoranm','nidorino','nidoking','clefairy','clefable','vulpix','ninetales','jigglypuff','wigglytuff','zubat','golbat','oddish','gloom','vileplume','paras','parasect','venonat','venomoth','diglett','dugtrio','meowth','persian','psyduck','golduck','mankey','primeape','growlithe','arcanine','poliwag','poliwhirl','poliwrath','abra','kadabra','alakazam','machop','machoke','machamp','bellsprout','weepinbell','victreebel','tentacool','tentacruel','geodude','graveler','golem','ponyta','rapidash','slowpoke','slowbro','magnemite','magneton','farfetchd','doduo','dodrio','seel','dewgong','grimer','muk','shellder','cloyster','gastly','haunter','gengar','onix','drowzee','hypno','krabby','kingler','voltorb','electrode','exeggcute','exeggutor','cubone','marowak','hitmonlee','hitmonchan','lickitung','koffing','weezing','rhyhorn','rhydon','chansey','tangela','kangaskhan','horsea','seadra','goldeen','seaking','staryu','starmie','mrmime','scyther','jynx','electabuzz','magmar','pinsir','tauros','magikarp','gyarados','lapras','ditto','eevee','vaporeon','jolteon','flareon','porygon','omanyte','omastar','kabuto','kabutops','aerodactyl','snorlax','articuno','zapdos','moltres','dratini','dragonair','dragonite','mewtwo','mew','pichu','cleffa','igglybuff','togepi','tyrogue','smoochum','elekid','magby','castform','castform-sunny','castform-rainy','castform-snowy')
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
    WHERE wh_item.value IS NOT NULL AND coalesce(nullif(json_extract(wh_item.value, '$.species'), ''), nullif(json_extract(wh_item.value, '$.id'), '')) IN ('bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise','caterpie','metapod','butterfree','weedle','kakuna','beedrill','pidgey','pidgeotto','pidgeot','rattata','raticate','spearow','fearow','ekans','arbok','pikachu','raichu','sandshrew','sandslash','nidoranf','nidorina','nidoqueen','nidoranm','nidorino','nidoking','clefairy','clefable','vulpix','ninetales','jigglypuff','wigglytuff','zubat','golbat','oddish','gloom','vileplume','paras','parasect','venonat','venomoth','diglett','dugtrio','meowth','persian','psyduck','golduck','mankey','primeape','growlithe','arcanine','poliwag','poliwhirl','poliwrath','abra','kadabra','alakazam','machop','machoke','machamp','bellsprout','weepinbell','victreebel','tentacool','tentacruel','geodude','graveler','golem','ponyta','rapidash','slowpoke','slowbro','magnemite','magneton','farfetchd','doduo','dodrio','seel','dewgong','grimer','muk','shellder','cloyster','gastly','haunter','gengar','onix','drowzee','hypno','krabby','kingler','voltorb','electrode','exeggcute','exeggutor','cubone','marowak','hitmonlee','hitmonchan','lickitung','koffing','weezing','rhyhorn','rhydon','chansey','tangela','kangaskhan','horsea','seadra','goldeen','seaking','staryu','starmie','mrmime','scyther','jynx','electabuzz','magmar','pinsir','tauros','magikarp','gyarados','lapras','ditto','eevee','vaporeon','jolteon','flareon','porygon','omanyte','omastar','kabuto','kabutops','aerodactyl','snorlax','articuno','zapdos','moltres','dratini','dragonair','dragonite','mewtwo','mew','pichu','cleffa','igglybuff','togepi','tyrogue','smoochum','elekid','magby','castform','castform-sunny','castform-rainy','castform-snowy')
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
