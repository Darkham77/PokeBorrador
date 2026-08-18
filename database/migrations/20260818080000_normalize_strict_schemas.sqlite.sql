-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: NORMALIZACIÓN ESTÁTICA DE ESQUEMAS (SQLite)
-- Fecha: 2026-08-18
-- Descripción: Normaliza y asigna estáticamente valores por defecto canónicos
--              a todas las partidas guardadas en game_saves (inventario, team,
--              box, huevos, estadísticas y campos estructurales) para que el
--              esquema de Valibot sea 100% estricto sin usar 'optional()' indebidos.
-- =====================================================

-- 1. Normalizar estructura raíz de SaveData
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.gender', coalesce(json_extract(save_data, '$.gender'), 'h'),
  '$.badges', coalesce(json_extract(save_data, '$.badges'), 0),
  '$.balls', coalesce(json_extract(save_data, '$.balls'), 0),
  '$.money', coalesce(json_extract(save_data, '$.money'), 0),
  '$.battleCoins', coalesce(json_extract(save_data, '$.battleCoins'), 0),
  '$.trainerLevel', coalesce(json_extract(save_data, '$.trainerLevel'), 1),
  '$.trainerExp', coalesce(json_extract(save_data, '$.trainerExp'), 0),
  '$.trainerExpNeeded', coalesce(json_extract(save_data, '$.trainerExpNeeded'), 100),
  '$.inventory', coalesce(json_extract(save_data, '$.inventory'), json('{}')),
  '$.team', coalesce(json_extract(save_data, '$.team'), json('[]')),
  '$.box', coalesce(json_extract(save_data, '$.box'), json('[]')),
  '$.eggs', coalesce(json_extract(save_data, '$.eggs'), json('[]')),
  '$.pokedex', coalesce(json_extract(save_data, '$.pokedex'), json('[]')),
  '$.seenPokedex', coalesce(json_extract(save_data, '$.seenPokedex'), json('[]')),
  '$.defeatedGyms', coalesce(json_extract(save_data, '$.defeatedGyms'), json('[]')),
  '$.gymProgress', coalesce(json_extract(save_data, '$.gymProgress'), json('{}')),
  '$.lastGymWins', coalesce(json_extract(save_data, '$.lastGymWins'), json('{}')),
  '$.lastGymAttempts', coalesce(json_extract(save_data, '$.lastGymAttempts'), json('{}')),
  '$.starterChosen', CASE WHEN coalesce(json_extract(save_data, '$.starterChosen'), 0) IN (1, 'true', true) THEN json('true') ELSE json('false') END,
  '$.stats', coalesce(json_extract(save_data, '$.stats'), json('{}')),
  '$.eloRating', coalesce(json_extract(save_data, '$.eloRating'), 1000),
  '$.pvpStats', coalesce(json_extract(save_data, '$.pvpStats'), json('{"wins": 0, "losses": 0, "draws": 0}')),
  '$.rankedMaxElo', coalesce(json_extract(save_data, '$.rankedMaxElo'), 1000),
  '$.rankedRewardsClaimed', coalesce(json_extract(save_data, '$.rankedRewardsClaimed'), json('[]')),
  '$.passiveTeamUids', coalesce(json_extract(save_data, '$.passiveTeamUids'), json('[]')),
  '$.passiveTeamActive', CASE WHEN coalesce(json_extract(save_data, '$.passiveTeamActive'), 0) IN (1, 'true', true) THEN json('true') ELSE json('false') END,
  '$.daycare_missions', coalesce(json_extract(save_data, '$.daycare_missions'), json('[]')),
  '$.daycare_mission_refreshes', coalesce(json_extract(save_data, '$.daycare_mission_refreshes'), 3),
  '$.boxCount', coalesce(json_extract(save_data, '$.boxCount'), 4),
  '$.chats', coalesce(json_extract(save_data, '$.chats'), json('{}')),
  '$.classLevel', coalesce(json_extract(save_data, '$.classLevel'), 1),
  '$.classXP', coalesce(json_extract(save_data, '$.classXP'), 0),
  '$.classData', json_set(
    coalesce(json_extract(save_data, '$.classData'), json('{}')),
    '$.captureStreak', coalesce(json_extract(save_data, '$.classData.captureStreak'), 0),
    '$.longestStreak', coalesce(json_extract(save_data, '$.classData.longestStreak'), 0),
    '$.reputation', coalesce(json_extract(save_data, '$.classData.reputation'), 0),
    '$.blackMarketSales', coalesce(json_extract(save_data, '$.classData.blackMarketSales'), 0),
    '$.criminality', coalesce(json_extract(save_data, '$.classData.criminality'), 0),
    '$.kitCaptures', coalesce(json_extract(save_data, '$.classData.kitCaptures'), 0)
  ),
  '$.warCoins', coalesce(json_extract(save_data, '$.warCoins'), 0),
  '$.warCoinsSpent', coalesce(json_extract(save_data, '$.warCoinsSpent'), 0),
  '$.notificationHistory', coalesce(json_extract(save_data, '$.notificationHistory'), json('[]')),
  '$.marketSoldSeenIds', coalesce(json_extract(save_data, '$.marketSoldSeenIds'), json('[]')),
  '$.lastPokemonCenterHeal', coalesce(json_extract(save_data, '$.lastPokemonCenterHeal'), 0),
  '$.playtime', coalesce(json_extract(save_data, '$.playtime'), 0)
)
WHERE save_data IS NOT NULL;

