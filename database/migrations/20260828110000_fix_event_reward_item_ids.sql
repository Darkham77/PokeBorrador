-- PostgreSQL Migration: 20260828110000_fix_event_reward_item_ids
-- Description: Fixes event reward item IDs in events_config (gran_concurso_sabado, hora_magikarp, etc.)

UPDATE public.events_config
SET config = '{"hasCompetition": true, "requireCaughtDuringEvent": true, "species": "*", "banner": "gran_concurso_sabado_full", "subCompetitions": [{"id": "ivs", "name": "Genética Suprema (IVs Totales)", "metric": "total_ivs", "order": "max", "prizes": {"first": {"type": "mixed", "money": 50000, "battleCoins": 300, "items": {"goldbottlecap": 1, "rarecandy": 10}}, "second": {"type": "mixed", "money": 30000, "battleCoins": 200, "items": {"bottlecap": 2, "rarecandy": 5}}, "third": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"bottlecap": 1, "rarecandy": 3}}}}, {"id": "weight", "name": "Titanes y Miniaturas (Masa y Peso)", "metric": "weight", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 50000, "battleCoins": 300, "items": {"nugget": 5, "naturepatch": 1}}, "second": {"type": "mixed", "money": 30000, "battleCoins": 200, "items": {"nugget": 3, "abilitypill": 1}}, "third": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"nugget": 1}}}}, {"id": "height", "name": "Envergadura y Altura", "metric": "height", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 50000, "battleCoins": 300, "items": {"masterball": 1, "elixirmax": 5}}, "second": {"type": "mixed", "money": 30000, "battleCoins": 200, "items": {"ultraball": 15, "revivemax": 5}}, "third": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"greatball": 10, "revive": 5}}}}]}'
WHERE id = 'gran_concurso_sabado';

UPDATE public.events_config
SET config = '{"species":"magikarp","hasCompetition":true,"requireCaughtDuringEvent":true,"speciesShinyMult":3,"speciesRateMult":2,"fishingMult":2,"minigameBuffs":{"fishing":{"encounterRateMult":2,"rareDropMult":1.5,"shinyMult":3}},"subCompetitions":[{"id":"ivs","name":"Genética Superior (IVs)","description":"Premia al Magikarp con mayores IVs totales.","metric":"total_ivs","order":"max","prizes":{"first":{"type":"money","amount":100000},"second":{"type":"money","amount":50000},"third":{"type":"money","amount":25000}}},{"id":"weight","name":"Masa y Peso (Titán / Miniatura)","description":"Premia al ejemplar con mayor o menor peso.","metric":"weight","order":"auto","prizes":{"first":{"type":"item","item":"fishingrodsuper","qty":1},"second":{"type":"item","item":"fishingrodgood","qty":1},"third":{"type":"item","item":"mysticwater","qty":1}}},{"id":"height","name":"Envergadura y Altura (Gran Salto)","description":"Premia al ejemplar con mayor o menor altura.","metric":"height","order":"auto","prizes":{"first":{"type":"item","item":"waterstone","qty":2},"second":{"type":"item","item":"waterstone","qty":1},"third":{"type":"item","item":"rarecandy","qty":3}}}]}'
WHERE id = 'hora_magikarp';

UPDATE public.events_config
SET config = '{"archaeologyMult": 2.0, "banner": "arqueologia_fosiles_full"}'
WHERE id = 'fiebre_minera';

UPDATE public.events_config
SET config = '{"shinyMult": 1.5, "catchRateMult": 1.5, "bcMult": 1.5, "banner": "safari_suerte_full"}',
    description = '¡50% más de probabilidad de Shiny salvaje, ratio de captura mejorado y 1.5x Battle Coins en combates!'
WHERE id = 'dia_safari_suerte';

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260828110000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
