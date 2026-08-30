-- PostgreSQL Migration: 20260830234500_fix_events_config_rls_and_canonical_seed
-- Description: Ensures RLS SELECT policy and grants for events_config, and re-seeds the complete canonical 12-event grid.

ALTER TABLE public.events_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read events" ON public.events_config;
CREATE POLICY "Public read events" ON public.events_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura pública events_config" ON public.events_config;
CREATE POLICY "Lectura pública events_config" ON public.events_config FOR SELECT USING (true);

GRANT SELECT ON public.events_config TO anon, authenticated, service_role;


DELETE FROM public.events_config 
WHERE CAST(schedule AS TEXT) LIKE '%[object Object]%' 
   OR CAST(config AS TEXT) LIKE '%[object Object]%'
   OR (id LIKE 'custom_%' AND name LIKE 'custom_%');

INSERT INTO public.events_config (id, name, icon, type, active, manual, schedule, config, description)
VALUES 
-- Lunes: Fiebre del Oro y Entrenamiento
('fiebre_oro', 'Fiebre del Oro y Rivales', '💰', 'passive_bonus', true, false, 
 '{"type": "weekly", "days": [1], "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"moneyMult": 2.0, "trainerMult": 1.5, "rivalMult": 1.5, "banner": "rival_full"}'::jsonb, 
 '¡Doble dinero en combates y 50% extra de recompensas contra rivales y entrenadores!'),

-- Martes: Día del Océano y Pesca (Bono pasivo)
('dia_pesca', 'Día del Océano y Pesca', '🎣', 'passive_bonus', true, false, 
 '{"type": "weekly", "days": [2], "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"fishingMult": 2.0, "minigameBuffs": {"fishing": {"encounterRateMult": 2.0, "rareDropMult": 1.5}}, "banner": "dia_pesca_full"}'::jsonb, 
 '¡Mayor probabilidad de encuentros de pesca y objetos raros en mapas con agua!'),

-- Martes: Torneo de Pesca Acuática (Competencia con rotación mensual)
('torneo_pesca', 'Torneo de Pesca Acuática', '🎣', 'competition', true, false, 
 '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 22}'::jsonb, 
 '{"hasCompetition": true, "requireCaughtDuringEvent": true, "rotationTheme": "weekly_4", "speciesShinyMult": 3.0, "speciesRateMult": 2.0, "fishingMult": 2.0, "minigameBuffs": {"fishing": {"encounterRateMult": 2.0, "rareDropMult": 1.5, "shinyMult": 3.0}}, "weeklyRotations": {"1": {"species": "magikarp,gyarados", "banner": "hora_magikarp_full", "title": "Torneo Magikarp & Gyarados"}, "2": {"species": "shellder,staryu,horsea,seadra,goldeen", "banner": "pesca_exotica_full", "title": "Torneo de Pesca Exótica"}, "3": {"species": "tentacool,tentacruel,krabby,kingler,poliwag", "banner": "pesca_profunda_full", "title": "Torneo de Pesca Profunda"}, "4": {"species": "dratini,dragonair,lapras", "banner": "pesca_mistica_full", "title": "Torneo de Pesca Mística"}}, "subCompetitions": [{"id": "ivs", "name": "Genética Superior (IVs)", "metric": "total_ivs", "order": "max", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"goldbottlecap": 1, "rarecandy": 5}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"bottlecap": 2, "rarecandy": 3}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"bottlecap": 1, "rarecandy": 1}}}}, {"id": "weight", "name": "Masa y Peso (Titán / Miniatura)", "metric": "weight", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"bigpearl": 3, "lureball": 10}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"bigpearl": 2, "netball": 10}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"pearl": 3, "diveball": 5}}}}, {"id": "height", "name": "Envergadura y Altura (Gran Salto)", "metric": "height", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"waterstone": 2, "dragonscale": 1, "mysticwater": 1}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"waterstone": 1, "damprock": 1}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"waterstone": 1}}}}]}'::jsonb, 
 '¡Competencia semanal de pesca! Captura el mejor ejemplar acuático según la rotación del mes y gana premios temáticos.'),

