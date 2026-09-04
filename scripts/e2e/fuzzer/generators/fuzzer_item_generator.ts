// scripts/battle-tester/fuzzer-item-generator.ts
import { Dex, type GenderName } from '@pkmn/sim';
import { SHOP_ITEMS } from '../../../../src/data/inventory/items.ts';
import { getShowdownNickname } from '../../../../src/logic/battle/showdownUidMapper.ts';

import crypto from 'node:crypto';

import { requirePokemonSpeciesId, type PokemonSpeciesId } from '../../../../src/data/pokemon/pokedex.ts';
import type { ItemId } from '../../../../src/data/inventory/items.ts';
import type { AbilityId } from '../../../../src/data/battle/abilities.ts';
import type { PokemonMoveId } from '../../../../src/types/pokemon/pokemon.ts';
import { toPokemonType, type PokemonType } from '../../../../src/data/battle/types.ts';
import type { FuzzerPokemonSet, TestBatch } from './fuzzer_team_generator.ts';
import { pokemonDataProvider } from '../../../../src/logic/providers/pokemonDataProvider.ts';
import { PokemonLegalityValidator } from '../../../../src/logic/battle/helpers/pokemonLegalityValidator.ts';

export interface ItemTestBatch extends Pick<TestBatch,
  'playerTeam' | 'enemyTeam' | 'seed' | 'playerChoices' | 'enemyChoices' | 'history' | 'steps' | 'ended' | 'winner' | 'finalState'> {
  itemsToTest: ItemId[];
  playerPriorityMove?: PokemonMoveId;
  enemyPriorityMove?: PokemonMoveId;
  playerPeriodicSwitchEvery?: number;
  playerVoluntarySwitchObjective?: boolean;
  disableIpbHealing?: boolean;
}

/** A certified item case must start with its item holder active in battle. */
export const ITEM_FUZZER_ACTIVE_HOLDER_COUNT = 1;

/** Held catalog entries whose effects are outside a Pokémon Showdown battle. */
export const OUT_OF_BATTLE_HELD_ITEM_IDS = [
  'auspiciousarmor', 'berrysweet', 'bignugget', 'bottlecap', 'chippedpot', 'cloversweet', 'crackedpot', 'dubiousdisc',
  'electirizer', 'flowersweet', 'galaricacuff', 'galaricawreath', 'goldbottlecap', 'grepaberry', 'hondewberry', 'kelpsyberry',
  'lovesweet', 'magmarizer', 'maliciousarmor', 'masterpieceteacup', 'metalalloy', 'pomegberry', 'prettyfeather', 'prismscale',
  'protector', 'qualotberry', 'rarebone', 'reapercloth', 'ribbonsweet', 'starsweet', 'strawberrysweet', 'sweetapple',
  'syrupyapple', 'tamatoberry', 'tartapple', 'unremarkableteacup', 'upgrade',
] as const satisfies readonly ItemId[];

const TYPE_TRIGGER_MOVES = {
  normal: 'tackle', fire: 'flamethrower', water: 'surf', grass: 'energyball', electric: 'thunderbolt', ice: 'icebeam',
  fighting: 'aurasphere', poison: 'sludgebomb', ground: 'earthquake', flying: 'airslash', psychic: 'psychic', bug: 'bugbuzz',
  rock: 'powergem', ghost: 'shadowball', dragon: 'dragonpulse', dark: 'darkpulse', steel: 'flashcannon', fairy: 'moonblast',
} as const satisfies Record<PokemonType, PokemonMoveId>;

const STATUS_CURE_TRIGGER_MOVES = {
  aspearberry: 'icebeam', cheriberry: 'thunderwave', chestoberry: 'spore', lumberry: 'toxic', pechaberry: 'toxic',
  persimberry: 'confuseray', rawstberry: 'willowisp',
} as const satisfies Partial<Record<ItemId, PokemonMoveId>>;

const TERRAIN_SEED_TRIGGER_MOVES = {
  electricseed: 'electricterrain', grassyseed: 'grassyterrain', mistyseed: 'mistyterrain', psychicseed: 'psychicterrain',
} as const satisfies Partial<Record<ItemId, PokemonMoveId>>;

