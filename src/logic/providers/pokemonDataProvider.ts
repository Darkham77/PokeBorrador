import { shallowRef } from 'vue';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { ABILITY_TRANSLATIONS_ES, ABILITIES_BY_SPANISH_NAME, type AbilityId } from '@/data/battle/abilities';
import { GYMS } from '@/data/world/gyms';
import { FIRE_RED_MAPS } from '@/data/world/maps';
import { NATURE_DATA, isNatureId, toNatureId } from '@/data/battle/natures';
import { SPECIES_METADATA } from '@/data/pokemon/speciesMetadata';
import { POKEMON_AESTHETICS, POKEMON_SPRITE_IDS, requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { toID } from '@/logic/utils/strings.ts';
import { isEnabledPokemonId } from '@/data/system/constants';
import { MOVE_TRANSLATIONS_ES, requirePokemonMoveId } from '@/data/battle/moves';
import { getStaticMoveData, hasMoveData } from '@/data/battle/movesData';
import { isPokemonType } from '@/data/battle/types';

import { getSpriteUrl, getBackSpriteUrl } from '@/logic/services/assetService';
import { getEvYieldForSpecies, type EvYield } from '@/data/pokemon/evYields';
import type { 
    PokemonBaseData, 
    MoveBaseData, 
    SpeciesMetadata, 
    PokemonAesthetics,
    PokemonData,
    NatureBaseData
} from '@/types/system/database';

/**
 * PokemonDataProvider
 * 
 * Abstraction for accessing Pokémon and related database records.
 * Enables switching data sources (static vs DB) without impacting consumers.
 * Guarantees immutability by returning copies of original data.
 */

// Reactive state for database (optimized with shallowRef)
const _pokemonDb = shallowRef(POKEMON_DB as Record<string, PokemonBaseData>); // open-record: Generic key-value data dictionary container
const _speciesMetadata = shallowRef(SPECIES_METADATA as Record<string, SpeciesMetadata>); // open-record: Generic key-value data dictionary container
const _pokemonAesthetics = shallowRef(POKEMON_AESTHETICS as Record<string, PokemonAesthetics>); // open-record: Generic key-value data dictionary container

/** Inverse map: sprite number → canonical name (e.g. 12 → "butterfree") */
const SPRITE_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(POKEMON_SPRITE_IDS).map(([name, num]) => [num, name])
);


/**
 * Performs a deep clone of an object to avoid accidental mutations.
 */
const deepClone = <T>(obj: T): T => {
    if (!obj) return obj;
    return structuredClone(obj);
};