-- Miércoles: Día de la Guardería e Incubación
('dia_crianza', 'Día de la Guardería e Incubación', '🥚', 'passive_bonus', true, false, 
 '{"type": "weekly", "days": [3], "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"hatchMult": 2.0, "eggShinyMult": 2.0, "banner": "huevos_full"}'::jsonb, 
 '¡Pasos de eclosión de huevos reducidos al 50% y doble probabilidad de Shiny en crías de Guardería!'),

-- Jueves: Día de la Naturaleza y Caza (Bono pasivo)
('dia_naturaleza', 'Día de la Naturaleza y Caza', '🌿', 'passive_bonus', true, false, 
 '{"type": "weekly", "days": [4], "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"bugCatchingMult": 2.0, "catchRateMult": 1.3, "banner": "safari_park_full"}'::jsonb, 
 '¡Mayor probabilidad de encuentros de insectos y ratio de captura aumentado un 30% en rutas salvajes!'),

-- Jueves: Torneo de Caza Temático (Competencia con rotación mensual)
('torneo_caza', 'Torneo de Caza Temático', '🏆', 'competition', true, false, 
 '{"type": "weekly", "days": [4], "startHour": 18, "endHour": 22}'::jsonb, 
 '{"hasCompetition": true, "requireCaughtDuringEvent": true, "rotationTheme": "weekly_4", "speciesShinyMult": 3.0, "speciesRateMult": 2.0, "weeklyRotations": {"1": {"species": "scyther,pinsir,butterfree,beedrill,venomoth", "banner": "caza_bichos_full", "title": "Concurso de Caza de Bichos"}, "2": {"species": "tauros,kangaskhan,chansey,dodrio", "banner": "safari_park_full", "title": "Gran Torneo de la Zona Safari"}, "3": {"species": "kabuto,omanyte,aerodactyl,geodude,onix,rhyhorn", "banner": "arqueologia_fosiles_full", "title": "Torneo de Excavación & Fósiles"}, "4": {"species": "gastly,haunter,gengar,zubat,golbat,hypno", "banner": "caza_nocturna_full", "title": "Caza Nocturna & Mística"}}, "subCompetitions": [{"id": "ivs", "name": "Genética Superior (IVs)", "metric": "total_ivs", "order": "max", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"goldbottlecap": 1, "rarecandy": 5}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"bottlecap": 2, "rarecandy": 3}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"bottlecap": 1, "rarecandy": 1}}}}, {"id": "weight", "name": "Masa y Peso (Titán / Miniatura)", "metric": "weight", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"bigpearl": 3, "heavydutyboots": 1}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"bigpearl": 2, "floatstone": 1}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"pearl": 3}}}}, {"id": "height", "name": "Envergadura y Tamaño", "metric": "height", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 25000, "battleCoins": 150, "items": {"leafstone": 2, "moonstone": 1, "sunstone": 1}}, "second": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"leafstone": 1, "moonstone": 1}}, "third": {"type": "mixed", "money": 8000, "battleCoins": 50, "items": {"leafstone": 1}}}}]}'::jsonb, 
 '¡Competencia semanal de caza! Captura el mejor ejemplar terrestre según la temática del mes y gana premios.'),

-- Viernes: Fiebre Minera y Arqueología
('fiebre_minera', 'Fiebre Minera y Arqueología', '⛏️', 'passive_bonus', true, false, 
 '{"type": "weekly", "days": [5], "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"archaeologyMult": 2.0, "banner": "arqueologia_fosiles_full"}'::jsonb, 
 '¡Doble probabilidad de hallar fósiles antiguos, piedras evolutivas, gemas y tesoros mineros subterráneos!'),

-- Sábado y Domingo: Doble EXP
('doble_exp', 'Fin de Semana de Doble EXP', '⚡', 'passive_bonus', true, false, 
 '{"type": "weekly", "days": [6, 0], "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"expMult": 2.0, "banner": "doble_exp_full"}'::jsonb, 
 '¡EXP x2 en todos los combates durante el fin de semana!'),

