

import { makePokemon, recalcPokemonStats, getExpNeeded } from '@/logic/pokemon/pokemonFactory';
import { useGameStore } from '@/stores/game';
import { useBattleStore } from '@/stores/battle/battle';
import { useUIStore } from '@/stores/ui';
import { useModalStore } from '@/stores/modals';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { Pokemon, PokemonEgg, PokemonGender } from '@/types/pokemon/pokemon';
import { logger } from '../utils/logger.ts';
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets';
import { requirePokemonMoveId } from '@/data/battle/moves';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

interface DebugPokemon extends Pokemon {
  mapId?: MapRouteId | null
}

interface GenerateParams {
  id?: string
  level?: number
  ivs?: Partial<Pokemon['ivs']> | null
  evs?: Partial<Pokemon['evs']> | null
  isShiny?: boolean
  isGuardian?: boolean
  nature?: string | null
  ability?: string | null
  gender?: 'male' | 'female' | 'genderless' | null
  moves?: string[] | null
  nickname?: string | null
  friendship?: number
  heldItem?: string | null
  mapId?: string | null
  protocol?: string | null
  name?: string | null
  uid?: string
}

function requireMoveIdsForDebugEgg(pokemon: Pokemon) {
  return pokemon.moves.map((move) => {
    if (!move?.id) {
      throw new Error(`[debug] Cannot create egg for ${pokemon.id}: move slot is missing a canonical Showdown move id.`);
    }
    return requirePokemonMoveId(move.id);
  });
}

/**
 * Service for administrative and debug operations related to Pokémon.
 * CLI-First implementation.
 */
