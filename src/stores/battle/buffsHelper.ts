import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getEventCurrentWindow, safeParse, resolveWeeklyRotation, type Event as GameEvent, type EventConfig } from '@/logic/events/eventEngine'
import { isItemId, type ItemId } from '@/data/inventory/items'
import type { GameState } from '@/types/system/game'
import type { ToolQualityTier } from '@/types/system/game'

export interface ActiveBuffItem {
  id: string
  secs: number
  name: string
  desc: string
  icon: string
  isEmoji?: boolean
  isEvent?: boolean
  event?: GameEvent
  tier?: ToolQualityTier
}

const BUFF_DURATION_MIN = 20
const LUCKY_EGG_EXP_BOOST_PCT = 50
const BUFF_DURATION_30_MIN_MIN = 30
const INFINITE_EVENT_SECS_FALLBACK = 86400

const EVENT_MULTIPLIER_CONFIGS = [
  { key: 'speciesRateMult', icon: '🎯', label: 'Aparición' },
  { key: 'fishingMult', icon: '🎣', label: 'Pesca' },
  { key: 'expMult', icon: '⚡', label: 'EXP' },
  { key: 'moneyMult', icon: '💰', label: 'Dinero' },
  { key: 'bcMult', icon: '🪙', label: 'Battle Coins' },
  { key: 'archaeologyMult', icon: '⛏️', label: 'Arqueología' },
  { key: 'bugCatchingMult', icon: '🦗', label: 'Caza Bichos' },
  { key: 'casinoLuckyMult', icon: '🎰', label: 'Suerte Casino' },
  { key: 'hatchMult', icon: '🥚', label: 'Velocidad Eclosión' }
] as const satisfies readonly { key: keyof EventConfig; icon: string; label: string }[]

function formatSpeciesBonus(rawSpecies?: string): string | null {
  if (!rawSpecies || rawSpecies === '*') return null
  const speciesNames = rawSpecies
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(', ')
  return speciesNames ? `Especies: ${speciesNames}` : null
}

function formatShinyBonus(cfg: EventConfig): string | null {
  const mult = (cfg.speciesShinyMult && cfg.speciesShinyMult > 1) ? cfg.speciesShinyMult : ((cfg.shinyMult && cfg.shinyMult > 1) ? cfg.shinyMult : 0)
  return mult > 1 ? `✨ x${mult} Shiny` : null
}

export function formatEventBonusDescription(cfg: EventConfig, ev: GameEvent, rotation: { title?: string; species?: string } | null): string {
  const bonusParts: string[] = [] // domain-ok: Open dynamic text or non-domain string payload
  const speciesPart = formatSpeciesBonus(rotation?.species || cfg.species)
  if (speciesPart) {
    bonusParts.push(speciesPart)
  }

  const shinyPart = formatShinyBonus(cfg)
  if (shinyPart) {
    bonusParts.push(shinyPart)
  }

  for (const item of EVENT_MULTIPLIER_CONFIGS) {
    const val = cfg[item.key]
    if (typeof val === 'number' && val > 1) {
      bonusParts.push(`${item.icon} x${val} ${item.label}`)
    }
  }

  if (ev.type === 'competition') {
    bonusParts.push('🏆 Competición Activa')
  }

  return bonusParts.length > 0
    ? bonusParts.join(' · ')
    : (ev.description || '¡Evento especial activo!')
}

export function buildActiveEventBuffs(
  activeEvents: GameEvent[],
  nowMs: number,
  nowInstant: Temporal.Instant,
  zdt: Temporal.ZonedDateTime
): ActiveBuffItem[] {
  const list: ActiveBuffItem[] = []

  for (const ev of activeEvents) {
    const window = getEventCurrentWindow(ev, nowInstant)
    let secsLeft = 0
    if (window) {
      secsLeft = Math.max(0, Math.floor((window.end.epochMilliseconds - nowMs) / 1000))
    } else if (ev.end_at) {
      try {
        const endInstant = Temporal.Instant.from(ev.end_at)
        secsLeft = Math.max(0, Math.floor((endInstant.epochMilliseconds - nowMs) / 1000))
      } catch {
        secsLeft = 0
      }
    } else if (ev.manual) {
      secsLeft = INFINITE_EVENT_SECS_FALLBACK
    }

    const cfg = safeParse(ev.config) as EventConfig
    const rotation = cfg.rotationTheme === 'weekly_4' && cfg.weeklyRotations ? resolveWeeklyRotation(cfg, zdt) : null
    const eventTitle = rotation?.title || ev.name
    const eventDesc = formatEventBonusDescription(cfg, ev, rotation)

    list.push({
      id: `event_${ev.id}`,
      secs: secsLeft,
      name: eventTitle,
      desc: eventDesc,
      icon: ev.icon || '🎁',
      isEmoji: true,
      isEvent: true,
      event: ev
    })
  }

  return list
}