-- 2. Normalizar Pokémon en Team
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  json(
    (
      SELECT json_group_array(
        json_set(
          team_item.value,
          '$.uid', coalesce(json_extract(team_item.value, '$.uid'), 'migrated_' || hex(randomblob(8))),
          '$.species', coalesce(json_extract(team_item.value, '$.species'), json_extract(team_item.value, '$.id')),
          '$.isShiny', CASE WHEN coalesce(json_extract(team_item.value, '$.isShiny'), 0) IN (1, 'true', true) THEN json('true') ELSE json('false') END,
          '$.expNeeded', coalesce(json_extract(team_item.value, '$.expNeeded'), 100),
          '$.status', CASE 
            WHEN lower(coalesce(json_extract(team_item.value, '$.status'), '')) IN ('sleep', 'slp') THEN 'slp'
            WHEN lower(coalesce(json_extract(team_item.value, '$.status'), '')) IN ('poison', 'psn') THEN 'psn'
            WHEN lower(coalesce(json_extract(team_item.value, '$.status'), '')) IN ('burn', 'brn') THEN 'brn'
            WHEN lower(coalesce(json_extract(team_item.value, '$.status'), '')) IN ('paralysis', 'par') THEN 'par'
            WHEN lower(coalesce(json_extract(team_item.value, '$.status'), '')) IN ('freeze', 'frz') THEN 'frz'
            WHEN lower(coalesce(json_extract(team_item.value, '$.status'), '')) IN ('tox', 'toxic') THEN 'tox'
            ELSE ''
          END,
          '$.ivs', coalesce(json_extract(team_item.value, '$.ivs'), json('{"hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0}')),
          '$.evs', coalesce(json_extract(team_item.value, '$.evs'), json('{"hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0}')),
          '$.friendship', coalesce(json_extract(team_item.value, '$.friendship'), 70),
          '$.nature', coalesce(json_extract(team_item.value, '$.nature'), 'hardy')
        )
      )
      FROM json_each(json_extract(game_saves.save_data, '$.team')) team_item
      WHERE team_item.value IS NOT NULL AND json_type(team_item.value) = 'object'
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.team') IS NOT NULL;

-- 3. Normalizar Pokémon en Box
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.box',
  json(
    (
      SELECT json_group_array(
        CASE 
          WHEN box_item.value IS NULL OR json_type(box_item.value) = 'null' THEN NULL
          ELSE json_set(
            box_item.value,
            '$.uid', coalesce(json_extract(box_item.value, '$.uid'), 'migrated_' || hex(randomblob(8))),
            '$.species', coalesce(json_extract(box_item.value, '$.species'), json_extract(box_item.value, '$.id')),
            '$.isShiny', CASE WHEN coalesce(json_extract(box_item.value, '$.isShiny'), 0) IN (1, 'true', true) THEN json('true') ELSE json('false') END,
            '$.expNeeded', coalesce(json_extract(box_item.value, '$.expNeeded'), 100),
            '$.status', CASE 
              WHEN lower(coalesce(json_extract(box_item.value, '$.status'), '')) IN ('sleep', 'slp') THEN 'slp'
              WHEN lower(coalesce(json_extract(box_item.value, '$.status'), '')) IN ('poison', 'psn') THEN 'psn'
              WHEN lower(coalesce(json_extract(box_item.value, '$.status'), '')) IN ('burn', 'brn') THEN 'brn'
              WHEN lower(coalesce(json_extract(box_item.value, '$.status'), '')) IN ('paralysis', 'par') THEN 'par'
              WHEN lower(coalesce(json_extract(box_item.value, '$.status'), '')) IN ('freeze', 'frz') THEN 'frz'
              WHEN lower(coalesce(json_extract(box_item.value, '$.status'), '')) IN ('tox', 'toxic') THEN 'tox'
              ELSE ''
            END,
            '$.ivs', coalesce(json_extract(box_item.value, '$.ivs'), json('{"hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0}')),
            '$.evs', coalesce(json_extract(box_item.value, '$.evs'), json('{"hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0}')),
            '$.friendship', coalesce(json_extract(box_item.value, '$.friendship'), 70),
            '$.nature', coalesce(json_extract(box_item.value, '$.nature'), 'hardy')
          )
        END
      )
      FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.box') IS NOT NULL;

-- 4. Normalizar Huevos (eggs)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.eggs',
  json(
    (
      SELECT json_group_array(
        json_set(
          egg_item.value,
          '$.uid', coalesce(json_extract(egg_item.value, '$.uid'), 'egg_' || hex(randomblob(8))),
          '$.id', coalesce(CAST(json_extract(egg_item.value, '$.id') AS TEXT), 'egg_' || hex(randomblob(4))),
          '$.steps', coalesce(json_extract(egg_item.value, '$.steps'), 0),
          '$.ready', CASE WHEN coalesce(json_extract(egg_item.value, '$.ready'), 0) IN (1, 'true', true) THEN json('true') ELSE json('false') END
        )
      )
      FROM json_each(json_extract(game_saves.save_data, '$.eggs')) egg_item
      WHERE egg_item.value IS NOT NULL AND json_type(egg_item.value) = 'object'
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.eggs') IS NOT NULL;