export const pokemonDebugService = {
  /**
   * Generates a custom pokemon object with specific overrides.
   */
  generate(params: GenerateParams = {}): Pokemon {
    const {
      id = 'pidgey',
      level = 5,
      ivs = null,
      evs = null,
      isShiny = false,
      isGuardian = false,
      nature = null,
      ability = null,
      gender = null,
      moves = null,
      nickname = null,
      friendship = 70,
      heldItem = null,
      mapId = null,
      protocol = null,
      name = null,
      uid
    } = params;

    const genderMap: Record<'male' | 'female' | 'genderless', PokemonGender> = { male: 'm', female: 'f', genderless: null };
    const mappedGender = gender ? genderMap[gender] : undefined;
    const isEgg = protocol === 'hatch' || protocol === 'hatch_anim' || protocol === 'egg_anim' || protocol === 'egg_silent';
    const p = makePokemon(id, level, { 
      isShiny, 
      nature: nature || undefined, 
      ability: ability || undefined, 
      gender: mappedGender, 
      heldItem: heldItem || undefined,
      obtainedMethod: isEgg ? 'egg' : 'wild',
      bypassWhitelist: true
    });
    if (!p) { const empty: Pokemon = ({} as unknown) as Pokemon; return empty }

    if (uid) {
      p.uid = uid;
    }

    if (mapId) {
      (p as DebugPokemon).mapId = requireMapRouteId(mapId)
    }

    // 2. Apply Overrides
    if (ivs) {
      p.ivs = { ...p.ivs, ...ivs }
    }
    if (evs) {
      p.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...p.evs, ...evs }
    }
    
    if (isGuardian) p.isGuardian = true;
    if (name) p.name = name;
    if (nickname) p.nickname = nickname;
    if (friendship !== undefined) p.friendship = friendship;

    // 3. Handle Moves
    if (moves && Array.isArray(moves)) {
      p.moves = moves
        .filter((m): m is string => typeof m === 'string' && !!m)
        .map((mName: string) => {
          const mData = pokemonDataProvider.getMoveData(mName)
          return { 
            id: mData?.id || mName,
            name: mData?.name || mName, 
            pp: mData?.pp || 35, 
            maxPP: mData?.pp || 35,
            type: mData?.type || 'normal',
            power: mData?.power || 0,
            acc: mData?.acc || 100,
            cat: (mData?.cat || 'physical') as 'physical' | 'special' | 'status'
          };
        }).slice(0, 4);
    }

    // 4. Final Recalc
    recalcPokemonStats(p, true);
    p.hp = p.maxHp;
    p.expNeeded = getExpNeeded(p.level);

    return p;
  },

  /**
   * Adds the pokemon to the state using a specific protocol.
   */
  async executeProtocol(p: Pokemon, protocol: string = 'catch'): Promise<void> {
    const game = useGameStore();
    const ui = useUIStore();
    const animationsEnabled = ui.debugAnimationsEnabled ?? true;

    logger.debug('DEBUG', `Executing ${protocol.toUpperCase()} protocol for ${p.name}`); // text-ok

    switch (protocol) {
      case 'catch':
        // Protocol: Standard catch (wild origin)
        p.obtainedMethod = 'wild';
        game.addPokemon(p, { notify: !animationsEnabled });
        
        if (animationsEnabled) {
          ui.notify(`[DEBUG] Pokémon atrapado: ${p.name}`, '✨');
        }
        break;

      case 'hatch':
      case 'egg_silent': {
        // Protocol: Add UNHATCHED egg to inventory
        const eggForInventory: Partial<PokemonEgg> = {
          uid: `egg_${Temporal.Now.instant().epochMilliseconds}`,
          id: requirePokemonSpeciesId(p.id),
          steps: 1, // 1 step remaining for quick debug testing
          ivs: p.ivs,
          nature: p.nature,
          movesAtBirth: requireMoveIdsForDebugEgg(p),
          abilitySlot: (p as Pokemon & { abilityIndex?: number }).abilityIndex || 0,
          isShiny: p.isShiny,
          isGuardian: p.isGuardian
        };
        
        const state = game.state as Record<string, unknown>; // open-record
        const key = `${p.id}TicketSecs`;
        if (state[key] !== undefined) {
          state[key] = (Number(state[key]) || 0) + 12 * 3600;
        }

        if (!game.state.eggs) game.state.eggs = [];
        const eggSpecies = requirePokemonSpeciesId(p.id);
        const eggToPush: PokemonEgg = {
          uid: `${eggSpecies}-${Temporal.Now.instant().epochMilliseconds}`,
          id: eggSpecies,
          steps: eggForInventory.steps ?? 1,
          ivs: eggForInventory.ivs,
          nature: eggForInventory.nature,
          movesAtBirth: eggForInventory.movesAtBirth,
          abilitySlot: eggForInventory.abilitySlot,
          isShiny: eggForInventory.isShiny,
          isGuardian: eggForInventory.isGuardian,
          ready: false
        };
        game.state.eggs.push(eggToPush);
        ui.notify(`[DEBUG] Huevo de ${p.name} añadido a la mochila`, '🥚');
        await game.save(false);
        break;
      }

      case 'egg_warehouse': {
        // Protocol: Add DaycareEgg directly to Daycare Warehouse (almacén)
        const { useBreedingStore } = await import('@/stores/breeding');
        const breedingStore = useBreedingStore();
        
        const { eggFactory } = await import('@/logic/breeding/eggFactory');
        const egg = eggFactory.createDaycareEgg({
          species: requirePokemonSpeciesId(p.id),
          ivs: p.ivs,
          nature: p.nature,
          movesAtBirth: requireMoveIdsForDebugEgg(p),
          abilityIndex: (p as Pokemon & { abilityIndex?: number }).abilityIndex || 0,
          isShiny: !!p.isShiny,
          cost: 0
        });
        
        breedingStore.warehouseEggs.push(egg);
        if (breedingStore.saveWarehouseEggs) {
          breedingStore.saveWarehouseEggs();
        }
        
        ui.notify(`[DEBUG] Huevo de ${p.name} añadido al almacén de la guardería`, '🥚');
        break;
      }

      case 'hatch_anim':
      case 'egg_anim':
        // Protocol: Visual hatching sequence (VUE MIGRATED)
        p.obtainedMethod = 'egg';
        
        // Add to game state silently first
        game.addPokemon(p, { notify: false });
        
        // Trigger Vue Modal Sequence
        ui.open('HatchAnimation', { pokemon: p });
        break;

      case 'fishing_minigame': {
        const { showFishingIntro, startFishingMinigame } = await import('@/logic/encounters/encounterUI')
        const battleStore = useBattleStore();
        showFishingIntro(p, 50, () => {
          startFishingMinigame(
            p,
            50,
            async () => {
              ui.notify(`¡Pesca exitosa! Iniciando combate...`, '🎣')
              await battleStore._startBattle(p, { 
                locationId: (p as DebugPokemon).mapId || requireMapRouteId('route12'),
                isDebug: true,
                isFishing: true
              })
              const modalStore = useModalStore()
              modalStore.closeAll()
            },
            () => {
              ui.notify('El Pokémon escapó...', '💨')
            }
          )
        })
        break;
      }

      case 'archaeology_minigame': {
        const { showArchaeologyIntro, startArchaeologyMinigame } = await import('@/logic/encounters/encounterUI')
        const battleStore = useBattleStore();
        showArchaeologyIntro(p, 50, () => {
          startArchaeologyMinigame(
            p,
            50,
            async () => {
              ui.notify(`¡Excavación exitosa! Iniciando combate...`, '⛏️')
              await battleStore._startBattle(p, { 
                locationId: (p as DebugPokemon).mapId || requireMapRouteId('mt_moon'),
                isDebug: true,
                isArchaeology: true
              })
              const modalStore = useModalStore()
              modalStore.closeAll()
            },
            () => {
              ui.notify('El fósil se desmoronó...', '💨')
            }
          )
        })
        break;
      }

      default:
        logger.error('DEBUG', `Unknown protocol: ${protocol}`);
    }
  },

  /**
   * Starts a custom encounter.
   */
  async triggerEncounter(p: Pokemon, mapId: string = 'plains'): Promise<void> {
    const routeId = requireMapRouteId(mapId);
    const battleStore = useBattleStore();
    // const _ui = useUIStore();

    // 1. Force flee if there's an active battle
    if (battleStore.isBattleActive) {
      logger.warn('DEBUG', 'Combate activo detectado. Forzando huida del anterior para iniciar el nuevo...');
      await battleStore.endBattle(false, true);
    }

    logger.debug('DEBUG', `Triggering encounter with ${p.name} at ${routeId}`);
    
    // Register as seen
    const game = useGameStore();
    game.registerPokedex(p.id, false);

    // Start battle
    await battleStore._startBattle(p, { 
      locationId: routeId,
      isDebug: true
    });

    const modalStore = useModalStore();
    modalStore.closeAll();
  }
};