interface ToolTierConfig {
  name: string;
  itemId: ItemId;
  desc: string;
}

const FISHING_ROD_CONFIGS: Record<ToolQualityTier, ToolTierConfig> = {
  standard: {
    name: 'Caña de pescar', // spanish-ok: UI Spanish text localization label
    itemId: 'fishingrod',
    desc: `Sube mucho la pesca por ${BUFF_DURATION_MIN} min. Ver % exacto en el mapa.`
  },
  good: {
    name: 'Caña Buena', // spanish-ok: UI Spanish text localization label
    itemId: 'fishingrodgood',
    desc: 'Sube la pesca y bonifica a los Pokémon raros (+500 pts).'
  },
  super: {
    name: 'Supercaña', // spanish-ok: UI Spanish text localization label
    itemId: 'fishingrodsuper',
    desc: 'Sube la pesca y bonifica a los Pokémon raros (+1000 pts). Aumenta chance de Shiny x1.5.'
  }
};

const PICKAXE_CONFIGS: Record<ToolQualityTier, ToolTierConfig> = {
  standard: {
    name: 'Pico de excavación', // spanish-ok: UI Spanish text localization label
    itemId: 'pickaxe',
    desc: `Sube la arqueología por ${BUFF_DURATION_MIN} min. Ver % exacto en el mapa.`
  },
  good: {
    name: 'Pico Bueno', // spanish-ok: UI Spanish text localization label
    itemId: 'pickaxesilver',
    desc: 'Sube la arqueología y bonifica minerales y gemas (+500 pts).'
  },
  super: {
    name: 'Superpico', // spanish-ok: UI Spanish text localization label
    itemId: 'pickaxegold',
    desc: 'Sube la arqueología y bonifica minerales y gemas (+1000 pts).'
  }
};

const BRUSH_CONFIGS: Record<ToolQualityTier, ToolTierConfig> = {
  standard: {
    name: 'Pincel de excavación', // spanish-ok: UI Spanish text localization label
    itemId: 'brush',
    desc: `Sube la arqueología por ${BUFF_DURATION_MIN} min. Ver % exacto en el mapa.`
  },
  good: {
    name: 'Pincel Bueno', // spanish-ok: UI Spanish text localization label
    itemId: 'brushgood',
    desc: 'Sube la arqueología y bonifica fósiles (+500 pts).'
  },
  super: {
    name: 'Superpincel', // spanish-ok: UI Spanish text localization label
    itemId: 'brushsuper',
    desc: 'Sube la arqueología y bonifica fósiles (+1000 pts).'
  }
};

function buildToolBuff(
  id: string,
  secs: number,
  type: ToolQualityTier | null | undefined,
  emoji: string,
  configs: Record<ToolQualityTier, ToolTierConfig>
): ActiveBuffItem {
  const resolvedType: ToolQualityTier = type || 'standard';
  const config = configs[resolvedType] || configs.standard;
  return {
    id,
    secs,
    name: `${emoji} ${config.name}`,
    desc: config.desc,
    icon: getAssetUrl(ASSET_TYPES.ITEM, config.itemId),
    tier: resolvedType
  };
}

interface SimpleBuffDef {
  key: keyof GameState;
  id: string;
  name: string;
  desc: string;
  itemId: ItemId;
}