const SELF_FIELD_TRIGGER_MOVES = {
  bigroot: 'gigadrain', bindingband: 'bind', choiceband: 'closecombat', choicescarf: 'closecombat', damprock: 'raindance', expertbelt: 'shadowball', gripclaw: 'bind', heatrock: 'sunnyday', icyrock: 'snowscape',
  leppaberry: 'sketch', lightclay: 'reflect', loadeddice: 'bulletseed', muscleband: 'closecombat', normalgem: 'tackle', powerherb: 'solarbeam', protectivepads: 'tackle', punchingglove: 'drainpunch', razorclaw: 'slash', roomservice: 'trickroom',
  scopelens: 'slash', smoothrock: 'sandstorm', terrainextender: 'electricterrain', throatspray: 'bugbuzz', widelens: 'zapcannon',
} as const satisfies Partial<Record<ItemId, PokemonMoveId>>;

const ENEMY_HIT_TRIGGER_MOVES = {
  aguavberry: 'falseswipe', apicotberry: 'falseswipe', cellbattery: 'thunderbolt', custapberry: 'falseswipe', ejectbutton: 'tackle', figyberry: 'falseswipe', floatstone: 'lowkick', ganlonberry: 'falseswipe', iapapaberry: 'falseswipe', ironball: 'earthquake', jabocaberry: 'closecombat', keeberry: 'closecombat', lansatberry: 'falseswipe', magoberry: 'falseswipe', micleberry: 'falseswipe', oranberry: 'falseswipe', petayaberry: 'falseswipe', redcard: 'tackle', ringtarget: 'shadowball', rockyhelmet: 'tackle', sitrusberry: 'falseswipe', snowball: 'icebeam', starfberry: 'falseswipe', wikiberry: 'falseswipe',
} as const satisfies Partial<Record<ItemId, PokemonMoveId>>;

const ENEMY_STATUS_TRIGGER_MOVES = {
  abilityshield: 'worryseed', ejectpack: 'charm', heavydutyboots: 'stealthrock', mentalherb: 'taunt', mirrorherb: 'swordsdance', safetygoggles: 'spore', utilityumbrella: 'sunnyday',
} as const satisfies Partial<Record<ItemId, PokemonMoveId>>;

const PLAYER_BENCH_TRIGGER_ITEM_IDS = ['ejectbutton', 'ejectpack', 'heavydutyboots', 'shedshell'] as const satisfies readonly ItemId[];
const ENEMY_BENCH_TRIGGER_ITEM_IDS = ['redcard'] as const satisfies readonly ItemId[];

const ENEMY_SUPER_EFFECTIVE_TRIGGER_MOVES = {
  enigmaberry: 'flamethrower', focussash: 'flamethrower', weaknesspolicy: 'flamethrower',
} as const satisfies Partial<Record<ItemId, PokemonMoveId>>;

const REQUIRED_HOLDER_SPECIES = {
  adrenalineorb: 'pinsir', aguavberry: 'abra', apicotberry: 'abra', boosterenergy: 'fluttermane', choicescarf: 'lucario', cornerstonemask: 'ogerponcornerstone', custapberry: 'abra', eviolite: 'porygon2', expertbelt: 'mew', figyberry: 'abra', floatstone: 'aggron', ganlonberry: 'abra', griseouscore: 'giratina', griseousorb: 'giratina', heavydutyboots: 'charizard', iapapaberry: 'abra', ironball: 'charizard', lansatberry: 'abra', leppaberry: 'smeargle', magoberry: 'abra', micleberry: 'abra', oranberry: 'abra', petayaberry: 'abra', ringtarget: 'snorlax', shedshell: 'scizor', sitrusberry: 'abra', starfberry: 'abra', wikiberry: 'abra',
  hearthflamemask: 'ogerponhearthflame', lightball: 'pikachu', rustedshield: 'zamazenta', rustedsword: 'zacian',
  utilityumbrella: 'charizard', wellspringmask: 'ogerponwellspring',
} as const satisfies Partial<Record<ItemId, PokemonSpeciesId>>;

const REQUIRED_HOLDER_ABILITIES = {
  adrenalineorb: 'hypercutter', boosterenergy: 'protosynthesis', utilityumbrella: 'solarpower',
} as const satisfies Partial<Record<ItemId, AbilityId>>;

