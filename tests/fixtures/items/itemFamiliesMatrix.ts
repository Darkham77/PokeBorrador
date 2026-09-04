// [PureVue-Ignore-Length]
/**
 * tests/fixtures/items/itemFamiliesMatrix.ts
 *
 * Single Source of Truth (SSoT) parameterized matrix for all 11 Item Families in Poké Vicio.
 */

import type { ItemId } from '@/data/inventory/items';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';

export const ITEM_FAMILY_IDS = [
  'healing_direct',
  'ev_friendship',
  'global_buff',
  'tm_learning',
  'move_relearner',
  'trait_customization',
  'evolution_item',
  'held_item',
  'pokeball',
  'fossil_cloning',
  'crafting_economy',
] as const;

export type ItemFamilyId = (typeof ITEM_FAMILY_IDS)[number];

export interface ItemFamilyTestCase {
  itemId: ItemId;
  name: string;
  subCategory: string;
  isDeferred: boolean;
  requiresTarget: boolean;
  setupValidTarget: (mon: Pokemon) => void;
  setupInvalidTarget?: (mon: Pokemon) => void;
  verifySuccessEffect: (mon: Pokemon, res: ItemEffectResult) => boolean;
}

export interface ItemFamilyDefinition {
  familyId: ItemFamilyId;
  title: string;
  description: string;
  testCases: readonly ItemFamilyTestCase[];
}