const SIMPLE_BUFF_DEFS: readonly SimpleBuffDef[] = [
  { key: 'shinyBoostSecs', id: 'shiny', name: '✨ Ticket Shiny', desc: 'Aumenta la probabilidad de encontrar Pokémon shiny.', itemId: 'ticketshiny' }, // spanish-ok: UI Spanish text localization label
  { key: 'amuletCoinSecs', id: 'amulet', name: '💰 Moneda Amuleto', desc: 'Duplica el dinero ganado en combate.', itemId: 'amuletcoin' }, // spanish-ok: UI Spanish text localization label
  { key: 'luckyEggSecs', id: 'lucky-egg', name: '🥚 Huevo Suerte Pequeño', desc: `Aumenta la EXP ganada en un ${LUCKY_EGG_EXP_BOOST_PCT}% durante ${BUFF_DURATION_30_MIN_MIN} minutos.`, itemId: 'luckyegg' }, // spanish-ok: UI Spanish text localization label
  { key: 'safariTicketSecs', id: 'safari', name: '🎫 Ticket Safari', desc: 'Permite entrar a la Zona Safari.', itemId: 'ticketsafari' }, // spanish-ok: UI Spanish text localization label
  { key: 'ceruleanTicketSecs', id: 'cerulean', name: '🌀 Ticket Cueva Celeste', desc: 'Permite entrar a la Cueva Celeste.', itemId: 'ticketcerulean' }, // spanish-ok: UI Spanish text localization label
  { key: 'articunoTicketSecs', id: 'articuno', name: '❄️ Ticket Articuno', desc: 'Permite entrar a las Islas Espuma.', itemId: 'ticketarticuno' }, // spanish-ok: UI Spanish text localization label
  { key: 'mewtwoTicketSecs', id: 'mewtwo', name: '🧬 Ticket Mewtwo', desc: 'Permite entrar a la Cueva Celeste (Mewtwo).', itemId: 'ticketmewtwo' }, // spanish-ok: UI Spanish text localization label
  { key: 'ivScannerSecs', id: 'iv-scanner', name: '🔍 Escáner de IVs', desc: 'Muestra los IVs totales de Pokémon salvajes.', itemId: 'ivscanner' } // spanish-ok: UI Spanish text localization label
] as const;

const INCENSE_TYPES_MAP: Partial<Record<ItemId, string>> = {
  incensefire: 'Fuego',
  incensewater: 'Agua',
  incensegrass: 'Planta',
  incensenormal: 'Normal',
  incenseghost: 'Fantasma',
  incensepsychic: 'Psíquico' // spanish-ok: UI Spanish text localization label
};

export function buildActivePlayerItemBuffs(s: GameState): ActiveBuffItem[] {
  const list: ActiveBuffItem[] = [];

  if (s.repelSecs > 0) {
    list.push({
      id: 'repel',
      secs: s.repelSecs,
      name: 'Repelente', // spanish-ok: UI Spanish text localization label
      desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo.',
      icon: getAssetUrl(ASSET_TYPES.ITEM, 'repel')
    });
  }

  if (s.fishingRodSecs > 0) {
    list.push(buildToolBuff('fishing-rod', s.fishingRodSecs, s.fishingRodType, '🎣', FISHING_ROD_CONFIGS));
  }

  if (s.pickaxeSecs > 0) {
    list.push(buildToolBuff('pickaxe', s.pickaxeSecs, s.pickaxeType, '⛏️', PICKAXE_CONFIGS));
  }

  if (s.brushSecs > 0) {
    list.push(buildToolBuff('brush', s.brushSecs, s.brushType, '🖌️', BRUSH_CONFIGS));
  }

  for (const def of SIMPLE_BUFF_DEFS) {
    const secs = s[def.key] as number;
    if (secs > 0) {
      list.push({
        id: def.id,
        secs,
        name: def.name,
        desc: def.desc,
        icon: getAssetUrl(ASSET_TYPES.ITEM, def.itemId)
      });
    }
  }

  if (s.incenseSecs > 0) {
    const tName = (s.incenseType && isItemId(s.incenseType) ? INCENSE_TYPES_MAP[s.incenseType] : undefined) || 'Desconocido';
    list.push({
      id: 'incense',
      secs: s.incenseSecs,
      name: `💨 Incienso ${tName}`,
      desc: `Atrae Pokémon de tipo ${tName}.`,
      icon: getAssetUrl(ASSET_TYPES.ITEM, 'luck_incense')
    });
  }

  return list;
}
