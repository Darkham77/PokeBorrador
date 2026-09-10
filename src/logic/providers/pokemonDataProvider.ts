// [PureVue-Ignore-Length]
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
 * Abstracción para el acceso a la base de datos de Pokémon y datos relacionados.
 * Permite cambiar la fuente de datos (estática vs BD) sin afectar a los consumidores.
 * Garantiza la inmutabilidad retornando copias de los datos originales.
 */

// Estado reactivo para la base de datos (optimizado con shallowRef)
const _pokemonDb = shallowRef(POKEMON_DB as Record<string, PokemonBaseData>); // open-record: Generic key-value data dictionary container
const _speciesMetadata = shallowRef(SPECIES_METADATA as Record<string, SpeciesMetadata>); // open-record: Generic key-value data dictionary container
const _pokemonAesthetics = shallowRef(POKEMON_AESTHETICS as Record<string, PokemonAesthetics>); // open-record: Generic key-value data dictionary container

/** Mapa inverso: número sprite → nombre canónico (ej: 12 → "butterfree") */
const SPRITE_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(POKEMON_SPRITE_IDS).map(([name, num]) => [num, name])
);


/**
 * Realiza una copia profunda de un objeto para evitar mutaciones accidentales.
 */
const deepClone = <T>(obj: T): T => {
    if (!obj) return obj;
    return structuredClone(obj);
};

export const pokemonDataProvider = {
    /**
     * Obtiene los datos básicos de una especie.
     * @param {string} id - ID de la especie (ej: 'bulbasaur')
     */
    getPokemonData(id: string, bypassWhitelist = false): PokemonData {
        if (!id) throw new Error("ID de especie no proporcionado");
        let normalizedId = String(id).toLowerCase();

        // Si el ID es numérico, resolverlo al nombre canónico usando el mapa inverso
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

        // Añadimos el id al objeto retornado para conveniencia
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
     * Obtiene la base de datos completa de Pokémon (solo lectura).
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
     * Obtiene datos de una habilidad.
     */
    getAbilityData(name: string) {
        if (!name) throw new Error("Nombre/ID de habilidad no proporcionado");
        let cleanId = toID(name);
        let translated = (ABILITY_TRANSLATIONS_ES as Record<string, { name?: string; desc?: string; icon?: string }>)[cleanId]; // open-record: Generic key-value data dictionary container

        if (!translated) {
            // Intenta buscar por nombre en español en las traducciones estáticas
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
     * Obtiene la lista de habilidades posibles para una especie.
     */
    getSpeciesAbilities(speciesId: PokemonSpeciesId): readonly AbilityId[] {
        if (!speciesId) return [];
        const data = POKEMON_DB[speciesId];
        if (!data || !data.abilities) return [];
        return data.abilities;
    },

    /**
     * Obtiene el rendimiento de EVs (EV Yield) de una especie al ser derrotada.
     */
    getEvYield(speciesId: PokemonSpeciesId): EvYield {
        if (!speciesId) return {};
        const cleanId = requirePokemonSpeciesId(toID(speciesId));
        return getEvYieldForSpecies(cleanId);
    },

    /**
     * Obtiene datos de un movimiento por ID. Solo acepta IDs oficiales en inglés de Showdown.
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
     * Obtiene la lista de todos los gimnasios.
     */
    getGyms() {
        return deepClone(GYMS);
    },

    /**
     * Obtiene la lista de mapas y rutas.
     */
    getMaps() {
        return deepClone(FIRE_RED_MAPS);
    },

    /**
     * Obtiene los modificadores de una naturaleza.
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
     * Obtiene la URL del sprite.
     */
    getSpriteUrl(id: string, isShiny: boolean = false) {
        return getSpriteUrl(id, isShiny);
    },

    /**
     * Obtiene la URL del sprite de espalda.
     */
    getBackSpriteUrl(id: string, isShiny: boolean = false) {
        return getBackSpriteUrl(id, isShiny);
    },

    /**
     * Resuelve el nombre visible de una especie a partir de su ID de base de datos,
     * saneando códigos internos o sufijos evolutivos (como eevee_thunder).
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
        // Fallback: capitalizar y quitar sufijos
        const base = normalizedId.split('_')[0] || normalizedId;
        return base.charAt(0).toUpperCase() + base.slice(1);
    },

    /**
     * Resuelve el ID de un movimiento a partir de su nombre en español.
     * Lanza error si no se encuentra.
     */
    getMoveIdBySpanishName(spanishName: string): string {
        const nameLower = spanishName.trim().toLowerCase(); // text-ok: UI text display localization string
        for (const [id, trans] of Object.entries(MOVE_TRANSLATIONS_ES)) {
            if (trans.name.toLowerCase() === nameLower) {
                return id;
            }
        }
        // También intentar coincidencia por ID normalizado
        const possibleId = toID(spanishName);
        if ((MOVE_TRANSLATIONS_ES as Record<string, unknown>)[possibleId]) { // open-record: Generic key-value data dictionary container
            return possibleId;
        }
        throw new Error(`No se pudo resolver el movimiento a partir del nombre en español: ${spanishName}`);
    },

    /**
     * Método para actualizar la base de datos (útil para futura integración con BD real)
     */
    updatePokemonDb(newDb: Record<string, PokemonBaseData>) {
        _pokemonDb.value = newDb;
    }
};
