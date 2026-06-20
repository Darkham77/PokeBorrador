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

import { getSpriteUrl, getBackSpriteUrl } from '@/data/pokemon/spriteMapping';
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
    getPokemonData(id: string): PokemonData | null {
        if (!id) return null;
        let normalizedId = String(id).toLowerCase();

        // Si el ID es numérico, resolverlo al nombre canónico usando el mapa inverso
        const asNum = parseInt(normalizedId, 10);
        if (!isNaN(asNum) && String(asNum) === normalizedId && SPRITE_ID_TO_NAME[asNum]) {
            normalizedId = SPRITE_ID_TO_NAME[asNum];
        }
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
            catchRate: 100,
            learnset: []
        } as PokemonBaseData;

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
        if (!name) return null;
        const cleanId = toID(name);
        const ability = Dex.abilities.get(cleanId);
        if (!ability || !ability.exists) return null;

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
    getMoveData(id: string): MoveBaseData | null {
        if (!id) return null;
        const cleanId = toID(id);
        const move = Dex.forGen(ACTIVE_GENERATION).moves.get(cleanId);
        if (!move || !move.exists) return null;

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
     * Mapea un nombre de movimiento legacy (ej: "Rayo Solar") a su ID en inglés (ej: "solar_beam").
     */
    resolveMoveId(name: string): string {
        if (!name) return '';
        const lowerName = name.toLowerCase().trim();
        
        const LEGACY_MOVE_MAPPING: Record<string, string> = {
            'placaje': 'tackle',
            'ataque': 'tackle',
            'bofetón lodo': 'mud_slap',
'portazo': 'slam',
            'atizar': 'slam',
            'destructor': 'pound',
            'puñetazo': 'pound',
            'picotazo': 'peck',
            'picoteo': 'peck',
            'golpe cabeza': 'headbutt',
            'cabezazo': 'headbutt',
            'persecución': 'pursuit',
            'seguimiento': 'pursuit',
            'rodar': 'rollout',
            'desenrrollar': 'rollout',
            'cola': 'tail_whip',
            'látigo': 'tail_whip',
'más psique': 'psych_up',
            'zap cannon': 'zap_cannon',
            'electrocañón': 'zap_cannon',
'chispa': 'spark',
            'envolver': 'wrap',
            'constricción': 'constrict',
            'bola lodo': 'sludge_bomb',
            'danza dragón': 'dragon_dance',
            'llantopanto': 'fake_tears',
            'onda sónica': 'sonic_boom',
            'chupa-vidas': 'leech_life',
            'rayo solar': 'solar_beam',
            'hoja afilada': 'razor_leaf',
            'látigo cepa': 'vine_whip',
            'polvo veneno': 'poison_powder',
            'somnífera': 'sleep_powder',
            'derribo': 'take_down',
            'dulce aroma': 'sweet_scent',
            'desarrollo': 'growth',
            'drenadoras': 'leech_seed',
            'cuchillada': 'slash',
            'doble bofetón': 'double_slap',
            'pisotón': 'stomp',
            'doble patada': 'double_kick',
            'golpe cuerpo': 'body_slam',
            'retribución': 'return',
            'enfado': 'outrage',
            'golpe': 'thrash',
            'patada ígnea': 'blaze_kick',
            'patada salto alta': 'high_jump_kick',
            'patada salto': 'jump_kick',
'engullir': 'swallow',
            'puño cometa': 'comet_punch',
            'bomba huevo': 'egg_bomb',
            'huevo bomba': 'egg_bomb',
            'alboroto': 'uproar',
            'triturar': 'crunch',
            'paralizador': 'stun_spore',
            'disparo demora': 'string_shot',
            'bucle arena': 'sand_tomb',
            'golpes furia': 'fury_swipes',
            'colmillo veneno': 'poison_fang',
            'puño meteoro': 'meteor_mash',
            'fuego fatuo': 'will_o_wisp',
            'vozarrón': 'hyper_voice',
            'niebla': 'haze',
            'impresionar': 'astonish',
            'danza pétalo': 'petal_dance',
            'aromaterapia': 'aromatherapy',
            'megacuerno': 'megahorn',
            'fortaleza': 'harden',
            'defensa férrea': 'iron_defense',
            'danza espada': 'swords_dance',
            'amnesia': 'amnesia',
            'rugido': 'roar',
            'canto': 'sing',
            'supersónico': 'supersonic',
            'salpicadura': 'splash',
            'furia': 'rage',
            'malicioso': 'leer',
            'chirrido': 'screech',
            'día de pago': 'pay_day',
            'finta': 'feint_attack',
            'venganza': 'bide',
            'contoneo': 'swagger',
            'tajo cruzado': 'cross_chop',
            'rastreo': 'odor_sleuth',
            'rueda fuego': 'flame_wheel',
            'tambor': 'belly_drum',
            'premonición': 'future_sight',
            'kinético': 'kinesis',
            'truco': 'trick',
'tiro vital': 'vital_throw',
            'velocidad extrema': 'extreme_speed',
            'fisura': 'fissure',
            'metrónomo': 'metronome',
            'sorpresa': 'fake_out',
            'tormenta arena': 'sandstorm',
            'relevo': 'baton_pass',
            'canto mortal': 'perish_song',
            'frío polar': 'sheer_cold',
            'fijar blanco': 'lock_on',
            'eco metálico': 'metal_sound',
            'corte furia': 'fury_cutter',
            'falso tortazo': 'false_swipe',
            'viento hielo': 'icy_wind',
            'armadura ácida': 'acid_armor',
            'rencor': 'spite',
            'mal de ojo': 'mean_look',
            'mismodestino': 'destiny_bond',
            'puño sombra': 'shadow_punch',
            'arraigo': 'ingrain',
            'cosquillas': 'tickle',
            'puño mareo': 'dizzy_punch',
            'aguante': 'endure',
            'ciclón': 'twister',
            'cascada': 'waterfall',
            'giro rápido': 'rapid_spin',
            'reciclaje': 'recycle',
            'disparo lodo': 'mud_shot',
            'amortiguador': 'soft_boiled',
            'bostezo': 'yawn',
            'anulación': 'disable',
            'otra vez': 'encore',
            'foco energía': 'focus_energy',
            'refuerzo': 'helping_hand',
            'conversión 2': 'conversion_2',
            'conversión': 'conversion',
            'ronquido': 'snore',
            'sonámbulo': 'sleep_talk',
            'bloqueo': 'block',
            'detección': 'detect',
            'onda ígnea': 'heat_wave',
            'ataque aéreo': 'sky_attack',
            'rapidez': 'swift',
            'camuflaje': 'camouflage',
            'masa cósmica': 'cosmic_power',
            'arañazo': 'scratch',
            'garra metal': 'metal_claw',
            'pantalla humo': 'smokescreen',
            'furia dragón': 'dragon_rage',
            'cara susto': 'scary_face',
            'ataque ala': 'wing_attack',
            'remolino': 'whirlwind',
            'súper colmillo': 'super_fang',
            'ácido': 'acid',
            'rizo defensa': 'defense_curl',
            'gigadrenado': 'giga_drain',
            'psicorrayo': 'psybeam',
            'luz lunar': 'moonlight',
            'hipnosis': 'hypnosis',
            'ascuas': 'ember',
            'lanzallamas': 'flamethrower',
            'giro fuego': 'fire_spin',
            'llamarada': 'fire_blast',
            'burbuja': 'bubble',
            'pistola agua': 'water_gun',
            'hidrobomba': 'hydro_pump',
            'impactrueno': 'thunder_shock',
            'rayo': 'thunderbolt',
            'onda trueno': 'thunder_wave',
            'trueno': 'thunder',
            'lanzarrocas': 'rock_throw',
            'terremoto': 'earthquake',
            'explosión': 'explosion',
            'autodestrucción': 'self_destruct',
            'ala de acero': 'steel_wing',
            'silbato': 'grass_whistle',
            'estallido': 'eruption',
            'golpe roca': 'rock_smash',
            'bomba lodo': 'sludge_bomb',
            'espora': 'spore',
            'esquema': 'sketch',
            'ladrón': 'thief',
            'pico taladro': 'drill_peck',
            'cornada': 'horn_attack',
            'perforador': 'horn_drill',
            'viento cortante': 'razor_wind',
            'vuelo': 'fly',
            'sumisión': 'submission',
            'patada baja': 'low_kick',
            'contraataque': 'counter',
            'fuerza': 'strength',
            'tinieblas': 'night_shade',
            'mimético': 'mimic',
            'recuperación': 'recover',
            'reducción': 'minimize',
            'pantalla de humo': 'smokescreen',
            'refugio': 'withdraw',
            'barrera': 'barrier',
            'pantalla de luz': 'light_screen',
            'lengüetazo': 'lick',
            'polución': 'smog',
            'residuos': 'sludge',
            'hueso palo': 'bone_club',
            'tenaza': 'clamp',
            'clavo cañón': 'spike_cannon',
            'restricción': 'constrict',
            'deslumbrar': 'glare',
            'comesueños': 'dream_eater',
            'gas venenoso': 'poison_gas',
            'beso amoroso': 'lovely_kiss',
            'transformación': 'transform',
            'psicoonda': 'psywave',
            'martillazo': 'crabhammer',
            'huesomerang': 'bonemerang',
            'triataque': 'tri_attack',
            'sustituto': 'substitute',
            'forcejeo': 'struggle',
            'triple patada': 'triple_kick',
            'telaraña': 'spider_web',
            'telépata': 'mind_reader',
            'pesadilla': 'nightmare',
            'azote': 'flail',
            'aerochorro': 'aeroblast',
            'esporagodón': 'cotton_spore',
            'inversión': 'reversal',
            'nieve polvo': 'powder_snow',
            'protección': 'protect',
            'ultrapuño': 'mach_punch',
            'beso dulce': 'sweet_kiss',
            'pulpocañón': 'octazooka',
            'púas': 'spikes',
'ataque óseo': 'bone_rush',
            'encanto': 'charm',
            'batido': 'milk_drink',
            'campana cura': 'heal_bell',
            'presente': 'present',
            'frustración': 'frustration',
            'divide dolor': 'pain_split',
            'fuego sagrado': 'sacred_fire',
            'magnitud': 'magnitude',
            'puño dinámico': 'dynamic_punch',
            'dragoaliento': 'dragon_breath',
            'cola férrea': 'iron_tail',
            'sol matinal': 'morning_sun',
            'poder oculto': 'hidden_power',
            'danza lluvia': 'rain_dance',
            'día soleado': 'sunny_day',
            'manto espejo': 'mirror_coat',
            'poder pasado': 'ancient_power',
            'bola sombra': 'shadow_ball',
            'torbellino': 'whirlpool',
            'paliza': 'beat_up',
            'reserva': 'stockpile',
            'escupir': 'spit_up',
            'tragar': 'swallow',
            'tormento': 'torment',
            'camelo': 'flatter',
            'legado': 'memento',
            'imagen': 'facade',
            'puño certero': 'focus_punch',
            'estímulo': 'smelling_salts',
            'señuelo': 'follow_me',
            'adaptación': 'nature_power',
            'carga': 'charge',
            'mofa': 'taunt',
            'imitación': 'role_play',
            'deseo': 'wish',
            'ayuda': 'assist',
            'fuerza bruta': 'superpower',
            'capa mágica': 'magic_coat',
            'desarme': 'knock_off',
            'alivio': 'refresh',
            'rabia': 'grudge',
            'robo': 'snatch',
            'daño secreto': 'secret_power',
            'buceo': 'dive',
            'empujón': 'arm_thrust',
            'ráfaga': 'tail_glow',
            'resplandor': 'luster_purge',
            'bola neblina': 'mist_ball',
            'danza pluma': 'feather_dance',
            'danza caos': 'teeter_dance',
            'chapoteo lodo': 'mud_sport',
            'bola hielo': 'ice_ball',
            'brazo pincho': 'needle_arm',
            'relajo': 'slack_off',
            'garra brutal': 'crush_claw',
            'anillo ígneo': 'blast_burn',
            'hidrocañón': 'hydro_cannon',
            'llanto falso': 'fake_tears',
            'aire afilado': 'air_cutter',
            'sofoco': 'overheat',
            'tumba rocas': 'rock_tomb',
            'viento plata': 'silver_wind',
            'salpicar': 'water_spout',
            'doble rayo': 'signal_beam',
            'paranormal': 'extrasensory',
            'gancho alto': 'sky_uppercut',
            'agua lodosa': 'muddy_water',
            'semilladora': 'bullet_seed',
            'golpe aéreo': 'aerial_ace',
            'carámbano': 'icicle_spear',
            'aullido': 'howl',
            'planta feroz': 'frenzy_plant',
            'corpulencia': 'bulk_up',
            'bote': 'bounce',
            'cola veneno': 'poison_tail',
            'antojo': 'covet',
            'placaje eléc': 'volt_tackle',
            'hoja mágica': 'magical_leaf',
            'hidrochorro': 'water_sport',
            'paz mental': 'calm_mind',
            'hoja aguda': 'leaf_blade',
            'pedrada': 'rock_blast',
            'onda voltio': 'shock_wave',
            'hidropulso': 'water_pulse',
            'deseo oculto': 'doom_desire',
            'psicoataque': 'psycho_boost',
            'vise grip': 'vise_grip',
            'golpe karatazo': 'karate_chop',
        };

        if (LEGACY_MOVE_MAPPING[lowerName]) {
            return LEGACY_MOVE_MAPPING[lowerName];
        }

        // Buscar el movimiento que contenga este nombre en español en las traducciones
        for (const [id, move] of Object.entries(MOVE_TRANSLATIONS_ES)) {
            if (move.name && move.name.toLowerCase() === lowerName) {
                return id;
            }
        }
        return name;
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
     * Método para actualizar la base de datos (útil para futura integración con BD real)
     */
    updatePokemonDb(newDb: Record<string, PokemonBaseData>) {
        _pokemonDb.value = newDb;
    }
};