const REQUIRED_ENEMY_ABILITIES = {
  adrenalineorb: 'intimidate', clearamulet: 'intimidate', shedshell: 'magnetpull',
} as const satisfies Partial<Record<ItemId, AbilityId>>;

const REQUIRED_ENEMY_SPECIES = {
  adrenalineorb: 'gyarados', aguavberry: 'kartana', apicotberry: 'kartana', choicescarf: 'jolteon', clearamulet: 'gyarados', custapberry: 'kartana', expertbelt: 'gengar', figyberry: 'kartana', focussash: 'charizard', ganlonberry: 'kartana', iapapaberry: 'kartana', lansatberry: 'kartana', magoberry: 'kartana', micleberry: 'kartana', oranberry: 'kartana', petayaberry: 'kartana', shedshell: 'magnezone', sitrusberry: 'kartana', starfberry: 'kartana', utilityumbrella: 'mew', wikiberry: 'kartana',
} as const satisfies Partial<Record<ItemId, PokemonSpeciesId>>;

const REQUIRED_ENEMY_ITEMS = {
  protectivepads: 'rockyhelmet',
} as const satisfies Partial<Record<ItemId, ItemId>>;

const MAX_SPECIAL_ATTACK_ENEMY_ITEM_IDS = ['focussash'] as const satisfies readonly ItemId[];
const MAX_ATTACK_ENEMY_ITEM_IDS = ['aguavberry', 'apicotberry', 'custapberry', 'figyberry', 'ganlonberry', 'iapapaberry', 'lansatberry', 'magoberry', 'micleberry', 'oranberry', 'petayaberry', 'sitrusberry', 'starfberry', 'wikiberry'] as const satisfies readonly ItemId[];

function getSpeciesLegalGender(speciesId: string): GenderName {
  const s = Dex.species.get(speciesId);
  if (!s || !s.exists) return 'N';
  if (s.gender === 'N' || s.gender === 'M' || s.gender === 'F') return s.gender as GenderName;
  if (s.genderRatio?.F === 1) return 'F';
  if (s.genderRatio?.M === 1) return 'M';
  if (s.genderRatio?.M === 0 && s.genderRatio?.F === 0) return 'N';
  return 'M';
}

function getRequiredHolderAbility(itemId: ItemId, speciesId: PokemonSpeciesId): AbilityId {
  const explicit = Object.entries(REQUIRED_HOLDER_ABILITIES).find(([candidateId]) => candidateId === itemId)?.[1];
  if (explicit) return explicit;
  const legal = pokemonDataProvider.getSpeciesAbilities(speciesId);
  return (legal[0] ?? 'synchronize') as AbilityId;
}

function getRequiredEnemyAbility(itemId: ItemId, enemySpeciesId: PokemonSpeciesId): AbilityId {
  const explicit = Object.entries(REQUIRED_ENEMY_ABILITIES).find(([candidateId]) => candidateId === itemId)?.[1];
  if (explicit) return explicit;
  const legal = pokemonDataProvider.getSpeciesAbilities(enemySpeciesId);
  return (legal[0] ?? 'naturalcure') as AbilityId;
}

function getRequiredEnemySpecies(itemId: ItemId, fallback: PokemonSpeciesId): PokemonSpeciesId {
  return Object.entries(REQUIRED_ENEMY_SPECIES).find(([candidateId]) => candidateId === itemId)?.[1] ?? fallback;
}

function getRequiredEnemyItem(itemId: ItemId): ItemId | '' {
  return Object.entries(REQUIRED_ENEMY_ITEMS).find(([candidateId]) => candidateId === itemId)?.[1] ?? '';
}

function requiresMaxEnemySpecialAttack(itemId: ItemId): boolean {
  return MAX_SPECIAL_ATTACK_ENEMY_ITEM_IDS.some(triggerItemId => triggerItemId === itemId);
}

function requiresMaxEnemyAttack(itemId: ItemId): boolean {
  return MAX_ATTACK_ENEMY_ITEM_IDS.some(triggerItemId => triggerItemId === itemId);
}

