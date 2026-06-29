// scripts/battle-tester/excluded-abilities.ts
// Habilidades excluidas del reporte de cobertura Singles (gen9customgame).
// Para testear estas habilidades se requiere un simulador de Dobles, Tera,
// o un formato específico de especie/forma. No son bugs del bridge.

export interface ExcludedAbilityEntry {
  id: string;
  reason: 'doubles-only' | 'tera-only' | 'fusion-locked' | 'species-locked';
  note: string;
}

// Habilidades que solo funcionan en formato Dobles (VGC / Doubles OU).
// Requieren un aliado activo en el campo para tener efecto.
export const DOUBLES_ONLY_ABILITIES: readonly string[] = [
  'aromaveil',     // Protects team from moves that target the mind (doubles)
  'battery',       // Boosts ally's Special moves by 30% (doubles)
  'commander',     // Tatsugiri inside Dondozo — doubles-exclusive mechanic
  'costar',        // Copies ally's stat changes on entry (doubles)
  'flowerveil',    // Protects Grass-type allies from status (doubles)
  'friendguard',   // Reduces damage to adjacent allies by 25% (doubles)
  'healer',        // 30% chance to cure ally's status at end of turn (no ally in singles)
  'hospitality',   // Heals ally 1/4 max HP on entry (doubles)
  'minus',         // Boosts SpA when ally has Plus (doubles)
  'plus',          // Boosts SpA when ally has Minus (doubles)
  'powerspot',     // Boosts adjacent ally's moves by 30% (doubles)
  'propellertail', // Ignores redirection — only relevant in doubles
  'stalwart',      // Ignores redirection — only relevant in doubles
  'sweetveil',     // Protects ally from falling asleep (doubles)
  'telepathy',     // Avoids ally's multi-target moves (doubles)
] as const;

// Habilidades vinculadas al mecanismo de Terastallización o formas Tera exclusivas.
// Requieren `gen9` con Tera habilitado; no disponibles en gen9customgame sin el token Tera.
export const TERA_ONLY_ABILITIES: readonly string[] = [
  'embodyaspectcornerstone', // Ogerpon Cornerstone Mask — activates on Tera
  'embodyaspecthearthflame', // Ogerpon Hearthflame Mask — activates on Tera
  'embodyaspectteal',        // Ogerpon Teal Mask — activates on Tera
  'embodyaspectwellspring',  // Ogerpon Wellspring Mask — activates on Tera
  'teraformzero',            // Terapagos Stellar form — requires Tera mechanic
  'terashell',               // Terapagos Stellar: resists all types at full HP when Tera
  'terashift',               // Terapagos Normal → Terastal on entry (needs Tera format)
] as const;

// Habilidades bloqueadas por fusiones de especie o cambios de forma por KO/switch.
// Requieren condiciones de juego no reproducibles en el fuzzer 1v1.
export const FUSION_LOCKED_ABILITIES: readonly string[] = [
  'asoneglastrier',  // Calyrex-Ice (fused) — combines Chilling Neigh + Unnerve
  'asonespectrier',  // Calyrex-Shadow (fused) — combines Grim Neigh + Unnerve
  'battlebond',      // Greninja: Hero form after KO — requires specific format support
  'powerconstruct',  // Zygarde 10%/50% → Complete at 50% HP — species-form trigger
  'zerotohero',      // Palafin: must switch in as Zero form to trigger Hero transform
] as const;

// Habilidades vinculadas a una especie específica con mecánicas de forma únicas.
// NOTA: Estas SÍ son testeables en singleplayer — solo requieren usar la especie correcta
// en un escenario scriptado (no Mew). Cada una tiene su propio escenario en ability-scenarios.ts.
// Se incluyen en el pool de cobertura, NO se excluyen del reporte.
//
// forecast   → Castform  (forma por clima)
// hungerswitch → Morpeko (alterna forma por turno)
// multitype  → Arceus    (tipo por Plate sostenida)
// rkssystem  → Silvally  (tipo por Memory sostenida)
// schooling  → Wishiwashi (forma por HP/nivel)
// shieldsdown → Minior   (escudo se rompe al 50% HP)

