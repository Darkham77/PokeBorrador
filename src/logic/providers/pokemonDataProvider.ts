// [PureVue-Ignore-Length]
import { shallowRef } from 'vue';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { ABILITY_TRANSLATIONS_ES } from '@/data/battle/abilities';
import { GYMS } from '@/data/world/gyms';
import { FIRE_RED_MAPS } from '@/data/world/maps';
import { NATURE_DATA } from '@/data/battle/natures';
import { SPECIES_METADATA } from '@/data/pokemon/speciesMetadata';
import { POKEMON_AESTHETICS, POKEMON_SPRITE_IDS, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION, isEnabledPokemonId } from '@/data/system/constants';
import { MOVE_TRANSLATIONS_ES, requirePokemonMoveId } from '@/data/battle/moves';
import { toPokemonType } from '@/data/battle/types';

import { getSpriteUrl, getBackSpriteUrl } from '@/logic/services/assetService';
import { SHOWDOWN_BOOST_STAT_KEYS, requirePokemonStatus, type MoveEffectBoosts, type ShowdownHitEffect, type ShowdownSecondaryEffect } from '@/types/pokemon/pokemon';
import type { 
    PokemonBaseData, 
    MoveBaseData, 
    SpeciesMetadata, 
    PokemonAesthetics,
    PokemonData,
    NatureBaseData
} from '@/types/system/database';
import { isStatId } from '@/logic/pokemon/statsMath';

interface RawShowdownHitEffect {
    boosts?: Partial<Record<string, number>>;
    chance?: number;
    status?: string;
    volatileStatus?: string;
}

interface RawShowdownSecondaryEffect extends RawShowdownHitEffect {
    self?: RawShowdownHitEffect;
}