const DEFENSIVE_TRIGGER_SPECIES_BY_ATTACK_TYPE = {
  normal: 'snorlax', fire: 'scizor', water: 'camerupt', grass: 'swampert', electric: 'gyarados', ice: 'dragonite',
  fighting: 'snorlax', poison: 'meganium', ground: 'raichu', flying: 'venusaur', psychic: 'machamp', bug: 'celebi',
  rock: 'charizard', ghost: 'alakazam', dragon: 'dragonite', dark: 'alakazam', steel: 'tyranitar', fairy: 'dragonite',
} as const satisfies Record<PokemonType, PokemonSpeciesId>;

const OFFENSIVE_TARGET_ENEMY_SPECIES_BY_MOVE_TYPE = {
  ghost: 'alakazam',
} as const satisfies Partial<Record<PokemonType, PokemonSpeciesId>>;

const DEFAULT_PLAYER_MOVES: readonly PokemonMoveId[] = ['flamethrower', 'surf', 'closecombat', 'thunderwave'];
const DEFAULT_ENEMY_MOVES: readonly PokemonMoveId[] = ['flamethrower', 'surf', 'toxic', 'swordsdance'];
const CUSTAP_HOLDER_MOVES: readonly PokemonMoveId[] = ['calmmind', 'recover', 'protect', 'substitute'];
const ACCURACY_TRIGGER_ITEM_IDS = ['blunderpolicy', 'widelens', 'zoomlens'] as const satisfies readonly ItemId[];

function requireHookTargetType(itemId: ItemId, hook: unknown): PokemonType | null {
  if (typeof hook !== 'function') return null;
  const match = hook.toString().match(/move\.type === '([^']+)'/);
  if (!match) return null;
  const rawType = match[1];
  if (!rawType) {
    throw new Error(`[FUZZER-ITEMS] Showdown hook for item "${itemId}" has an empty target type.`);
  }
  return toPokemonType(rawType);
}

function requireHookTargetSpecies(itemId: ItemId, hook: unknown): PokemonSpeciesId | null {
  if (typeof hook !== 'function') return null;
  const match = hook.toString().match(/baseSpecies\.num === (\d+)/);
  if (!match) return null;
  const rawSpeciesNum = match[1];
  if (!rawSpeciesNum) {
    throw new Error(`[FUZZER-ITEMS] Showdown hook for item "${itemId}" has an empty restricted species number.`);
  }
  const speciesNum = Number(rawSpeciesNum);
  const species = Dex.species.all().find(candidate => candidate.num === speciesNum);
  if (!species) {
    throw new Error(`[FUZZER-ITEMS] Showdown hook for item "${itemId}" references unknown species #${speciesNum}.`);
  }
  return requirePokemonSpeciesId(species.id);
}

function getRestrictedOrDefaultSpecies(itemId: ItemId, hook: unknown): PokemonSpeciesId {
  const requiredSpecies = Object.entries(REQUIRED_HOLDER_SPECIES).find(([candidateId]) => candidateId === itemId)?.[1];
  if (requiredSpecies) return requiredSpecies;
  const restrictedSpecies = requireHookTargetSpecies(itemId, hook);
  if (restrictedSpecies) return restrictedSpecies;
  return 'mew';
}

function prioritizeMove(move: PokemonMoveId, moves: readonly PokemonMoveId[]): PokemonMoveId[] {
  return [move, ...moves.filter(candidate => candidate !== move)].slice(0, 4);
}

function requiresSupportBench(itemIds: readonly ItemId[], triggerItemIds: readonly ItemId[]): boolean {
  return itemIds.some(itemId => triggerItemIds.some(triggerItemId => triggerItemId === itemId));
}

function createItemlessSupportPokemon(species: PokemonSpeciesId = 'mew'): FuzzerPokemonSet {
  const uid = crypto.randomUUID();
  const gender = getSpeciesLegalGender(species);
  const legalAbilities = pokemonDataProvider.getSpeciesAbilities(species);
  const ability = (legalAbilities[0] ?? 'synchronize') as AbilityId;
  return {
    name: getShowdownNickname(uid),
    species,
    level: 100,
    gender,
    item: '',
    ability,
    nature: 'serious',
    evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: [...DEFAULT_PLAYER_MOVES],
    uid,
  };
}

