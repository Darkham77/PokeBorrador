// fallow-ignore-file security-sink
/**
 * scripts/database/migrate_backup_saves_to_showdown.ts
 * 
 * SAVES TO SHOWDOWN IDS MIGRATOR (Node.js 26+ Native)
 * Reads the server_franco backup JSON, migrates all player saves to use
 * official Showdown IDs for species, moves, abilities, and natures, and writes
 * the migrated output to scratch/server_franco_backup_migrated.json.
 * 
 * Usage: node --permission --experimental-strip-types --allow-fs-read=. --allow-fs-write=. scripts/database/migrate_backup_saves_to_showdown.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { Dex } from '@pkmn/sim';

interface BackupPoke {
  id?: string;
  name?: string;
  species?: string;
  moves?: Array<{ id?: string; name?: string }>;
  abilities?: string[] | Record<string, string>;
  ability?: string;
  nature?: string;
}

interface BackupSaveData {
  team?: BackupPoke[];
  box?: BackupPoke[];
}

interface BackupSave {
  save_data?: BackupSaveData;
}

interface BackupPayload {
  data: {
    game_saves?: BackupSave[];
  };
}

const SPECIES_TO_SHOWDOWN: Record<string, string> = { // no-magic
  "1": "bulbasaur", "2": "ivysaur", "3": "venusaur", "4": "charmander", "5": "charmeleon", "6": "charizard",
  "7": "squirtle", "8": "wartortle", "9": "blastoise", "10": "caterpie", "11": "metapod", "12": "butterfree",
  "13": "weedle", "14": "kakuna", "15": "beedrill", "16": "pidgey", "17": "pidgeotto", "18": "pidgeot",
  "19": "rattata", "20": "raticate", "21": "spearow", "22": "fearow", "23": "ekans", "24": "arbok",
  "25": "pikachu", "26": "raichu", "27": "sandshrew", "28": "sandslash", "29": "nidoran_f", "30": "nidorina",
  "31": "nidoqueen", "32": "nidoran_m", "33": "nidorino", "34": "nidoking", "35": "clefairy", "36": "clefable",
  "37": "vulpix", "38": "ninetales", "39": "jigglypuff", "40": "wigglytuff", "41": "zubat", "42": "golbat",
  "43": "oddish", "44": "gloom", "45": "vileplume", "46": "paras", "47": "parasect", "48": "venonat",
  "49": "venomoth", "50": "diglett", "51": "dugtrio", "52": "meowth", "53": "persian", "54": "psyduck",
  "55": "golduck", "56": "mankey", "57": "primeape", "58": "growlithe", "59": "arcanine", "60": "poliwag",
  "61": "poliwhirl", "62": "poliwrath", "63": "abra", "64": "kadabra", "65": "alakazam", "66": "machop",
  "67": "machoke", "68": "machamp", "69": "bellsprout", "70": "weepinbell", "71": "victreebel", "72": "tentacool",
  "73": "tentacruel", "74": "geodude", "75": "graveler", "76": "golem", "77": "ponyta", "78": "rapidash",
  "79": "slowpoke", "80": "slowbro", "81": "magnemite", "82": "magneton", "83": "farfetchd", "84": "doduo",
  "85": "dodrio", "86": "seel", "87": "dewgong", "88": "grimer", "89": "muk", "90": "shellder",
  "91": "cloyster", "92": "gastly", "93": "haunter", "94": "gengar", "95": "onix", "96": "drowzee",
  "97": "hypno", "98": "krabby", "99": "kingler", "100": "voltorb", "101": "electrode", "102": "exeggcute",
  "103": "exeggutor", "104": "cubone", "105": "marowak", "106": "hitmonlee", "107": "hitmonchan", "108": "lickitung",
  "109": "koffing", "110": "weezing", "111": "rhyhorn", "112": "rhydon", "113": "chansey", "114": "tangela",
  "115": "kangaskhan", "116": "horsea", "117": "seadra", "118": "goldeen", "119": "seaking", "120": "staryu",
  "121": "starmie", "122": "mr_mime", "123": "scyther", "124": "jynx", "125": "electabuzz", "126": "magmar",
  "127": "pinsir", "128": "tauros", "129": "magikarp", "130": "gyarados", "131": "lapras", "132": "ditto",
  "133": "eevee", "134": "vaporeon", "135": "jolteon", "136": "flareon", "137": "porygon", "138": "omanyte",
  "139": "omastar", "140": "kabuto", "141": "kabutops", "142": "aerodactyl", "143": "snorlax", "144": "articuno",
  "145": "zapdos", "146": "moltres", "147": "dratini", "148": "dragonair", "149": "dragonite", "150": "mewtwo",
  "151": "mew", "152": "chikorita", "153": "bayleef", "154": "meganium", "155": "cyndaquil", "156": "quilava",
  "157": "typhlosion", "158": "totodile", "159": "croconaw", "160": "feraligatr", "161": "sentret", "162": "furret",
  "163": "hoothoot", "164": "noctowl", "165": "ledyba", "166": "ledian", "167": "spinarak", "168": "ariados",
  "169": "crobat", "170": "chinchou", "171": "lanturn", "172": "pichu", "173": "cleffa", "174": "igglybuff",
  "175": "togepi", "176": "togetic", "177": "natu", "178": "xatu", "179": "mareep", "180": "flaaffy",
  "181": "ampharos", "182": "bellossom", "183": "marill", "184": "azumarill", "185": "sudowoodo", "186": "politoed",
  "187": "hoppip", "188": "skiploom", "189": "jumpluff", "190": "aipom", "191": "sunkern", "192": "sunflora",
  "193": "yanma", "194": "wooper", "195": "quagsire", "196": "espeon", "197": "umbreon", "198": "murkrow",
  "199": "slowking", "200": "misdreavus", "201": "unown", "202": "wobbuffet", "203": "girafarig", "204": "pineco",
  "205": "forretress", "206": "dunsparce", "207": "gligar", "208": "steelix", "209": "snubbull", "210": "granbull",
  "211": "qwilfish", "212": "scizor", "213": "shuckle", "214": "heracross", "215": "sneasel", "216": "teddiursa",
  "217": "ursaring", "218": "slugma", "219": "magcargo", "220": "swinub", "221": "piloswine", "222": "corsola",
  "223": "remoraid", "224": "octillery", "225": "delibird", "226": "mantine", "227": "skarmory", "228": "houndour",
  "229": "houndoom", "230": "kingdra", "231": "phanpy", "232": "donphan", "233": "porygon2", "234": "stantler",
  "235": "smeargle", "236": "tyrogue", "237": "hitmontop", "238": "smoochum", "239": "elekid", "240": "magby",
  "241": "miltank", "242": "blissey", "243": "raikou", "244": "entei", "245": "suicune", "246": "larvitar",
  "247": "pupitar", "248": "tyranitar", "249": "lugia", "250": "ho-oh", "251": "celebi", "351": "castform",
  "823": "corviknight", "351_1": "castform-sunny", "351_2": "castform-rainy", "351_3": "castform-snowy"
};

const ABILITY_TO_SHOWDOWN: Record<string, string> = {
  'Espesura': 'overgrow',
  'Clorofila': 'chlorophyll',
  'Mar llamas': 'blaze',
  'Poder Solar': 'solarpower',
  'Torrente': 'torrent',
  'Lluvia Ligera': 'raindish',
  'Vista lince': 'keeneye',
  'Alboroto': 'soundproof',
  'Escape': 'runaway',
  'Agallas': 'guts',
  'Polvo escudo': 'shielddust',
  'Mudar': 'shedskin',
  'Electricidad estática': 'static',
  'Pararrayos': 'lightningrod',
  'Robustez': 'sturdy',
  'Nerviosismo': 'hustle',
  'Infiltrador': 'infiltrator',
  'Humedad': 'damp',
  'Aclimatación': 'cloudnine',
  'Nado rápido': 'swiftswim',
  'Ráfaga': 'speedboost',
  'Adaptable': 'adaptability',
  'Cura Natural': 'naturalcure',
  'Velo húmedo': 'waterveil',
  'Sebo': 'thickfat',
  'Caparazón': 'shellarmor',
  'Armadura Batalla': 'battlearmor',
  'Francotirador': 'sniper',
  'Intrépido': 'scrappy',
  'Ojo Compuesto': 'compoundeyes',
  'Velo arena': 'sandveil',
  'Insonorizar': 'soundproof',
  'Intimidación': 'intimidate',
  'Absorbe Fuego': 'flashfire',
  'Absorbe Agua': 'waterabsorb',
  'Efecto Espora': 'effectspore',
  'Trampa Arena': 'arenatrap',
  'Recogida': 'pickup',
  'Espíritu Vital': 'vitalspirit',
  'Sincronía': 'synchronize',
  'Cuerpo Puro': 'clearbody',
  'Despiste': 'oblivious',
  'Imán': 'magnetpull',
  'Fuga': 'runaway',
  'Hedor': 'stench',
  'Levitación': 'levitate',
  'Cabeza Roca': 'rockhead',
  'Insomnio': 'insomnia',
  'Corte Fuerte': 'hypercutter',
  'Flexibilidad': 'limber',
  'Madrugar': 'earlybird',
  'Enjambre': 'swarm',
  'Cuerpo Llama': 'flamebody',
  'Rastro': 'trace',
  'Inmunidad': 'immunity',
  'Presión': 'pressure',
  'Punto tóxico': 'poisonpoint',
  'Descarga': 'download',
  'Experto': 'technician',
  'Absorbe Voltio': 'voltabsorb',
  'Foco interno': 'innerfocus',
  'Rivalidad': 'rivalry',
  'Muro Mágico': 'magicguard',
  'Predicción': 'forecast',
  'Gran Encanto': 'cutecharm',
  'damp': 'damp',
  'illuminate': 'illuminate',
  'Entusiasmo': 'hustle'
};

const NATURE_TO_SHOWDOWN: Record<string, string> = {
  'activa': 'active',
  'huraña': 'lonely',
  'audaz': 'brave',
  'firme': 'adamant',
  'pícara': 'naughty',
  'osada': 'bold',
  'dócil': 'docile',
  'plácida': 'relaxed',
  'agitada': 'impish',
  'floja': 'lax',
  'tímida': 'timid',
  'huraña_speed': 'hasty',
  'seria': 'serious',
  'alegre': 'jolly',
  'ingenua': 'naive',
  'modesta': 'modest',
  'afable': 'mild',
  'tasa': 'quiet',
  'tímida_spa': 'bashful',
  'alocada': 'rash',
  'serena': 'calm',
  'amable': 'gentle',
  'grosera': 'sassy',
  'cauta': 'careful',
  'rara': 'quirky'
};

const BACKUP_FILE = path.resolve(process.cwd(), 'tests/node/fixtures/server_franco_backup_fixture.json');
const OUTPUT_FILE = BACKUP_FILE;

function canLearnMove(speciesId: string, moveId: string): boolean {
  let currId: string | undefined = Dex.toID(speciesId);
  const normMoveId = Dex.toID(moveId);
  while (currId) {
    const data = Dex.data.Learnsets[currId];
    if (data && data.learnset && data.learnset[normMoveId]) {
      return true;
    }
    const species = Dex.species.get(currId);
    currId = species.prevo ? Dex.toID(species.prevo) : undefined;
  }
  return false;
}

function getMovesAtLevel(speciesId: string, level: number): string[] {
  const moves: Array<{ id: string; lv: number }> = [];
  let currId: string | undefined = Dex.toID(speciesId);
  
  while (currId) {
    const data = Dex.data.Learnsets[currId];
    if (data && data.learnset) {
      for (const [moveId, sources] of Object.entries(data.learnset)) {
        for (const src of sources) {
          const match = src.match(/^(\d+)L(\d+)$/);
          if (match) {
            const lv = parseInt(match[2]!, 10);
            if (lv <= level) {
              moves.push({ id: moveId, lv });
            }
          }
        }
      }
    }
    const species = Dex.species.get(currId);
    currId = species.prevo ? Dex.toID(species.prevo) : undefined;
  }

  moves.sort((a, b) => a.lv - b.lv);
  return [...new Set(moves.map(m => m.id))];
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('Starting player saves migration to official Showdown IDs...');

  // 1. Load local databases for translation mapping
  const rawAbilities = await fs.readFile(path.resolve(process.cwd(), 'src/data/battle/abilities.json'), 'utf8');
  const rawMoves = await fs.readFile(path.resolve(process.cwd(), 'src/data/battle/moves.json'), 'utf8');
  const showdownDB = {
    abilities: JSON.parse(rawAbilities) as Record<string, { name?: string }>,
    moves: JSON.parse(rawMoves) as Record<string, { name?: string }>
  };

  // Build Abilities Map
  const abilityMap = new Map<string, string>();
  for (const [esName, enId] of Object.entries(ABILITY_TO_SHOWDOWN)) {
    abilityMap.set(normalize(esName), enId);
    abilityMap.set(normalize(enId), enId);
  }
  const legacyAbilities: Record<string, string> = {
    'metamorfosis': 'shedskin',
    'escudopolvo': 'shielddust',
    'polvoescudo': 'shielddust',
    'correcaminos': 'runaway',
    'obstruir': 'soundproof',
    'escurridizo': 'limber',
    'puntocura': 'naturalcure',
    'infiltrador': 'infiltrator',
    'fuga': 'runaway',
    'mudar': 'shedskin',
    'alboroto': 'soundproof',
    'nerviosismo': 'hustle',
    'podersolar': 'solarpower',
    'escape': 'runaway',
    'adaptable': 'adaptability',
    'rafaga': 'speedboost',
    'velohumedo': 'waterveil',
    'humedad': 'damp',
    'francotirador': 'sniper',
    'rivalidad': 'rivalry',
    'muromagico': 'magicguard',
    'curanatural': 'naturalcure'
  };
  for (const [legacy, enId] of Object.entries(legacyAbilities)) {
    abilityMap.set(normalize(legacy), enId);
  }
  for (const [id, data] of Object.entries(showdownDB.abilities as Record<string, { name?: string }>)) {
    abilityMap.set(normalize(id), id);
    if (data.name) {
      abilityMap.set(normalize(data.name), id);
    }
  }

  // Build Natures Map
  const natureMap = new Map<string, string>();
  for (const [esName, enId] of Object.entries(NATURE_TO_SHOWDOWN)) {
    natureMap.set(normalize(esName), enId);
    natureMap.set(normalize(enId), enId);
  }
  const legacyNatures: Record<string, string> = {
    'activa': 'active',
    'activo': 'active',
    'hurana': 'lonely',
    'hurano': 'lonely',
    'audaz': 'brave',
    'firme': 'adamant',
    'picara': 'naughty',
    'picaro': 'naughty',
    'osada': 'bold',
    'osado': 'bold',
    'docil': 'docile',
    'placida': 'relaxed',
    'placido': 'relaxed',
    'agitada': 'impish',
    'agitado': 'impish',
    'floja': 'lax',
    'flojo': 'lax',
    'timida': 'timid',
    'timido': 'timid',
    'afable': 'mild',
    'tasa': 'quiet',
    'seria': 'serious',
    'serio': 'serious',
    'alegre': 'jolly',
    'ingenua': 'naive',
    'ingenuo': 'naive',
    'modesta': 'modest',
    'modesto': 'modest',
    'raro': 'serious',
    'rara': 'quirky',
    'serena': 'calm',
    'sereno': 'calm',
    'amable': 'gentle',
    'grosera': 'sassy',
    'grosero': 'sassy',
    'cauta': 'careful',
    'cauto': 'careful',
    'quirky': 'quirky',
    'manso': 'quiet',
    'alocada': 'rash',
    'alocado': 'rash',
    'moderado': 'serious',
    'jovial': 'jolly',
    'tranquilo': 'calm'
  };
  for (const [legacy, enId] of Object.entries(legacyNatures)) {
    natureMap.set(normalize(legacy), enId);
  }

  // Build Moves Map
  const moveMap = new Map<string, string>();
  for (const [id, data] of Object.entries(showdownDB.moves as Record<string, { name?: string }>)) {
    moveMap.set(id, id);
    if (data.name) {
      moveMap.set(normalize(data.name), id);
    }
  }

  const legacyMoves: Record<string, string> = {
    'destructor': 'pound', 'arena': 'sandattack', 'portazo': 'slam', 'acidificacion': 'acidarmor', 'bubblebeam': 'bubblebeam',
    'rodar': 'rollout', 'huesumerang': 'bonemerang', 'golpecabeza': 'headbutt', 'picotazo': 'peck', 'persecucion': 'pursuit',
    'cola': 'tailwhip', 'chupavidas': 'leechlife', 'envolver': 'wrap', 'golpekaratazo': 'karatechop', 'movsismico': 'seismictoss',
    'punolodo': 'mudslap', 'megapuno': 'megapunch', 'minimizar': 'minimize', 'pantallahumo': 'smokescreen', 'huesorus': 'bonerush',
    'cuerpopesado': 'heavyslam', 'cuerpo_pesado': 'heavyslam', 'picoteo': 'pluck', 'desenrrollar': 'rollout', 'prevision': 'foresight',
    'punetazo': 'pound', 'psicocontrol': 'psychup', 'seguimiento': 'pursuit', 'francotirador': 'sniper', 'placaje': 'tackle',
    'ataquerapido': 'quickattack', 'hiperrayo': 'hyperbeam', 'doblefilo': 'doubleedge', 'explosion': 'explosion', 'autodestruccion': 'selfdestruct',
    'hipercolmillo': 'hyperfang', 'mordisco': 'bite', 'cuchillada': 'slash', 'bofetonlodo': 'mudslap', 'doblebofeton': 'doubleslap',
    'pisoton': 'stomp', 'doblepatada': 'doublekick', 'atizar': 'slam', 'golpecuerpo': 'bodyslam', 'retribucion': 'return',
    'enfado': 'outrage', 'derribo': 'takedown', 'golpe': 'thrash', 'punolodo_mudpunch': 'mudpunch', 'patadaignea': 'blazekick',
    'patadasaltoalta': 'highjumpkick', 'patadasalto': 'jumpkick', 'pajaroosado': 'bravebird', 'cabezazo': 'headbutt', 'engullir': 'swallow',
    'punocometa': 'cometpunch', 'bombahuevo': 'eggbomb', 'uproar': 'uproar', 'triturar': 'crunch', 'grunido': 'growl',
    'dulcearoma': 'sweetscent', 'ataquefuria': 'furyattack', 'esfuerzo': 'endeavor', 'espejo': 'mirrormove', 'paralizador': 'stunspore',
    'disparodemora': 'stringshot', 'buclearena': 'sandtomb', 'golpesfuria': 'furyswipes', 'colmilloveneno': 'poisonfang', 'punometeoro': 'meteormash',
    'fuegofatuo': 'willowisp', 'vozarron': 'hypervoice', 'niebla': 'haze', 'impresionar': 'astonish', 'danzapetalo': 'petaldance',
    'aromaterapia': 'aromatherapy', 'megacuerno': 'megahorn', 'latigo': 'tailwhip', 'fortaleza': 'harden', 'defensaferrea': 'irondefense',
    'agilidad': 'agility', 'desarrollo': 'growth', 'danzaespada': 'swordsdance', 'amnesia': 'amnesia', 'rugido': 'roar',
    'canto': 'sing', 'somnifera': 'sleeppowder', 'supersonico': 'supersonic', 'salpicadura': 'splash', 'furia': 'rage',
    'malicioso': 'leer', 'chirrido': 'screech', 'diadepago': 'payday', 'finta': 'feintattack', 'venganza': 'bide',
    'contoneo': 'swagger', 'tajocruzado': 'crosschop', 'rastreo': 'odorsleuth', 'ruedafuego': 'flamewheel', 'tambor': 'bellydrum',
    'premonicion': 'futuresight', 'kinetico': 'kinesis', 'truco': 'trick', 'tirovital': 'vitalthrow', 'velocidadextrema': 'extremespeed',
    'fisura': 'fissure', 'metronomo': 'metronome', 'sorpresa': 'fakeout', 'electrocanon': 'zapcannon', 'tormentaarena': 'sandstorm',
    'relevo': 'batonpass', 'llantopanto': 'faketears', 'cantomortal': 'perishsong', 'friopolar': 'sheercold', 'ondasonica': 'sonicboom',
    'fijarblanco': 'lockon', 'ecometalico': 'metalsound', 'cortefuria': 'furycutter', 'falsotortazo': 'falseswipe', 'vientohielo': 'icywind',
    'armaduraacida': 'acidarmor', 'rencor': 'spite', 'maldeojo': 'meanlook', 'punosombra': 'shadowpunch', 'arraigo': 'ingrain',
    'cosquillas': 'tickle', 'punomareo': 'dizzypunch', 'aguante': 'endure', 'ciclon': 'twister', 'danzadragon': 'dragondance',
    'cascada': 'waterfall', 'girorapido': 'rapidspin', 'reciclaje': 'recycle', 'disparolodo': 'mudshot', 'amortiguador': 'softboiled',
    'bostezo': 'yawn', 'anulacion': 'disable', 'otravez': 'encore', 'focoenergia': 'focusenergy', 'refuerzo': 'helpinghand',
    'conversion2': 'conversion2', 'conversion': 'conversion', 'electrorrayo': 'electrorrayo', 'sonambulo': 'sleeptalk', 'bloqueo': 'block',
    'deteccion': 'detect', 'ondaignea': 'heatwave', 'ataqueaereo': 'skyattack', 'maspsique': 'psychup', 'rapidez': 'swift',
    'camuflaje': 'camouflage', 'masacosmica': 'cosmicpower', 'aranazo': 'scratch', 'garrametal': 'metalclaw',
    'furiadragon': 'dragonrage', 'carasusto': 'scaryface', 'ataqueala': 'wingattack', 'remolino': 'whirlwind', 'supercolmillo': 'superfang',
    'acido': 'acid', 'rizodefensa': 'defensecurl', 'cornada': 'hornattack', 'perforador': 'horndrill', 'descanso': 'rest',
    'aireafilado': 'aircutter', 'magnitud': 'magnitude', 'triataque': 'triattack', 'patadabaja': 'lowkick', 'constriccion': 'constrict',
    'maldicion': 'curse', 'tenaza': 'clamp', 'residuos': 'sludge', 'puas': 'spikes', 'clavocanon': 'spikecannon', 'carga': 'charge',
    'chispa': 'spark', 'mantoespejo': 'mirrorcoat', 'bombardeo': 'barrage', 'huesopalo': 'boneclub'
  };
  for (const [legacy, enId] of Object.entries(legacyMoves)) {
    moveMap.set(normalize(legacy), enId);
  }

  // 2. Load backup
  const rawBackup = await fs.readFile(BACKUP_FILE, 'utf8');
  const backup = JSON.parse(rawBackup) as BackupPayload;

  const gameSaves = backup.data.game_saves || [];
  let migratedPokes = 0;
  let migratedMovesCount = 0;

  const gen = Dex;

  // 3. Migrate each save
  for (const save of gameSaves) {
    const saveData = save.save_data;
    if (!saveData) continue;

    const teams = saveData.team || [];
    const boxes = saveData.box || [];
    const allPokes = [...teams, ...boxes].filter(Boolean);

    for (const poke of allPokes) {
      migratedPokes++;

      // A. Migrate Pokémon ID (Species)
      if (poke.id) {
        const oldId = String(poke.id);
        const normSpeciesId = normalize(oldId);
        let resolvedSpecies = normSpeciesId;
        if (SPECIES_TO_SHOWDOWN[normSpeciesId]) {
          resolvedSpecies = SPECIES_TO_SHOWDOWN[normSpeciesId];
        } else {
          const species = gen.species.get(normSpeciesId);
          if (species.exists) {
            resolvedSpecies = species.id;
          }
        }
        poke.species = resolvedSpecies;
      }

      // B. Migrate and Heal Ability
      if (poke.ability && poke.species) {
        const normAbility = normalize(poke.ability);
        const abilityId = abilityMap.get(normAbility) || normAbility;
        const abilityObj = gen.abilities.get(abilityId);
        
        const speciesData = gen.species.get(poke.species);
        const validAbilities = speciesData.exists 
          ? Object.values(speciesData.abilities).map(a => Dex.toID(a)) 
          : ['overgrow'];

        if (abilityObj.exists && validAbilities.includes(abilityObj.id)) {
          poke.ability = abilityObj.id;
        } else {
          const fallbackAbility = validAbilities[0] || 'overgrow';
          console.log(`[Heal Migration] Pokémon: ${poke.name || poke.species} - Replaced illegal ability "${poke.ability}" with "${fallbackAbility}"`);
          poke.ability = fallbackAbility;
        }
      }

      // C. Migrate Nature
      if (poke.nature) {
        const normNature = normalize(poke.nature);
        poke.nature = natureMap.get(normNature) || normNature;
      }

      // D. Migrate and Heal Moves
      if (poke.moves && Array.isArray(poke.moves)) {
        // Step 1: Migrate moves to official Showdown IDs
        for (const m of poke.moves) {
          if (!m) continue;
          migratedMovesCount++;

          const normMove = normalize(m.name || m.id || '');
          const resolvedId = moveMap.get(normMove) || normMove;
          const move = gen.moves.get(resolvedId);
          m.id = move.exists ? move.id : resolvedId;
          if (move.exists && move.name) {
            m.name = move.name;
          }
        }

        // Step 2: Healing block for illegal moves (One-time migration patch)
        if (poke.species) {
          const legalMoves: Array<{ id: string; name: string }> = [];
          const currentMoveIds = new Set<string>();
          let healedAny = false;

          for (const m of poke.moves) {
            if (m && m.id) {
              if (canLearnMove(poke.species, m.id)) {
                legalMoves.push({ id: m.id, name: gen.moves.get(m.id).name || m.id });
                currentMoveIds.add(m.id);
              } else {
                healedAny = true;
              }
            }
          }

          if (healedAny) {
            const originalCount = poke.moves.length;
            const level = (poke as { level?: number }).level || 5;
            const pool = getMovesAtLevel(poke.species, level);
            
            for (const poolMoveId of pool) {
              if (legalMoves.length >= originalCount) break;
              if (!currentMoveIds.has(poolMoveId)) {
                legalMoves.push({ id: poolMoveId, name: gen.moves.get(poolMoveId).name || poolMoveId });
                currentMoveIds.add(poolMoveId);
              }
            }

            // Fallback in case of 0 moves
            if (legalMoves.length === 0 && pool.length > 0) {
              legalMoves.push({ id: pool[0]!, name: gen.moves.get(pool[0]!).name || pool[0]! });
            }

            console.log(`[Heal Migration] Pokémon: ${poke.name || poke.species} (Lvl ${level}) - Replaced illegal moves. Result:`, legalMoves.map(m => m.id));
            poke.moves = legalMoves;
          }
        }
      }
    }
  }

  // 4. Save migrated backup
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(backup, null, 2), 'utf8');

  console.log(`\n🎉 Migración completada exitosamente!`);
  console.log(`📦 Pokémon migrados: ${migratedPokes}`);
  console.log(`⚔️ Movimientos migrados: ${migratedMovesCount}`);
  console.log(`💾 Backup migrado guardado en: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