// Set unificado para filtrado rápido O(1) en el generador y el reporte.
// Solo doubles, tera y fusion: 15 + 7 + 5 = 27 habilidades excluidas.
// Las species-locked no se incluyen aquí — tienen escenarios propios.
export const EXCLUDED_FROM_SINGLES_REPORT: ReadonlySet<string> = new Set([
  ...DOUBLES_ONLY_ABILITIES,
  ...TERA_ONLY_ABILITIES,
  ...FUSION_LOCKED_ABILITIES,
]);

// Entradas con metadatos para el campo `excludedAbilities` del reporte JSON.
export const EXCLUDED_ABILITY_ENTRIES: readonly ExcludedAbilityEntry[] = [
  // Doubles-only
  { id: 'aromaveil',     reason: 'doubles-only', note: 'Protects team from mind-targeting moves' },
  { id: 'battery',       reason: 'doubles-only', note: "Boosts ally's Special moves by 30%" },
  { id: 'commander',     reason: 'doubles-only', note: 'Tatsugiri inside Dondozo mechanic' },
  { id: 'costar',        reason: 'doubles-only', note: "Copies ally's stat changes on entry" },
  { id: 'flowerveil',    reason: 'doubles-only', note: 'Protects Grass-type allies from status' },
  { id: 'friendguard',   reason: 'doubles-only', note: 'Reduces damage to adjacent allies by 25%' },
  { id: 'healer',        reason: 'doubles-only', note: "30% chance to cure ally's status each turn" },
  { id: 'hospitality',   reason: 'doubles-only', note: 'Heals ally 1/4 max HP on entry' },
  { id: 'minus',         reason: 'doubles-only', note: 'Boosts SpA when ally has Plus' },
  { id: 'plus',          reason: 'doubles-only', note: 'Boosts SpA when ally has Minus' },
  { id: 'powerspot',     reason: 'doubles-only', note: "Boosts adjacent ally's moves by 30%" },
  { id: 'propellertail', reason: 'doubles-only', note: 'Ignores redirection — only relevant in doubles' },
  { id: 'stalwart',      reason: 'doubles-only', note: 'Ignores redirection — only relevant in doubles' },
  { id: 'sweetveil',     reason: 'doubles-only', note: 'Protects ally from falling asleep' },
  { id: 'telepathy',     reason: 'doubles-only', note: "Avoids damage from ally's multi-target moves" },
  // Tera-only
  { id: 'embodyaspectcornerstone', reason: 'tera-only', note: 'Ogerpon Cornerstone — activates on Terastallization' },
  { id: 'embodyaspecthearthflame', reason: 'tera-only', note: 'Ogerpon Hearthflame — activates on Terastallization' },
  { id: 'embodyaspectteal',        reason: 'tera-only', note: 'Ogerpon Teal — activates on Terastallization' },
  { id: 'embodyaspectwellspring',  reason: 'tera-only', note: 'Ogerpon Wellspring — activates on Terastallization' },
  { id: 'teraformzero',            reason: 'tera-only', note: 'Terapagos Stellar — requires Tera mechanic' },
  { id: 'terashell',               reason: 'tera-only', note: 'Terapagos Stellar: resists all types at full HP when Tera' },
  { id: 'terashift',               reason: 'tera-only', note: 'Terapagos: Normal → Terastal form on entry' },
  // Fusion-locked
  { id: 'asoneglastrier', reason: 'fusion-locked', note: 'Calyrex-Ice fused form — Chilling Neigh + Unnerve' },
  { id: 'asonespectrier', reason: 'fusion-locked', note: 'Calyrex-Shadow fused form — Grim Neigh + Unnerve' },
  { id: 'battlebond',     reason: 'fusion-locked', note: 'Greninja: Ash-Greninja form after KO — requires specific format' },
  { id: 'powerconstruct', reason: 'fusion-locked', note: 'Zygarde 10%/50% → Complete at 50% HP' },
  { id: 'zerotohero',     reason: 'fusion-locked', note: 'Palafin: must switch in as Zero form to trigger Hero transform' },
];

export const EXCLUDED_SIMULATOR_NOTE =
  'Estas habilidades requieren un simulador de Dobles, Tera, o son mecánicas de fusión de forma no reproducibles en 1v1. ' +
  'El tester actual solo cubre batallas 1v1 Singles (gen9customgame).';