export const ITEM_FAMILIES_MATRIX: readonly ItemFamilyDefinition[] = [
  // ─── FAMILIA 1: Curación e Impacto Directo ─────────────────────────────────
  {
    familyId: 'healing_direct',
    title: 'Curación, Recuperación y Restauración Directa',
    description: 'Modifica HP, estados alterados, PP, vigor o nivel inmediatamente sobre un Pokémon.',
    testCases: [
      {
        itemId: 'potion',
        name: 'Poción',
        subCategory: 'HP Fijo',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.hp = 10;
          mon.maxHp = 100;
        },
        setupInvalidTarget: (mon) => {
          mon.hp = 100;
          mon.maxHp = 100;
        },
        verifySuccessEffect: (mon, res) => res.success && mon.hp === 30
      },
      {
        itemId: 'maxpotion',
        name: 'Poción Máxima',
        subCategory: 'HP 100%',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.hp = 5;
          mon.maxHp = 150;
        },
        setupInvalidTarget: (mon) => {
          mon.hp = 150;
          mon.maxHp = 150;
        },
        verifySuccessEffect: (mon, res) => res.success && mon.hp === mon.maxHp
      },
      {
        itemId: 'revive',
        name: 'Revivir',
        subCategory: 'Revivir 50%',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.hp = 0;
          mon.maxHp = 100;
          mon.status = 'psn';
        },
        setupInvalidTarget: (mon) => {
          mon.hp = 50;
          mon.maxHp = 100;
        },
        verifySuccessEffect: (mon, res) => res.success && mon.hp === 50 && mon.status === ''
      },
      {
        itemId: 'antidote',
        name: 'Antídoto',
        subCategory: 'Estado Veneno',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.hp = 50;
          mon.status = 'psn';
        },
        setupInvalidTarget: (mon) => {
          mon.hp = 50;
          mon.status = '';
        },
        verifySuccessEffect: (mon, res) => res.success && mon.status === ''
      },
      {
        itemId: 'fullheal',
        name: 'Cura Total',
        subCategory: 'Estado Universal',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.hp = 50;
          mon.status = 'brn';
        },
        setupInvalidTarget: (mon) => {
          mon.hp = mon.maxHp;
          mon.status = '';
        },
        verifySuccessEffect: (mon, res) => res.success && mon.status === ''
      },
      {
        itemId: 'fullrestore',
        name: 'Restauración Total',
        subCategory: 'HP 100% + Estado',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.hp = 10;
          mon.maxHp = 100;
          mon.status = 'par';
        },
        setupInvalidTarget: (mon) => {
          mon.hp = 100;
          mon.maxHp = 100;
          mon.status = '';
        },
        verifySuccessEffect: (mon, res) => res.success && mon.hp === mon.maxHp && mon.status === ''
      },
      {
        itemId: 'ether',
        name: 'Éter',
        subCategory: 'Restauración PP',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          if (mon.moves[0]) {
            mon.moves[0].pp = 0;
            mon.moves[0].maxPP = 20;
          }
        },
        setupInvalidTarget: (mon) => {
          mon.moves.forEach(m => {
            if (m) m.pp = m.maxPP;
          });
        },
        verifySuccessEffect: (mon, res) => res.success && (mon.moves[0]?.pp ?? 0) > 0
      },
      {
        itemId: 'vigorrestorer',
        name: 'Restaurador de Vigor',
        subCategory: 'Vigor Crianza',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.vigor = 0;
          mon.maxVigor = 100;
        },
        setupInvalidTarget: (mon) => {
          mon.vigor = 100;
          mon.maxVigor = 100;
        },
        verifySuccessEffect: (mon, res) => res.success && mon.vigor === 100
      },
      {
        itemId: 'rarecandy',
        name: 'Caramelo Raro',
        subCategory: 'Subida de Nivel',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.level = 50;
        },
        setupInvalidTarget: (mon) => {
          mon.level = 100;
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'levelup'
      }
    ]
  },

  // ─── FAMILIA 2: EVs, Amistad y Mochis ─────────────────────────────────────
  {
    familyId: 'ev_friendship',
    title: 'Modificación de EVs, Amistad y Reseteo',
    description: 'Aumenta o reduce EVs de estadísticas específicas, altera la amistad y resetea atributos.',
    testCases: [
      {
        itemId: 'protein',
        name: 'Proteína',
        subCategory: 'Vitamina (+10 Atk)',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        },
        setupInvalidTarget: (mon) => {
          mon.evs = { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 };
        },
        verifySuccessEffect: (mon, res) => res.success && mon.evs?.atk === 10
      },
      {
        itemId: 'healthfeather',
        name: 'Pluma Ímpetu',
        subCategory: 'Pluma (+1 HP)',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        },
        verifySuccessEffect: (mon, res) => res.success && mon.evs?.hp === 1
      },
      {
        itemId: 'musclemochi',
        name: 'Mochi Músculo',
        subCategory: 'Mochi (+10 Atk)',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        },
        verifySuccessEffect: (mon, res) => res.success && mon.evs?.atk === 10
      },
      {
        itemId: 'freshstartmochi',
        name: 'Mochi Reinicio',
        subCategory: 'Reset EVs a 0',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.evs = { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 };
        },
        setupInvalidTarget: (mon) => {
          mon.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        },
        verifySuccessEffect: (mon, res) =>
          res.success && mon.evs !== undefined && Object.values(mon.evs).every(val => val === 0)
      },
      {
        itemId: 'pomegberry',
        name: 'Baya Grana',
        subCategory: 'Baya Reductora (-10 HP EV + Amistad)',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.evs = { hp: 20, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
          mon.friendship = 100;
        },
        verifySuccessEffect: (mon, res) =>
          res.success && mon.evs?.hp === 10 && (mon.friendship ?? 0) > 100
      }
    ]
  },

  // ─── FAMILIA 3: Buffs Globales Temporales ───────────────────────────────────
  {
    familyId: 'global_buff',
    title: 'Buffs Globales Temporales',
    description: 'Activa temporizadores en segundos sin requerir un Pokémon objetivo.',
    testCases: [
      {
        itemId: 'luckyegg',
        name: 'Huevo Suerte',
        subCategory: 'EXP Multiplier (30 min)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: (_mon, res) => res.success
      },
      {
        itemId: 'amuletcoin',
        name: 'Moneda Amuleto',
        subCategory: 'Dinero Multiplier (60 min)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: (_mon, res) => res.success
      },
      {
        itemId: 'repel',
        name: 'Repelente',
        subCategory: 'Encuentros (5 min)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: (_mon, res) => res.success
      },
      {
        itemId: 'fishingrod',
        name: 'Caña de Pescar',
        subCategory: 'Herramienta Pesca (20 min)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: (_mon, res) => res.success
      },
      {
        itemId: 'pickaxe',
        name: 'Pico de Excavación',
        subCategory: 'Herramienta Minería (20 min)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: (_mon, res) => res.success
      },
      {
        itemId: 'incensefire',
        name: 'Incienso Fuego',
        subCategory: 'Spawn Attraction (30 min)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: (_mon, res) => res.success
      },
      {
        itemId: 'ivscanner',
        name: 'Escáner de IVs',
        subCategory: 'HUD Combat Scan (60 min)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: (_mon, res) => res.success
      }
    ]
  },

  // ─── FAMILIA 4: Máquinas Técnicas (MTs / TMs) ──────────────────────────────
  {
    familyId: 'tm_learning',
    title: 'Máquinas Técnicas (MTs / TMs)',
    description: 'Enseña una técnica directamente (<4 movimientos) o abre cola diferida de reemplazo (=4 movimientos).',
    testCases: [
      {
        itemId: 'tm01' as ItemId,
        name: 'MT01 (Mega Puño)',
        subCategory: 'Direct Learn (< 4 moves)',
        isDeferred: true,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.id = 'pikachu';
          mon.moves = [
            { id: 'thundershock', name: 'Impactrueno', pp: 30, maxPP: 30 } as Move
          ];
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'learn_move'
      },
      {
        itemId: 'tm01' as ItemId,
        name: 'MT01 (Mega Puño)',
        subCategory: 'Replace Learn (= 4 moves)',
        isDeferred: true,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.id = 'pikachu';
          mon.moves = [
            { id: 'thundershock', name: 'Impactrueno', pp: 30, maxPP: 30 } as Move,
            { id: 'quickattack', name: 'Ataque Rápido', pp: 30, maxPP: 30 } as Move,
            { id: 'thunderwave', name: 'Onda Trueno', pp: 20, maxPP: 20 } as Move,
            { id: 'electroball', name: 'Bola Voltio', pp: 20, maxPP: 20 } as Move
          ];
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'learn_move'
      }
    ]
  },

  // ─── FAMILIA 5: Recordador de Movimientos ───────────────────────────────────
  {
    familyId: 'move_relearner',
    title: 'Recordador de Movimientos',
    description: 'Permite recordar técnicas olvidadas del learnset y de toda la cadena de pre-evolución.',
    testCases: [
      {
        itemId: 'moverelearner',
        name: 'Recordador de Movimientos',
        subCategory: 'Learnset & Pre-Evolutions',
        isDeferred: true,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.id = 'raichu';
          mon.level = 50;
          mon.moves = [
            { id: 'thunderbolt', name: 'Rayo', pp: 15, maxPP: 15 } as Move
          ];
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'relearner'
      }
    ]
  },

  // ─── FAMILIA 6: Rasgos y Metagame (Modales Dedicados) ────────────────────────
  {
    familyId: 'trait_customization',
    title: 'Rasgos y Metagame (Modales Dedicados)',
    description: 'Abre interfaces modales interactivas para elegir naturalezas, habilidades o subidas de PP.',
    testCases: [
      {
        itemId: 'naturepatch',
        name: 'Parche de Naturaleza',
        subCategory: 'Selector de 25 Naturalezas',
        isDeferred: true,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.nature = 'hardy';
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'nature_patch'
      },
      {
        itemId: 'abilitypill',
        name: 'Píldora de Habilidad',
        subCategory: 'Selector de Habilidades de Especie',
        isDeferred: true,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.id = 'bulbasaur';
          mon.ability = 'overgrow';
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'ability_pill'
      },
      {
        itemId: 'ppup',
        name: 'Subida de PP',
        subCategory: '+20% PP Máximo (tope 160%)',
        isDeferred: true,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.moves = [
            { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 } as Move
          ];
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'pp_up'
      },
      {
        itemId: 'ppmax',
        name: 'Máximo PP',
        subCategory: '160% PP Máximo Tope',
        isDeferred: true,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.moves = [
            { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 } as Move
          ];
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'ppmax'
      }
    ]
  },

  // ─── FAMILIA 7: Piedras y Catalizadores Evolutivos ──────────────────────────
  {
    familyId: 'evolution_item',
    title: 'Piedras y Catalizadores Evolutivos',
    description: 'Valida compatibilidad con evolutionData y dispara la evolución de la especie.',
    testCases: [
      {
        itemId: 'firestone',
        name: 'Piedra Fuego',
        subCategory: 'Piedra Elemental (Eevee -> Flareon)',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.id = 'eevee';
        },
        setupInvalidTarget: (mon) => {
          mon.id = 'caterpie';
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'evolution' && res.targetId === 'flareon'
      },
      {
        itemId: 'linkcable',
        name: 'Cable Unión',
        subCategory: 'Catalizador de Intercambio (Kadabra -> Alakazam)',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: (mon) => {
          mon.id = 'kadabra';
        },
        verifySuccessEffect: (_mon, res) => res.success && res.resultType === 'evolution' && res.targetId === 'alakazam'
      }
    ]
  },

  // ─── FAMILIA 8: Objetos Equipables (Held Items) ─────────────────────────────
  {
    familyId: 'held_item',
    title: 'Objetos Equipables (Held Items)',
    description: 'Equipamiento e intercambio atómico, efectos pasivos de crianza y combate.',
    testCases: [
      {
        itemId: 'soothebell',
        name: 'Campana Alivio',
        subCategory: 'Amistad 1.5x Multiplier',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: () => {},
        verifySuccessEffect: () => true
      },
      {
        itemId: 'everstone',
        name: 'Piedra Eterna',
        subCategory: 'Crianza (Hereda 100% Naturaleza)',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: () => {},
        verifySuccessEffect: () => true
      },
      {
        itemId: 'leftovers',
        name: 'Restos',
        subCategory: 'Combate Showdown (Recuperación pasiva)',
        isDeferred: false,
        requiresTarget: true,
        setupValidTarget: () => {},
        verifySuccessEffect: () => true
      }
    ]
  },

  // ─── FAMILIA 9: Pokéballs (Captura) ─────────────────────────────────────────
  {
    familyId: 'pokeball',
    title: 'Pokéballs (Captura en Batalla)',
    description: 'Consumidas en combate para capturar el Pokémon rival con multiplicadores de ratio.',
    testCases: [
      {
        itemId: 'ultraball',
        name: 'Ultra Ball',
        subCategory: 'Ratio x2',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: () => true
      },
      {
        itemId: 'duskball',
        name: 'Ocaso Ball',
        subCategory: 'Ratio x3 en Cueva / Noche',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: () => true
      }
    ]
  },

  // ─── FAMILIA 10: Fósiles y Clonación ────────────────────────────────────────
  {
    familyId: 'fossil_cloning',
    title: 'Fósiles y Clonación en Guardería',
    description: 'Restringidos en mochila y consumidos en la máquina de clonación de la Guardería.',
    testCases: [
      {
        itemId: 'domefossil',
        name: 'Fósil Domo (Kabuto)',
        subCategory: 'Clonación 3-IVs',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: () => true
      }
    ]
  },

  // ─── FAMILIA 11: Crafteo y Economía ─────────────────────────────────────────
  {
    familyId: 'crafting_economy',
    title: 'Crafteo, Materiales y Economía',
    description: 'Materias primas y componentes para crafteo en talleres o venta al mercado.',
    testCases: [
      {
        itemId: 'copperore',
        name: 'Mineral de Cobre',
        subCategory: 'Materia Prima (Tier 0)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: () => true
      },
      {
        itemId: 'chip',
        name: 'Microchip',
        subCategory: 'Componente (Tier 2)',
        isDeferred: false,
        requiresTarget: false,
        setupValidTarget: () => {},
        verifySuccessEffect: () => true
      }
    ]
  }
];
