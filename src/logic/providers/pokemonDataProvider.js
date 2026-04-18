import { shallowRef, readonly } from 'vue';
import { POKEMON_DB } from '@/data/pokemonDB';
import { ABILITY_DATA, POKEMON_ABILITIES } from '@/data/abilities';
import { MOVE_DATA } from '@/data/moves';
import { GYMS } from '@/data/gyms';
import { FIRE_RED_MAPS } from '@/data/maps';
import { NATURE_DATA } from '@/data/natures';

/**
 * PokemonDataProvider
 * 
 * Abstracción para el acceso a la base de datos de Pokémon y datos relacionados.
 * Permite cambiar la fuente de datos (estática vs BD) sin afectar a los consumidores.
 * Garantiza la inmutabilidad retornando copias de los datos originales.
 */

// Estado reactivo para la base de datos (optimizado con shallowRef)
const _pokemonDb = shallowRef(POKEMON_DB);
const _abilityData = shallowRef(ABILITY_DATA);
const _moveData = shallowRef(MOVE_DATA);

/**
 * Realiza una copia profunda de un objeto para evitar mutaciones accidentales.
 * @param {Object} obj 
 * @returns {Object}
 */
const deepClone = (obj) => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj));
};

export const pokemonDataProvider = {
    /**
     * Obtiene los datos básicos de una especie.
     * @param {string} id - ID de la especie (ej: 'bulbasaur')
     * @returns {Object|null}
     */
    getPokemonData(id) {
        const data = _pokemonDb.value[id];
        return data ? deepClone(data) : null;
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
    getAbilityData(name) {
        const data = _abilityData.value[name];
        return data ? deepClone(data) : null;
    },

    /**
     * Obtiene la lista de habilidades posibles para una especie.
     */
    getSpeciesAbilities(speciesId) {
        const list = POKEMON_ABILITIES[speciesId];
        return list ? [...list] : ['Espesura'];
    },

    /**
     * Obtiene datos de un movimiento.
     */
    getMoveData(name) {
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
    getNatureData(name) {
        const data = NATURE_DATA[name];
        return data ? deepClone(data) : null;
    },

    /**
     * Método para actualizar la base de datos (útil para futura integración con BD real)
     * @param {Object} newDb 
     */
    updatePokemonDb(newDb) {
        _pokemonDb.value = newDb;
    }
};
