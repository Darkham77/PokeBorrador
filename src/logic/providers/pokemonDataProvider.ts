
import { shallowRef } from 'vue';
import { POKEMON_DB } from '@/data/pokemonDB';
import { ABILITY_DATA, POKEMON_ABILITIES } from '@/data/abilities';
import { MOVE_DATA } from '@/data/moves';
import { GYMS } from '@/data/gyms';
import { FIRE_RED_MAPS } from '@/data/maps';
import { NATURE_DATA } from '@/data/natures';
import { SPECIES_METADATA } from '@/data/speciesMetadata';
import { POKEMON_AESTHETICS } from '@/data/pokedex';

import { getSpriteUrl, getBackSpriteUrl } from '@/data/spriteMapping';

/**
 * PokemonDataProvider
 * 
 * Abstracción para el acceso a la base de datos de Pokémon y datos relacionados.
 * Permite cambiar la fuente de datos (estática vs BD) sin afectar a los consumidores.
 * Garantiza la inmutabilidad retornando copias de los datos originales.
 */

// Estado reactivo para la base de datos (optimizado con shallowRef)
const _pokemonDb = shallowRef(POKEMON_DB as Record<string, any>);
const _abilityData = shallowRef(ABILITY_DATA as Record<string, any>);
const _moveData = shallowRef(MOVE_DATA as Record<string, any>);
const _speciesMetadata = shallowRef(SPECIES_METADATA as Record<string, any>);
const _pokemonAesthetics = shallowRef(POKEMON_AESTHETICS as Record<string, any>);

/**
 * Realiza una copia profunda de un objeto para evitar mutaciones accidentales.
 */
const deepClone = <T>(obj: T): T => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj));
};

export const pokemonDataProvider = {
    /**
     * Obtiene los datos básicos de una especie.
     * @param {string} id - ID de la especie (ej: 'bulbasaur')
     */
    getPokemonData(id: string) {
        if (!id) return null;
        const normalizedId = String(id).toLowerCase();
        const dbData = _pokemonDb.value[normalizedId];
        
        // Merge metadata if available
        const metadata = _speciesMetadata.value[normalizedId];
        const aesthetics = _pokemonAesthetics.value[normalizedId];

        // Si no hay absolutamente nada, entonces sí es null
        if (!dbData && !metadata && !aesthetics) return null;

        const data = dbData ? deepClone(dbData) : {
            name: normalizedId.charAt(0).toUpperCase() + normalizedId.slice(1),
            type: 'normal',
            hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100,
            learnset: []
        };

        data.id = normalizedId;

        return {
            ...data,
            category: metadata?.category || 'Pokémon Desconocido',
            height: metadata?.height || null,
            weight: metadata?.weight || null,
            description: metadata?.description || 'No hay datos disponibles en la Pokédex.',
            isFloating: aesthetics?.floating || false
        };
    },

    /**
     * Obtiene la base de datos completa de Pokémon (solo lectura).
     */
    getPokemonDb() {
        return deepClone(_pokemonDb.value);
    },

    /**
     * Obtiene datos de una habilidad.
     */
    getAbilityData(name: string) {
        const data = _abilityData.value[name];
        return data ? deepClone(data) : null;
    },

    /**
     * Obtiene la lista de habilidades posibles para una especie.
     */
    getSpeciesAbilities(speciesId: string) {
        const list = POKEMON_ABILITIES[speciesId as keyof typeof POKEMON_ABILITIES];
        return list ? [...list] : ['Espesura'];
    },

    /**
     * Obtiene datos de un movimiento.
     */
    getMoveData(name: string) {
        const data = _moveData.value[name];
        return data ? deepClone(data) : null;
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
    getNatureData(name: string) {
        const data = (NATURE_DATA as any)[name];
        return data ? deepClone(data) : null;
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
     * Método para actualizar la base de datos (útil para futura integración con BD real)
     */
    updatePokemonDb(newDb: Record<string, any>) {
        _pokemonDb.value = newDb;
    }
};
