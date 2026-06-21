// [PureVue-Ignore-Length]
import { shallowRef } from 'vue';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { ABILITY_TRANSLATIONS_ES } from '@/data/battle/abilities';
import { GYMS } from '@/data/world/gyms';
import { FIRE_RED_MAPS } from '@/data/world/maps';
import { NATURE_DATA } from '@/data/battle/natures';
import { SPECIES_METADATA } from '@/data/pokemon/speciesMetadata';
import { POKEMON_AESTHETICS, POKEMON_SPRITE_IDS } from '@/data/pokemon/pokedex';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '@/data/system/constants';
import { MOVE_TRANSLATIONS_ES } from '@/data/battle/moves';

import { getSpriteUrl, getBackSpriteUrl } from '@/logic/services/assetService';
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
const _pokemonDb = shallowRef(POKEMON_DB as Record<string, PokemonBaseData>);
const _speciesMetadata = shallowRef(SPECIES_METADATA as Record<string, SpeciesMetadata>);
const _pokemonAesthetics = shallowRef(POKEMON_AESTHETICS as Record<string, PokemonAesthetics>);

/** Mapa inverso: número sprite → nombre canónico (ej: 12 → "butterfree") */
const SPRITE_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(POKEMON_SPRITE_IDS).map(([name, num]) => [num, name])
);

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
    getPokemonData(id: string): PokemonData {
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
        
        // Merge metadata if available
        const metadata = _speciesMetadata.value[normalizedId];
        const aesthetics = _pokemonAesthetics.value[normalizedId];

        const data = deepClone(dbData);

        // Añadimos el id al objeto retornado para conveniencia
        const extendedData = {
            ...data,
            id: normalizedId,
            category: metadata?.category || 'Pokémon Desconocido',
            height: metadata?.height || null,
            weight: metadata?.weight || null,
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
        const cleanId = toID(name);
        const ability = Dex.abilities.get(cleanId);
        if (!ability || !ability.exists) {
            throw new Error(`Habilidad no encontrada: ${name}`);
        }

        // Buscar traducción en las traducciones estáticas
        const translated = (ABILITY_TRANSLATIONS_ES[cleanId] || {}) as { name?: string; desc?: string };
        const espName = translated.name || ability.name;
        const espDesc = translated.desc || ability.desc || 'Sin descripción disponible.';

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
        
        // Retornar lista de habilidades válidas en Gen 3 de pkms
        return Object.values(species.abilities).map(a => toID(a));
    },

    /**
     * Obtiene datos de un movimiento por ID. Solo acepta IDs oficiales en inglés de Showdown.
     */
    getMoveData(id: string): MoveBaseData {
        if (!id) throw new Error("ID de movimiento no proporcionado");
        const cleanId = toID(id);
        const move = Dex.forGen(ACTIVE_GENERATION).moves.get(cleanId);
        if (!move || !move.exists) {
            throw new Error(`Movimiento no encontrado por ID: ${id}`);
        }

        // Traducir nombre y descripción usando MOVE_TRANSLATIONS_ES[cleanId]
        const translated = (MOVE_TRANSLATIONS_ES[cleanId] || {}) as { name?: string; desc?: string };
        const espName = translated.name || move.name;

        const SPECIAL_EFFECTS: Record<string, string> = {
            metronome: 'metronome',
            mirrormove: 'mirror_move',
            sandstorm: 'sandstorm',
            raindance: 'rain_dance',
            sunnyday: 'sunny_day',
            hail: 'hail',
            spikes: 'spikes',
            destinybond: 'destiny_bond',
            grudge: 'grudge',
            yawn: 'yawn',
            rest: 'rest',
            recover: 'heal_50',
            slackoff: 'heal_50',
            softboiled: 'heal_50',
            synthesis: 'heal_50',
            milkdrink: 'heal_50',
            healbell: 'heal_bell',
            furycutter: 'fury_cutter',
            rapidspin: 'rapid_spin',
            brickbreak: 'brick_break',
            focuspunch: 'focus_punch',
            spitup: 'spit_up',
            stockpile: 'stockpile',
            dreameater: 'dream_eater',
            teleport: 'teleport',
            covet: 'covet',
            rage: 'rage',
            futuresight: 'future_sight',
            psychup: 'psych_up',
            charge: 'charge',
            curse: 'curse',
            flail: 'hp_scale',
            reversal: 'hp_scale',
            waterspout: 'hp_scale_high',
            snore: 'flinch_30',
            hyperbeam: 'recharge',
            wish: 'wish',
            outrage: 'locked_move',
            thrash: 'locked_move',
            petaldance: 'locked_move',
            ragingfury: 'locked_move',
            uproar: 'locked_move',
            bind: 'partially_trapped',
            wrap: 'partially_trapped',
            clamp: 'partially_trapped',
            firespin: 'partially_trapped',
            infestation: 'partially_trapped',
            magmastorm: 'partially_trapped',
            sandtomb: 'partially_trapped',
            snaptrap: 'partially_trapped',
            thundercage: 'partially_trapped',
            whirlpool: 'partially_trapped',
            disable: 'disable',
            encore: 'encore',
            toxicspikes: 'toxic_spikes',
            stealthrock: 'stealth_rock',
        };

        let localEffect: string | undefined = SPECIAL_EFFECTS[cleanId];

        if (!localEffect && move.secondaries && move.secondaries.length > 0) {
            const sec = move.secondaries[0];
            if (sec) {
                const chance = sec.chance !== undefined ? `_${sec.chance}` : '';
                if (sec.status) {
                    const map: Record<string, string> = { par: 'paralyze', brn: 'burn', frz: 'freeze', psn: 'poison', tox: 'poison', slp: 'sleep' };
                    if (map[sec.status]) localEffect = `${map[sec.status]}${chance}`;
                } else if (sec.volatileStatus === 'flinch') {
                    localEffect = `flinch${chance}`;
                } else if (sec.volatileStatus === 'confusion') {
                    localEffect = `confuse${chance}`;
                } else if (sec.boosts) {
                    const statMap: Record<string, string> = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };
                    const entries = Object.entries(sec.boosts);
                    if (entries.length > 0) {
                        const [stat, val] = entries[0] as [string, number];
                        const localStat = statMap[stat];
                        if (localStat) {
                            const dir = val > 0 ? 'up' : 'down';
                            const who = sec.self ? 'self' : 'enemy';
                            const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
                            localEffect = `stat_${dir}_${who}_${localStat}${stage}${chance}`;
                        }
                    }
                }
            }
        }

        if (!localEffect && move.status) {
            const map: Record<string, string> = { par: 'paralyze', brn: 'burn', frz: 'freeze', psn: 'poison', tox: 'poison', slp: 'sleep' };
            if (map[move.status]) localEffect = map[move.status];
        }

        if (!localEffect && move.volatileStatus === 'confusion') {
            localEffect = 'confuse';
        }

        if (!localEffect && move.self && move.self.boosts) {
            const statMap: Record<string, string> = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };
            const entries = Object.entries(move.self.boosts);
            if (entries.length > 0) {
                const [stat, val] = entries[0] as [string, number];
                const localStat = statMap[stat];
                if (localStat) {
                    const dir = val > 0 ? 'up' : 'down';
                    const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
                    const chance = move.self.chance !== undefined ? `_${move.self.chance}` : '';
                    localEffect = `stat_${dir}_self_${localStat}${stage}${chance}`;
                }
            }
        }

        if (!localEffect && move.boosts) {
            const statMap: Record<string, string> = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe', accuracy: 'acc', evasion: 'eva' };
            const entries = Object.entries(move.boosts);
            if (entries.length > 0) {
                const [stat, val] = entries[0] as [string, number];
                const localStat = statMap[stat];
                if (localStat) {
                    const dir = val > 0 ? 'up' : 'down';
                    const who = move.target === 'self' ? 'self' : 'enemy';
                    const stage = Math.abs(val) > 1 ? `_${Math.abs(val)}` : '';
                    localEffect = `stat_${dir}_${who}_${localStat}${stage}`;
                }
            }
        }

        const moveData: MoveBaseData = {
            id: move.id,
            name: espName,
            power: move.basePower,
            acc: move.accuracy === true ? 1000 : move.accuracy,
            type: move.type.toLowerCase(),
            cat: move.category.toLowerCase() as 'physical' | 'special' | 'status',
            pp: move.pp,
            priority: move.priority || 0,
            effect: localEffect
        };

        if (move.selfdestruct === 'always') moveData.selfKO = true;
        if (move.recoil) {
            moveData.recoil = move.recoil[0] === 1 && move.recoil[1] === 4 ? 4 : 3;
        }
        if (move.drain) moveData.drain = true;
        if (move.multihit) {
            moveData.hits = Array.isArray(move.multihit) ? `${move.multihit[0]}-${move.multihit[1]}` : move.multihit;
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
        const staticData = (NATURE_DATA as Record<string, { name: string; up: string | null; down: string | null; desc: string }>)[cleanId];
        if (!staticData) return null;

        const sdNature = Dex.natures.get(cleanId);
        
        // Mapear los nombres de stats de pkms a los locales si existen
        const statMap: Record<string, string> = {
            hp: 'HP',
            atk: 'Ataque',
            def: 'Defensa',
            spa: 'At. Esp',
            spd: 'Def. Esp',
            spe: 'Velocidad'
        };

        const upStat = sdNature.plus ? statMap[sdNature.plus] || sdNature.plus : null;
        const downStat = sdNature.minus ? statMap[sdNature.minus] || sdNature.minus : null;

        return {
            name: staticData.name,
            up: upStat,
            down: downStat,
            desc: staticData.desc
        } as NatureBaseData;
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
        const nameLower = spanishName.trim().toLowerCase();
        for (const [id, trans] of Object.entries(MOVE_TRANSLATIONS_ES)) {
            if (trans.name.toLowerCase() === nameLower) {
                return id;
            }
        }
        // También intentar coincidencia por ID normalizado
        const possibleId = toID(spanishName);
        if (MOVE_TRANSLATIONS_ES[possibleId]) {
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
