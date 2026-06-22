-- SQLite Companion Migration: 20260622000200_fix_accented_spanish_move_ids
-- Description: Converts accented and ñ-containing Spanish move IDs in local sqlite save_data to Showdown compatibility.

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  (
    SELECT json_group_array(
      json_set(
        team_item.value,
        '$.moves',
        (
          SELECT json_group_array(
            json_set(
              mv.value,
              '$.id',
              coalesce(
                json_extract(
                  '{"gruñido":"growl","grunido":"growl","arañazo":"scratch","aranazo":"scratch","maldición":"curse","maldicion":"curse","látigo":"tailwhip","latigo":"tailwhip","defensaférrea":"irondefense","defensaferrea":"irondefense","supersónico":"supersonic","supersonico":"supersonic","díadepago":"payday","diadepago":"payday","premonición":"futuresight","premonicion":"futuresight","cinético":"kinesis","kinetico":"kinesis","kinético":"kinesis","fríopolar":"sheercold","friopolar":"sheercold","ondasónica":"sonicboom","ondasonica":"sonicboom","puñosombra":"shadowpunch","punosombra":"shadowpunch","anulación":"disable","anulacion":"disable","focoenergía":"focusenergy","focoenergia":"focusenergy","sonámbulo":"sleeptalk","sonambulo":"sleeptalk","detección":"detect","deteccion":"detect","ataqueaéreo":"skyattack","ataqueaereo":"skyattack","furiadragón":"dragonrage","furiadragon":"dragonrage","constricción":"constrict","constriccion":"constrict","clavocañón":"spikecannon","clavocanon":"spikecannon","metrónomo":"metronome","metronomo":"metronome","atracción":"attract","atraccion":"attract","autodestrucción":"selfdestruct","autodestruccion":"selfdestruct","bofetónlodo":"mudslap","bofetonlodo":"mudslap","doblebofetón":"doubleslap","doblebofeton":"doubleslap","pisotón":"stomp","pisoton":"stomp","patadaígnea":"blazekick","patadaignea":"blazekick","puñocometa":"cometpunch","punocometa":"cometpunch","puñometeoro":"meteormash","punometeoro":"meteormash","danzapétalo":"petaldance","danzapetalo":"petaldance","somnífera":"sleeppowder","somnifera":"sleeppowder","ecometálico":"metalsound","ecometalico":"metalsound","armaduraácida":"acidarmor","armaduraacida":"acidarmor","puñomareo":"dizzypunch","punomareo":"dizzypunch","danzadragón":"dragondance","danzadragon":"dragondance","ondaígnea":"heatwave","ondaignea":"heatwave","máspsique":"psychup","maspsique":"psychup","masacósmica":"cosmicpower","masacosmica":"cosmicpower","protección":"protect","proteccion":"protect","sustitución":"substitute","sustitucion":"substitute","tóxico":"toxic","toxico":"toxic","reducción":"minimize","reduccion":"minimize","repetición":"wrap","repeticion":"wrap"}',
                  '$.' || lower(replace(replace(coalesce(json_extract(mv.value, '$.id'), json_extract(mv.value, '$.name'), ''), ' ', ''), '_', ''))
                ),
                json_extract(mv.value, '$.id')
              )
            )
          )
          FROM json_each(json_extract(team_item.value, '$.moves')) mv
        )
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.team')) team_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.team') IS NOT NULL;

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.box',
  (
    SELECT json_group_array(
      json_set(
        box_item.value,
        '$.moves',
        (
          SELECT json_group_array(
            json_set(
              mv.value,
              '$.id',
              coalesce(
                json_extract(
                  '{"gruñido":"growl","grunido":"growl","arañazo":"scratch","aranazo":"scratch","maldición":"curse","maldicion":"curse","látigo":"tailwhip","latigo":"tailwhip","defensaférrea":"irondefense","defensaferrea":"irondefense","supersónico":"supersonic","supersonico":"supersonic","díadepago":"payday","diadepago":"payday","premonición":"futuresight","premonicion":"futuresight","cinético":"kinesis","kinetico":"kinesis","kinético":"kinesis","fríopolar":"sheercold","friopolar":"sheercold","ondasónica":"sonicboom","ondasonica":"sonicboom","puñosombra":"shadowpunch","punosombra":"shadowpunch","anulación":"disable","anulacion":"disable","focoenergía":"focusenergy","focoenergia":"focusenergy","sonámbulo":"sleeptalk","sonambulo":"sleeptalk","detección":"detect","deteccion":"detect","ataqueaéreo":"skyattack","ataqueaereo":"skyattack","furiadragón":"dragonrage","furiadragon":"dragonrage","constricción":"constrict","constriccion":"constrict","clavocañón":"spikecannon","clavocanon":"spikecannon","metrónomo":"metronome","metronomo":"metronome","atracción":"attract","atraccion":"attract","autodestrucción":"selfdestruct","autodestruccion":"selfdestruct","bofetónlodo":"mudslap","bofetonlodo":"mudslap","doblebofetón":"doubleslap","doblebofeton":"doubleslap","pisotón":"stomp","pisoton":"stomp","patadaígnea":"blazekick","patadaignea":"blazekick","puñocometa":"cometpunch","punocometa":"cometpunch","puñometeoro":"meteormash","punometeoro":"meteormash","danzapétalo":"petaldance","danzapetalo":"petaldance","somnífera":"sleeppowder","somnifera":"sleeppowder","ecometálico":"metalsound","ecometalico":"metalsound","armaduraácida":"acidarmor","armaduraacida":"acidarmor","puñomareo":"dizzypunch","punomareo":"dizzypunch","danzadragón":"dragondance","danzadragon":"dragondance","ondaígnea":"heatwave","ondaignea":"heatwave","máspsique":"psychup","maspsique":"psychup","masacósmica":"cosmicpower","masacosmica":"cosmicpower","protección":"protect","proteccion":"protect","sustitución":"substitute","sustitucion":"substitute","tóxico":"toxic","toxico":"toxic","reducción":"minimize","reduccion":"minimize","repetición":"wrap","repeticion":"wrap"}',
                  '$.' || lower(replace(replace(coalesce(json_extract(mv.value, '$.id'), json_extract(mv.value, '$.name'), ''), ' ', ''), '_', ''))
                ),
                json_extract(mv.value, '$.id')
              )
            )
          )
          FROM json_each(json_extract(box_item.value, '$.moves')) mv
        )
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.box') IS NOT NULL;

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260622000200', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