function getItemTriggerPlan(itemId: ItemId): Pick<ItemTestBatch, 'playerPriorityMove' | 'enemyPriorityMove'> & {
  playerMoves: PokemonMoveId[];
  enemyMoves: PokemonMoveId[];
  playerSpecies: PokemonSpeciesId;
  enemySpecies: PokemonSpeciesId;
} {
  const item = Dex.items.get(itemId);
  if (ACCURACY_TRIGGER_ITEM_IDS.some(triggerItemId => triggerItemId === itemId)) {
    return {
      playerMoves: prioritizeMove('zapcannon', DEFAULT_PLAYER_MOVES),
      enemyMoves: [...DEFAULT_ENEMY_MOVES],
      playerSpecies: itemId === 'zoomlens' ? 'snorlax' : 'mew',
      enemySpecies: itemId === 'zoomlens' ? 'jolteon' : 'blissey',
      playerPriorityMove: 'zapcannon',
    };
  }
  const statusEntry = Object.entries(STATUS_CURE_TRIGGER_MOVES).find(([candidateId]) => candidateId === itemId);
  const statusMove = statusEntry?.[1];
  if (statusMove) {
    return {
      playerMoves: [...DEFAULT_PLAYER_MOVES],
      enemyMoves: prioritizeMove(statusMove, DEFAULT_ENEMY_MOVES),
      playerSpecies: getRestrictedOrDefaultSpecies(itemId, null),
      enemySpecies: 'blissey',
      enemyPriorityMove: statusMove,
    };
  }

  const terrainSeedEntry = Object.entries(TERRAIN_SEED_TRIGGER_MOVES).find(([candidateId]) => candidateId === itemId);
  const terrainSeedMove = terrainSeedEntry?.[1];
  if (terrainSeedMove) {
    return {
      playerMoves: [...DEFAULT_PLAYER_MOVES],
      enemyMoves: prioritizeMove(terrainSeedMove, DEFAULT_ENEMY_MOVES),
      playerSpecies: 'mew',
      enemySpecies: 'blissey',
      enemyPriorityMove: terrainSeedMove,
    };
  }

  const selfFieldEntry = Object.entries(SELF_FIELD_TRIGGER_MOVES).find(([candidateId]) => candidateId === itemId);
  const selfFieldMove = selfFieldEntry?.[1];
  if (selfFieldMove) {
    return {
      playerMoves: prioritizeMove(selfFieldMove, DEFAULT_PLAYER_MOVES),
      enemyMoves: [...DEFAULT_ENEMY_MOVES],
      playerSpecies: getRestrictedOrDefaultSpecies(itemId, null),
      enemySpecies: 'blissey',
      playerPriorityMove: selfFieldMove,
    };
  }

  const enemyHitEntry = Object.entries(ENEMY_HIT_TRIGGER_MOVES).find(([candidateId]) => candidateId === itemId);
  const enemyHitMove = enemyHitEntry?.[1];
  if (enemyHitMove) {
    const isPinchBerry = itemId === 'magoberry' || itemId === 'starfberry' || itemId === 'wikiberry';
    return {
      playerMoves: itemId === 'custapberry' ? [...CUSTAP_HOLDER_MOVES] : itemId === 'micleberry' ? prioritizeMove('zapcannon', DEFAULT_PLAYER_MOVES) : isPinchBerry ? prioritizeMove('swordsdance', DEFAULT_PLAYER_MOVES) : [...DEFAULT_PLAYER_MOVES],
      playerPriorityMove: isPinchBerry ? 'swordsdance' : undefined,
      enemyMoves: prioritizeMove(enemyHitMove, DEFAULT_ENEMY_MOVES),
      playerSpecies: getRestrictedOrDefaultSpecies(itemId, null),
      enemySpecies: 'mew',
      enemyPriorityMove: enemyHitMove,
    };
  }

  const enemyStatusEntry = Object.entries(ENEMY_STATUS_TRIGGER_MOVES).find(([candidateId]) => candidateId === itemId);
  const enemyStatusMove = enemyStatusEntry?.[1];
  if (enemyStatusMove) {
    return {
      playerMoves: [...DEFAULT_PLAYER_MOVES],
      enemyMoves: prioritizeMove(enemyStatusMove, DEFAULT_ENEMY_MOVES),
      playerSpecies: getRestrictedOrDefaultSpecies(itemId, null),
      enemySpecies: 'mew',
      enemyPriorityMove: enemyStatusMove,
    };
  }

  const enemySuperEffectiveEntry = Object.entries(ENEMY_SUPER_EFFECTIVE_TRIGGER_MOVES).find(([candidateId]) => candidateId === itemId);
  const enemySuperEffectiveMove = enemySuperEffectiveEntry?.[1];
  if (enemySuperEffectiveMove) {
    return {
      playerMoves: [...DEFAULT_PLAYER_MOVES],
      enemyMoves: prioritizeMove(enemySuperEffectiveMove, DEFAULT_ENEMY_MOVES),
      playerSpecies: 'scizor',
      enemySpecies: 'mew',
      enemyPriorityMove: enemySuperEffectiveMove,
    };
  }

  const basePowerHook: unknown = Reflect.get(item, 'onBasePower');
  const playerTargetType = requireHookTargetType(itemId, basePowerHook);
  if (playerTargetType) {
    const playerPriorityMove = TYPE_TRIGGER_MOVES[playerTargetType];
    const enemySpecies = Object.entries(OFFENSIVE_TARGET_ENEMY_SPECIES_BY_MOVE_TYPE)
      .find(([candidateType]) => candidateType === playerTargetType)?.[1] ?? 'blissey';
    return {
      playerMoves: prioritizeMove(playerPriorityMove, DEFAULT_PLAYER_MOVES),
      enemyMoves: [...DEFAULT_ENEMY_MOVES],
      playerSpecies: getRestrictedOrDefaultSpecies(itemId, basePowerHook),
      enemySpecies,
      playerPriorityMove,
    };
  }

  const enemyTargetType = requireHookTargetType(itemId, Reflect.get(item, 'onSourceModifyDamage'));
  if (enemyTargetType) {
    const enemyPriorityMove = TYPE_TRIGGER_MOVES[enemyTargetType];
    return {
      playerMoves: [...DEFAULT_PLAYER_MOVES],
      enemyMoves: prioritizeMove(enemyPriorityMove, DEFAULT_ENEMY_MOVES),
      playerSpecies: DEFENSIVE_TRIGGER_SPECIES_BY_ATTACK_TYPE[enemyTargetType],
      enemySpecies: 'mew',
      enemyPriorityMove,
    };
  }

  return {
    playerMoves: [...DEFAULT_PLAYER_MOVES],
    enemyMoves: [...DEFAULT_ENEMY_MOVES],
    playerSpecies: getRestrictedOrDefaultSpecies(itemId, null),
    enemySpecies: 'blissey',
  };
}

