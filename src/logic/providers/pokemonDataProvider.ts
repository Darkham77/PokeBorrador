// [PureVue-Ignore-Length]
import { shallowRef } from 'vue';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { ABILITY_DATA, POKEMON_ABILITIES } from '@/data/battle/abilities';
import { MOVE_DATA } from '@/data/battle/moves';
import { GYMS } from '@/data/world/gyms';
import { FIRE_RED_MAPS } from '@/data/world/maps';
import { NATURE_DATA } from '@/data/battle/natures';
import { SPECIES_METADATA } from '@/data/pokemon/speciesMetadata';
import { POKEMON_AESTHETICS, POKEMON_SPRITE_IDS } from '@/data/pokemon/pokedex';

import { getSpriteUrl, getBackSpriteUrl } from '@/data/pokemon/spriteMapping';
import type { 
    PokemonBaseData, 
    AbilityBaseData, 
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
const _abilityData = shallowRef(ABILITY_DATA as Record<string, AbilityBaseData>);
const _moveData = shallowRef(MOVE_DATA as Record<string, MoveBaseData>);
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
        const data = _abilityData.value[name];
        return data ? deepClone(data) : null;
    },

    /**
     * Obtiene la lista de habilidades posibles para una especie.
     */
    getSpeciesAbilities(speciesId: string): string[] {
        const list = (POKEMON_ABILITIES as Record<string, string[]>)[speciesId];
        return list ? [...list] : ['Espesura'];
    },

    /**
     * Obtiene datos de un movimiento por ID o nombre localizado.
     */
    getMoveData(nameOrId: string) {
        if (!nameOrId) return null;
        const normalized = nameOrId.trim();
        let data = _moveData.value[normalized];
        if (!data) {
            // Intentar resolver por nombre localizado en español
            const id = this.resolveMoveId(normalized);
            data = _moveData.value[id];
        }
        return data ? deepClone(data) : null;
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
            'puño lodo': 'mud_punch',
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
            'psicocontrol': 'psicocontrol',
            'más psique': 'psych_up',
            'zap cannon': 'zap_cannon',
            'electrocañón': 'zap_cannon',
            'electrorrayo': 'electrorrayo',
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
            'pájaro osado': 'brave_bird',
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
            'previsión': 'prevision',
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
            'profecía': 'prevision',
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

        // Buscar el movimiento que contenga este nombre en español
        for (const [id, move] of Object.entries(_moveData.value)) {
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
        const data = (NATURE_DATA as Record<string, NatureBaseData>)[name];
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