function toMoveEffectBoosts(boosts: Partial<Record<string, number>> | undefined): MoveEffectBoosts | undefined {
    if (!boosts) return undefined;
    const result: MoveEffectBoosts = {};
    for (const stat of SHOWDOWN_BOOST_STAT_KEYS) {
        const value = boosts[stat];
        if (value !== undefined) result[stat] = value;
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

function toShowdownHitEffect(effect: RawShowdownHitEffect | undefined): ShowdownHitEffect | undefined {
    if (!effect) return undefined;
    return {
        boosts: toMoveEffectBoosts(effect.boosts),
        status: effect.status ? requirePokemonStatus(effect.status) : undefined,
        volatileStatus: effect.volatileStatus,
    };
}

function toShowdownSecondaryEffect(effect: RawShowdownSecondaryEffect | undefined): ShowdownSecondaryEffect | undefined {
    if (!effect) return undefined;
    return {
        ...toShowdownHitEffect(effect),
        self: toShowdownHitEffect(effect.self),
    };
}

/**
 * PokemonDataProvider
 * 
 * Abstracción para el acceso a la base de datos de Pokémon y datos relacionados.
 * Permite cambiar la fuente de datos (estática vs BD) sin afectar a los consumidores.
 * Garantiza la inmutabilidad retornando copias de los datos originales.
 */

// Estado reactivo para la base de datos (optimizado con shallowRef)
const _pokemonDb = shallowRef(POKEMON_DB as Record<string, PokemonBaseData>); // open-record
const _speciesMetadata = shallowRef(SPECIES_METADATA as Record<string, SpeciesMetadata>); // open-record
const _pokemonAesthetics = shallowRef(POKEMON_AESTHETICS as Record<string, PokemonAesthetics>); // open-record

/** Mapa inverso: número sprite → nombre canónico (ej: 12 → "butterfree") */
const SPRITE_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(POKEMON_SPRITE_IDS).map(([name, num]) => [num, name])
);

function requireMoveCategory(category: string): MoveBaseData['cat'] {
    const normalized = category.toLowerCase(); // text-ok
    if (normalized === 'physical' || normalized === 'special' || normalized === 'status') return normalized;
    throw new Error(`[pokemonDataProvider] Invalid move category from Showdown: ${category}`);
}

/**
 * Realiza una copia profunda de un objeto para evitar mutaciones accidentales.
 */
const deepClone = <T>(obj: T): T => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj)) as T;
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
        const species = Dex.forGen(ACTIVE_GENERATION).species.get(normalizedId);

        const data = deepClone(dbData);

        // Añadimos el id al objeto retornado para conveniencia
        const extendedData = {
            ...data,
            id: requirePokemonSpeciesId(normalizedId),
            category: metadata?.category || 'Pokémon Desconocido',
            height: species?.exists ? species.heightm : null,
            weight: species?.exists ? species.weightkg : null,
            description: metadata?.description || 'No hay datos disponibles en la Pokédex.',
            isFloating: aesthetics?.floating,
            type2: data.type2 || undefined
        };

        return extendedData;
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
        if (!name) throw new Error("Nombre/ID de habilidad no proporcionado");
        let cleanId = toID(name);
        let ability = Dex.abilities.get(cleanId);

        if (!ability || !ability.exists) {
            // Intenta buscar por nombre en español en las traducciones estáticas
            const nameLower = name.trim().toLowerCase(); // text-ok
            const foundEntry = Object.entries(ABILITY_TRANSLATIONS_ES).find(
                ([_, trans]) => trans.name.toLowerCase() === nameLower // text-ok
            );
            if (foundEntry) {
                cleanId = toID(foundEntry[0]);
                ability = Dex.abilities.get(cleanId);
            }
        }

        if (!ability || !ability.exists) {
            throw new Error(`Habilidad no encontrada: ${name}`);
        }

        // Buscar traducción en las traducciones estáticas
        const translated = (ABILITY_TRANSLATIONS_ES as Record<string, { name?: string; desc?: string }>)[cleanId]; // open-record
        if (!translated || !translated.name || !translated.desc) {
            throw new Error(`[pokemonDataProvider] Traducción al español faltante para la habilidad: ${cleanId}`);
        }
        const espName = translated.name;
        const espDesc = translated.desc;

        return {
            id: ability.id,
            name: espName,
            desc: espDesc
        };
    },

    /**
     * Obtiene la lista de habilidades posibles para una especie.
     */
    getSpeciesAbilities(speciesId: string): string[] {
        if (!speciesId) return [];
        const species = Dex.forGen(ACTIVE_GENERATION).species.get(speciesId);
        if (!species || !species.exists) return [];
        
        // Retornar lista de habilidades válidas en Gen 9 de pkms
        return Object.values(species.abilities).map(a => toID(a));
    },

    /**
     * Obtiene datos de un movimiento por ID. Solo acepta IDs oficiales en inglés de Showdown.
     */
    getMoveData(id: string): MoveBaseData {
        if (!id) throw new Error("ID de movimiento no proporcionado");
        const cleanId = toID(id);
        


        let move = Dex.forGen(ACTIVE_GENERATION).moves.get(cleanId);
        if (!move || !move.exists) {
            move = Dex.moves.get(cleanId);
        }
        if (cleanId === 'recharge') {
            const moveId = requirePokemonMoveId('recharge');
            const translated = MOVE_TRANSLATIONS_ES[moveId];
            return {
                id: moveId,
                name: translated.name || 'Recargando',
                power: 0,
                acc: 1000,
                type: 'normal',
                cat: 'status',
                pp: 0,
                priority: 0
            };
        }
        if (!move || !move.exists) {
            throw new Error(`Movimiento no encontrado por ID: ${id}`);
        }

        const moveId = requirePokemonMoveId(move.id);
        const translated = MOVE_TRANSLATIONS_ES[moveId];
        const espName = translated.name || move.name;

        const moveData: MoveBaseData = {
            id: moveId,
            name: espName,
            power: move.basePower,
            acc: move.accuracy === true ? 1000 : move.accuracy,
            type: toPokemonType(move.type.toLowerCase()), // text-ok
            cat: requireMoveCategory(move.category),
            pp: move.pp,
            priority: move.priority || 0,
            boosts: toMoveEffectBoosts(move.boosts),
            secondary: toShowdownSecondaryEffect(move.secondary),
            secondaries: move.secondaries?.map(toShowdownSecondaryEffect).filter((effect): effect is ShowdownSecondaryEffect => effect !== undefined),
            self: toShowdownHitEffect(move.self),
            status: move.status ? requirePokemonStatus(move.status) : undefined,
            volatileStatus: move.volatileStatus,
            sideCondition: move.sideCondition,
            weather: move.weather
        };

        if (move.selfdestruct === 'always') moveData.selfKO = true;
        if (move.recoil) {
            moveData.recoil = move.recoil[0] === 1 && move.recoil[1] === 4 ? 4 : 3;
        }
        if (move.drain) moveData.drain = true;
        if (move.multihit) {
            if (Array.isArray(move.multihit)) {
                const [minHits, maxHits] = move.multihit;
                if (minHits === undefined || maxHits === undefined) {
                    throw new Error(`[pokemonDataProvider] Invalid multihit range for move: ${moveId}`);
                }
                moveData.hits = [minHits, maxHits];
            } else {
                moveData.hits = move.multihit;
            }
        }
        if (move.ohko) moveData.ohko = true;
        if (move.damage === 'level') {
            moveData.levelDmg = true;
        } else if (typeof move.damage === 'number') {
            moveData.fixedDmg = move.damage;
        }
        if (cleanId === 'super_fang') moveData.halfHP = true;
        if (cleanId === 'endeavor') moveData.endeavor = true;
        if (cleanId === 'counter') moveData.counter = true;
        if (cleanId === 'dragon_rage') moveData.fixedDmg = 40;
        if (move.flags && move.flags.sound) moveData.sound = true;

        return moveData;
    },

    /**
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
        const staticData = (NATURE_DATA as Record<string, { name: string; up: string | null; down: string | null; desc: string }>)[cleanId]; // open-record
        if (!staticData) return null;

        const sdNature = Dex.natures.get(cleanId);
        const upStat = sdNature?.plus || staticData.up;
        const downStat = sdNature?.minus || staticData.down;
        
        const natureData: NatureBaseData = {
            name: staticData.name,
            up: upStat && isStatId(upStat) ? upStat : null,
            down: downStat && isStatId(downStat) ? downStat : null,
            desc: staticData.desc
        }
        return natureData;
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
        const nameLower = spanishName.trim().toLowerCase(); // text-ok
        for (const [id, trans] of Object.entries(MOVE_TRANSLATIONS_ES)) {
            if (trans.name.toLowerCase() === nameLower) {
                return id;
            }
        }
        // También intentar coincidencia por ID normalizado
        const possibleId = toID(spanishName);
        if ((MOVE_TRANSLATIONS_ES as Record<string, unknown>)[possibleId]) { // open-record
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