export const pokemonDataProvider = {
    /**
     * Gets basic data for a species.
     * @param id - Species ID (e.g. 'bulbasaur')
     */
    getPokemonData(id: string, bypassWhitelist = false): PokemonData {
        if (!id) throw new Error("ID de especie no proporcionado");
        let normalizedId = String(id).toLowerCase();

        // If ID is numeric, resolve to canonical name using inverse map
        const asNum = parseInt(normalizedId, 10);
        if (!isNaN(asNum) && String(asNum) === normalizedId && SPRITE_ID_TO_NAME[asNum]) {
            normalizedId = SPRITE_ID_TO_NAME[asNum];
        }
        const dbData = _pokemonDb.value[normalizedId];
        if (!dbData) {
            throw new Error(`Especie de Pokémon no encontrada: ${id}`);
        }

        const isE2E = typeof globalThis !== 'undefined' && Boolean(Reflect.get(globalThis, '__E2E__'));
        const isDebug = bypassWhitelist
            || (import.meta.env?.DEV === true && process.env.NODE_ENV !== 'test')
            || isE2E
            || (typeof window !== 'undefined' && (!!window.__VITE_DEBUG__ || window.location.search.includes('debug')));
        if (!isEnabledPokemonId(normalizedId) && !isDebug) {
            throw new Error(`Especie de Pokémon no habilitada por la whitelist global: ${id}`);
        }
        
        // Merge metadata if available
        const metadata = _speciesMetadata.value[normalizedId];
        const aesthetics = _pokemonAesthetics.value[normalizedId];
        const data = deepClone(dbData);
        const height = data.height ?? 0.1;
        const weight = data.weight ?? 0.1;

        // Append id to returned object for convenience
        const extendedData = {
            ...data,
            id: requirePokemonSpeciesId(normalizedId),
            category: metadata?.category || 'Pokémon Desconocido',
            height,
            weight,
            description: metadata?.description || 'No hay datos disponibles en la Pokédex.',
            isFloating: aesthetics?.floating,
            type2: data.type2 || undefined
        };


        return extendedData;
    },

    /**
     * Gets complete Pokémon database (read-only).
     */
    getPokemonDb(): Record<string, PokemonBaseData> {
        const raw = _pokemonDb.value;
        const result: Record<string, PokemonBaseData> = {};
        for (const key of Object.keys(raw)) {
            const entry = raw[key];
            if (entry) result[key] = entry;
        }
        return result;
    },

    /**
     * Gets ability data.
     */
    getAbilityData(name: string) {
        if (!name) throw new Error("Nombre/ID de habilidad no proporcionado");
        let cleanId = toID(name);
        let translated = (ABILITY_TRANSLATIONS_ES as Record<string, { name?: string; desc?: string; icon?: string }>)[cleanId]; // open-record: Generic key-value data dictionary container

        if (!translated) {
            // Attempt lookup by Spanish name in static translations
            const nameLower = name.trim().toLowerCase(); // text-ok: UI text display localization string
            const spanishId = ABILITIES_BY_SPANISH_NAME[nameLower];
            if (spanishId) {
                cleanId = toID(spanishId);
                translated = (ABILITY_TRANSLATIONS_ES as Record<string, { name?: string; desc?: string; icon?: string }>)[cleanId]; // open-record: Generic key-value data dictionary container
            }
        }

        if (!translated || !translated.name || !translated.desc) {
            throw new Error(`Habilidad no encontrada: ${name}`);
        }

        return {
            id: cleanId,
            name: translated.name,
            desc: translated.desc,
            icon: translated.icon || '✨'
        };
    },

    /**
     * Gets list of potential abilities for a species.
     */
    getSpeciesAbilities(speciesId: PokemonSpeciesId): readonly AbilityId[] {
        if (!speciesId) return [];
        const data = POKEMON_DB[speciesId];
        if (!data || !data.abilities) return [];
        return data.abilities;
    },

    /**
     * Gets EV yield for a species upon defeat.
     */
    getEvYield(speciesId: PokemonSpeciesId): EvYield {
        if (!speciesId) return {};
        const cleanId = requirePokemonSpeciesId(toID(speciesId));
        return getEvYieldForSpecies(cleanId);
    },

    /**
     * Gets move data by ID. Only accepts official English Showdown IDs.
     */
    getMoveData(id: string): MoveBaseData {
        if (!id) throw new Error("ID de movimiento no proporcionado");
        const cleanId = toID(id);
        
        if (cleanId === 'recharge') {
            const moveId = requirePokemonMoveId('recharge');
            const translated = MOVE_TRANSLATIONS_ES[moveId];
            return {
                id: moveId,
                name: translated.name || 'Recargando', // spanish-ok: UI Spanish text localization label
                power: 0,
                acc: 1000,
                type: 'normal',
                cat: 'status',
                pp: 0,
                priority: 0
            };
        }

        if (hasMoveData(cleanId)) {
            const staticMove = getStaticMoveData(cleanId);
            if (staticMove) return staticMove;
        }

        if (cleanId.startsWith('hiddenpower') && cleanId.length > 'hiddenpower'.length) {
            const subType = cleanId.slice('hiddenpower'.length);
            if (isPokemonType(subType) && hasMoveData('hiddenpower')) {
                const baseMove = getStaticMoveData('hiddenpower');
                if (baseMove) {
                    return {
                        ...baseMove,
                        id: requirePokemonMoveId('hiddenpower'),
                        type: subType
                    };
                }
            }
        }

        throw new Error(`Movimiento no encontrado por ID: ${id}`);
    },

    /**
     * Gets list of all gyms.
     */
    getGyms() {
        return deepClone(GYMS);
    },

    /**
     * Gets list of maps and routes.
     */
    getMaps() {
        return deepClone(FIRE_RED_MAPS);
    },

    /**
     * Gets nature modifiers.
     */
    getNatureData(name: string): NatureBaseData | null {
        if (!name) return null;
        const cleanId = toID(name);
        if (!isNatureId(cleanId)) return null;
        const natureId = toNatureId(cleanId);
        const staticData = NATURE_DATA[natureId];

        return {
            name: staticData.name,
            up: staticData.plus,
            down: staticData.minus,
            desc: staticData.desc
        };
    },

    /**
     * Gets sprite URL.
     */
    getSpriteUrl(id: string, isShiny: boolean = false) {
        return getSpriteUrl(id, isShiny);
    },

    /**
     * Gets back sprite URL.
     */
    getBackSpriteUrl(id: string, isShiny: boolean = false) {
        return getBackSpriteUrl(id, isShiny);
    },

    /**
     * Resolves visible species name from its database ID,
     * sanitizing internal codes or evolutionary suffixes (such as eevee_thunder).
     */
    resolveSpeciesName(id: string): string {
        if (!id) return '';
        const normalizedId = String(id).toLowerCase();
        if (normalizedId.startsWith('eevee_')) {
            return 'Eevee';
        }
        const dbData = _pokemonDb.value[normalizedId];
        if (dbData) {
            return dbData.name;
        }
        // Fallback: capitalize and remove suffixes
        const base = normalizedId.split('_')[0] || normalizedId;
        return base.charAt(0).toUpperCase() + base.slice(1);
    },

    /**
     * Resolves move ID from its Spanish name.
     * Throws error if not found.
     */
    getMoveIdBySpanishName(spanishName: string): string {
        const nameLower = spanishName.trim().toLowerCase(); // text-ok: UI text display localization string
        for (const [id, trans] of Object.entries(MOVE_TRANSLATIONS_ES)) {
            if (trans.name.toLowerCase() === nameLower) {
                return id;
            }
        }
        // Also attempt match by normalized ID
        const possibleId = toID(spanishName);
        if ((MOVE_TRANSLATIONS_ES as Record<string, unknown>)[possibleId]) { // open-record: Generic key-value data dictionary container
            return possibleId;
        }
        throw new Error(`No se pudo resolver el movimiento a partir del nombre en español: ${spanishName}`);
    },

    /**
     * Method to update database (useful for future real DB integration)
     */
    updatePokemonDb(newDb: Record<string, PokemonBaseData>) {
        _pokemonDb.value = newDb;
    }
};
