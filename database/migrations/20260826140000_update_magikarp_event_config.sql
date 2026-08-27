-- PostgreSQL Migration: 20260826140000_update_magikarp_event_config
-- Description: Updates hora_magikarp event config with sub-competitions, shiny/spawn buffs, and minigame bonuses.

UPDATE public.events_config
SET config = '{"species":"magikarp","hasCompetition":true,"requireCaughtDuringEvent":true,"speciesShinyMult":3,"speciesRateMult":2,"fishingMult":2,"minigameBuffs":{"fishing":{"encounterRateMult":2,"rareDropMult":1.5,"shinyMult":3}},"subCompetitions":[{"id":"ivs","name":"Genética Superior (IVs)","description":"Premia al Magikarp con mayores IVs totales.","metric":"total_ivs","order":"max","prizes":{"first":{"type":"money","amount":100000},"second":{"type":"money","amount":50000},"third":{"type":"money","amount":25000}}},{"id":"weight","name":"Masa y Peso (Titán / Miniatura)","description":"Premia al ejemplar con mayor o menor peso.","metric":"weight","order":"auto","prizes":{"first":{"type":"item","item":"superrod","qty":1},"second":{"type":"item","item":"goodrod","qty":1},"third":{"type":"item","item":"mysticwater","qty":1}}},{"id":"height","name":"Envergadura y Altura (Gran Salto)","description":"Premia al ejemplar con mayor o menor altura.","metric":"height","order":"auto","prizes":{"first":{"type":"item","item":"waterstone","qty":2},"second":{"type":"item","item":"waterstone","qty":1},"third":{"type":"item","item":"rarecandy","qty":3}}}]}'
WHERE id = 'hora_magikarp';

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260826140000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
