-- PostgreSQL Migration: 20260827120000_update_events_bonuses_and_minigames
-- Description: Updates events_config with minigame buffs, species shiny/spawn multipliers, and sub-competitions.

UPDATE public.events_config
SET config = '{"species":"magikarp","hasCompetition":true,"requireCaughtDuringEvent":true,"speciesShinyMult":3,"speciesRateMult":2,"fishingMult":2,"minigameBuffs":{"fishing":{"encounterRateMult":2,"rareDropMult":1.5,"shinyMult":3}},"subCompetitions":[{"id":"ivs","name":"Genética Superior (IVs)","metric":"total_ivs","order":"max","prizes":{"first":{"type":"mixed","money":25000,"battleCoins":150,"items":{"goldbottlecap":1,"rarecandy":5}},"second":{"type":"mixed","money":15000,"battleCoins":100,"items":{"bottlecap":2,"rarecandy":3}},"third":{"type":"mixed","money":8000,"battleCoins":50,"items":{"bottlecap":1,"rarecandy":1}}}},{"id":"weight","name":"Masa y Peso (Titán / Miniatura)","metric":"weight","order":"auto","prizes":{"first":{"type":"mixed","money":25000,"battleCoins":150,"items":{"bigpearl":3,"lureball":10}},"second":{"type":"mixed","money":15000,"battleCoins":100,"items":{"bigpearl":2,"netball":10}},"third":{"type":"mixed","money":8000,"battleCoins":50,"items":{"pearl":3,"diveball":5}}}},{"id":"height","name":"Envergadura y Altura (Gran Salto)","metric":"height","order":"auto","prizes":{"first":{"type":"mixed","money":25000,"battleCoins":150,"items":{"waterstone":2,"dragonscale":1,"mysticwater":1}},"second":{"type":"mixed","money":15000,"battleCoins":100,"items":{"waterstone":1,"damprock":1}},"third":{"type":"mixed","money":8000,"battleCoins":50,"items":{"waterstone":1}}}}]}'
WHERE id = 'hora_magikarp';

UPDATE public.events_config
SET config = '{"fishingMult":2,"minigameBuffs":{"fishing":{"encounterRateMult":2,"rareDropMult":1.5}}}'
WHERE id = 'dia_pesca';

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260827120000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