-- Sábado: Gran Concurso Abierto Global (Todo el día, cualquier Pokémon)
('gran_concurso_sabado', 'Gran Concurso Abierto del Sábado', '👑', 'competition', true, false, 
 '{"type": "weekly", "days": [6], "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"hasCompetition": true, "requireCaughtDuringEvent": true, "species": "*", "banner": "gran_concurso_sabado_full", "subCompetitions": [{"id": "ivs", "name": "Genética Suprema (IVs Totales)", "metric": "total_ivs", "order": "max", "prizes": {"first": {"type": "mixed", "money": 50000, "battleCoins": 300, "items": {"goldbottlecap": 1, "rarecandy": 10}}, "second": {"type": "mixed", "money": 30000, "battleCoins": 200, "items": {"bottlecap": 2, "rarecandy": 5}}, "third": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"bottlecap": 1, "rarecandy": 3}}}}, {"id": "weight", "name": "Titanes y Miniaturas (Masa y Peso)", "metric": "weight", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 50000, "battleCoins": 300, "items": {"nugget": 5, "naturepatch": 1}}, "second": {"type": "mixed", "money": 30000, "battleCoins": 200, "items": {"nugget": 3, "abilitypill": 1}}, "third": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"nugget": 1}}}}, {"id": "height", "name": "Envergadura y Altura", "metric": "height", "order": "auto", "prizes": {"first": {"type": "mixed", "money": 50000, "battleCoins": 300, "items": {"masterball": 1, "elixirmax": 5}}, "second": {"type": "mixed", "money": 30000, "battleCoins": 200, "items": {"ultraball": 15, "revivemax": 5}}, "third": {"type": "mixed", "money": 15000, "battleCoins": 100, "items": {"greatball": 10, "revive": 5}}}}]}'::jsonb, 
 '¡El gran campeonato de los sábados! Cualquier Pokémon capturado hoy compite por premios épicos y la gloria del podio.'),

-- Domingo: Día de la Fortuna y Suerte
('dia_safari_suerte', 'Día de la Fortuna y Suerte', '🍀', 'passive_bonus', true, false, 
 '{"type": "weekly", "days": [0], "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"shinyMult": 1.5, "catchRateMult": 1.5, "bcMult": 1.5, "banner": "safari_suerte_full"}'::jsonb, 
 '¡50% más de probabilidad de Shiny salvaje, ratio de captura mejorado y 1.5x Battle Coins en combates!'),

-- Fin de Mes: Día de la Comunidad Mensual (Último domingo de mes)
('comunidad_mensual', 'Día de la Comunidad: Growlithe', '🌟', 'passive_bonus', true, false, 
 '{"type": "monthly", "trigger": "last_sunday", "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"species": "growlithe", "speciesRateMult": 3.0, "speciesShinyMult": 4.0, "banner": "growlithe_full"}'::jsonb, 
 '¡Gran evento mensual! Spawns x3 y Shiny x4 para el Pokémon destacado del mes (exclusivo domingos de fin de mes).'),

-- Fin de Mes: Campeonato de Guerra de Facciones (2do fin de semana de mes)
('guerra_facciones_mensual', 'Campeonato de Guerra de Facciones', '⚔️', 'passive_bonus', true, false, 
 '{"type": "monthly", "trigger": "second_weekend", "startHour": 0, "endHour": 23.99}'::jsonb, 
 '{"bcMult": 2.0, "rivalMult": 2.0, "banner": "war_full"}'::jsonb, 
 '¡Batallas territoriales épicas! Puntos de facción dobles y 2x Battle Coins durante el 2do fin de semana de cada mes.')

ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  type = EXCLUDED.type,
  active = EXCLUDED.active,
  manual = EXCLUDED.manual,
  schedule = EXCLUDED.schedule,
  config = EXCLUDED.config,
  description = EXCLUDED.description;

-- Desactivar alias obsoleto
UPDATE public.events_config
SET active = false
WHERE id = 'hora_magikarp';

INSERT INTO public.system_config (key, value) VALUES ('db_version', '20260830234500'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