export function generateItemTestBatches(batchSize: number = 6): ItemTestBatch[] {
  const dexItems = Dex.items;

  // This fuzzer equips items on Pokémon, so only held battle items belong here.
  // Potions and Poké Balls are exercised through their own inventory/capture UI flows.
  const heldBattleItems = SHOP_ITEMS.filter(i => {
    if (!i.id) return false;
    const dexItem = dexItems.get(i.id);
    
    return i.cat === 'combat_held'
      && !OUT_OF_BATTLE_HELD_ITEM_IDS.some(itemId => itemId === i.id)
      && dexItem
      && dexItem.exists
      && !dexItem.isNonstandard;
  });

  const itemPool = [...new Set(heldBattleItems.map(i => i.id))];
  return generateItemBatches(itemPool, batchSize);
}

export function generateItemBatches(itemPool: ItemId[], batchSize = 6): ItemTestBatch[] {
  const batches: ItemTestBatch[] = [];
  let itemIdx = 0;

  while (itemIdx < itemPool.length) {
    const playerTeam: FuzzerPokemonSet[] = [];
    const enemyTeam: FuzzerPokemonSet[] = [];
    const batchItems: ItemId[] = [];
    const plannedEnemyMoves: PokemonMoveId[][] = [];
    const plannedEnemySpecies: PokemonSpeciesId[] = [];
    let playerPriorityMove: PokemonMoveId | undefined;
    let enemyPriorityMove: PokemonMoveId | undefined;
    let playerPeriodicSwitchEvery: number | undefined;
    let playerVoluntarySwitchObjective: boolean | undefined;
    let disableIpbHealing: boolean | undefined;

    // Llenar equipo del jugador con Mew, equipándole los diferentes items a testear
    for (let p = 0; p < batchSize; p++) {
      if (itemIdx >= itemPool.length) break;

      const itemId = itemPool[itemIdx]!;
      playerPeriodicSwitchEvery = itemId === 'shedshell' || itemId === 'heavydutyboots' ? 1 : undefined;
      playerVoluntarySwitchObjective = itemId === 'shedshell' || undefined;
      disableIpbHealing = itemId === 'custapberry' || itemId === 'micleberry' || undefined;
      const triggerPlan = getItemTriggerPlan(itemId);
      playerPriorityMove = triggerPlan.playerPriorityMove;
      enemyPriorityMove = triggerPlan.enemyPriorityMove;
      plannedEnemyMoves.push(triggerPlan.enemyMoves);
      plannedEnemySpecies.push(triggerPlan.enemySpecies);

      batchItems.push(itemId);

      const pUid = crypto.randomUUID();
      const pNickname = getShowdownNickname(pUid);

      const pHolderAbility = getRequiredHolderAbility(itemId, triggerPlan.playerSpecies);
      const pHolderGender = getSpeciesLegalGender(triggerPlan.playerSpecies);

      // The scripted agent dispatches every move once, exercising physical,
      // special, status, and type-sensitive item hooks before natural completion.
      playerTeam.push({
        name: pNickname,
        species: triggerPlan.playerSpecies,
        level: 100,
        gender: pHolderGender,
        item: itemId,
        ability: pHolderAbility,
        nature: 'serious',
        evs: (MAX_ATTACK_ENEMY_ITEM_IDS as readonly string[]).includes(itemId) // no-domain: Non-domain utility collection or data structure
          ? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          : { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: triggerPlan.playerMoves,
        uid: pUid,
      });

      itemIdx++;
    }

    // El equipo enemigo
    for (let e = 0; e < playerTeam.length; e++) {
      const enemyMoves = plannedEnemyMoves[e];
      const enemySpecies = plannedEnemySpecies[e];
      const itemId = batchItems[e];
      if (!enemyMoves || !itemId) {
        throw new Error(`[FUZZER-ITEMS] Missing enemy trigger plan for item batch slot ${e + 1}.`);
      }
      if (!enemySpecies) {
        throw new Error(`[FUZZER-ITEMS] Missing enemy species trigger plan for item batch slot ${e + 1}.`);
      }
      const eUid = crypto.randomUUID();
      const eNickname = getShowdownNickname(eUid);
      const enemySpecialAttack = requiresMaxEnemySpecialAttack(itemId) ? 252 : 0;
      const enemyAttack = requiresMaxEnemyAttack(itemId) ? 252 : 0;

      const eSpecies = getRequiredEnemySpecies(itemId, enemySpecies);
      const eAbility = getRequiredEnemyAbility(itemId, eSpecies);
      const eGender = getSpeciesLegalGender(eSpecies);

      enemyTeam.push({
        name: eNickname,
        species: eSpecies,
        level: 100,
        gender: eGender,
        item: getRequiredEnemyItem(itemId),
        ability: eAbility,
        nature: 'serious',
        evs: { hp: 252, atk: enemyAttack, def: 252, spa: enemySpecialAttack, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: enemyMoves,
        uid: eUid,
      });
    }

    if (requiresSupportBench(batchItems, PLAYER_BENCH_TRIGGER_ITEM_IDS)) {
      playerTeam.push(createItemlessSupportPokemon('mew'));
    }
    if (requiresSupportBench(batchItems, ENEMY_BENCH_TRIGGER_ITEM_IDS)) {
      enemyTeam.push(createItemlessSupportPokemon('blissey'));
    }

    if (playerTeam.length > 0) {
      PokemonLegalityValidator.assertTeamLegality(playerTeam, `Item Batch ${itemIdx} Player Team`);
      PokemonLegalityValidator.assertTeamLegality(enemyTeam, `Item Batch ${itemIdx} Enemy Team`);
      batches.push({
        playerTeam,
        enemyTeam,
        itemsToTest: batchItems,
        playerPriorityMove,
        enemyPriorityMove,
        playerPeriodicSwitchEvery,
        playerVoluntarySwitchObjective,
        disableIpbHealing,
      });
    }
  }

  return batches;
}
