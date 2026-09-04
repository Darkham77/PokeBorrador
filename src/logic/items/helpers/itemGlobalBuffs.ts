import { useBuffsStore } from '@/stores/battle/buffs';
import type { ItemEffectResult } from '@/types/inventory/items';
import type { GameState } from '@/types/system/game';
import {
  BUFF_DURATION_5_MIN_SEC,
  BUFF_DURATION_15_MIN_SEC,
  BUFF_DURATION_20_MIN_SEC,
  BUFF_DURATION_30_MIN_SEC,
  BUFF_DURATION_40_MIN_SEC,
  BUFF_DURATION_60_MIN_SEC
} from '@/logic/constants/items';

const stateEffect = (fn: (s: GameState) => ItemEffectResult) => (p: unknown) => fn(p as GameState);

export const GLOBAL_BUFF_EFFECTS: Record<string, (p: unknown) => ItemEffectResult> = { // open-record: Generic key-value data dictionary container
  'fishingrod': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', BUFF_DURATION_20_MIN_SEC, 'standard'); return { success: true, message: 'activó una Caña de pescar (20 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'fishingrodgood': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', BUFF_DURATION_40_MIN_SEC, 'good'); return { success: true, message: 'activó una Caña Buena (40 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'fishingrodsuper': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', BUFF_DURATION_60_MIN_SEC, 'super'); return { success: true, message: 'activó la Supercaña (60 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'pickaxe': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', BUFF_DURATION_20_MIN_SEC, 'standard'); return { success: true, message: 'activó un Pico de excavación (20 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'pickaxesilver': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', BUFF_DURATION_40_MIN_SEC, 'good'); return { success: true, message: 'activó un Pico Bueno (40 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'pickaxegold': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', BUFF_DURATION_60_MIN_SEC, 'super'); return { success: true, message: 'activó el Superpico (60 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'brush': stateEffect((_state) => { useBuffsStore().addBuff('brush', BUFF_DURATION_20_MIN_SEC, 'standard'); return { success: true, message: 'activó un Pincel de excavación (20 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'brushgood': stateEffect((_state) => { useBuffsStore().addBuff('brush', BUFF_DURATION_40_MIN_SEC, 'good'); return { success: true, message: 'activó un Pincel Bueno (40 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'brushsuper': stateEffect((_state) => { useBuffsStore().addBuff('brush', BUFF_DURATION_60_MIN_SEC, 'super'); return { success: true, message: 'activó el Superpincel (60 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'repel': stateEffect((_state) => { useBuffsStore().addBuff('repel', BUFF_DURATION_5_MIN_SEC); return { success: true, message: 'activó un Repelente (5 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'superrepel': stateEffect((_state) => { useBuffsStore().addBuff('repel', BUFF_DURATION_15_MIN_SEC); return { success: true, message: 'activó un Superrepelente (15 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'maxrepel': stateEffect((_state) => { useBuffsStore().addBuff('repel', BUFF_DURATION_30_MIN_SEC); return { success: true, message: 'activó un Máximo Repelente (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'ticketshiny': stateEffect((_state) => { useBuffsStore().addBuff('shiny', BUFF_DURATION_60_MIN_SEC); return { success: true, message: 'activó el Ticket Shiny (60 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'amuletcoin': stateEffect((_state) => { useBuffsStore().addBuff('amulet', BUFF_DURATION_60_MIN_SEC); return { success: true, message: 'activó la Moneda Amuleto (60 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'luckyegg': stateEffect((_state) => { useBuffsStore().addBuff('lucky-egg', BUFF_DURATION_30_MIN_SEC); return { success: true, message: 'activó un Huevo Suerte (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'ticketsafari': stateEffect((_state) => { useBuffsStore().addBuff('safari', BUFF_DURATION_30_MIN_SEC); return { success: true, message: 'activó el Ticket Safari (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'ticketcerulean': stateEffect((_state) => { useBuffsStore().addBuff('cerulean', BUFF_DURATION_30_MIN_SEC); return { success: true, message: 'activó el Ticket Cueva Celeste (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'ticketarticuno': stateEffect((_state) => { useBuffsStore().addBuff('articuno', BUFF_DURATION_30_MIN_SEC); return { success: true, message: 'activó el Ticket Articuno (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'ticketmewtwo': stateEffect((_state) => { useBuffsStore().addBuff('mewtwo', BUFF_DURATION_30_MIN_SEC); return { success: true, message: 'activó el Ticket Mewtwo (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'ivscanner': stateEffect((_state) => { useBuffsStore().addBuff('iv-scanner', BUFF_DURATION_60_MIN_SEC); return { success: true, message: 'activó el Escáner de IVs (60 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'incensefire': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'fire'); return { success: true, message: 'activó el Incienso Fuego (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'incensewater': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'water'); return { success: true, message: 'activó el Incienso Agua (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'incensegrass': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'grass'); return { success: true, message: 'activó el Incienso Planta (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'incensenormal': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'normal'); return { success: true, message: 'activó el Incienso Normal (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'incenseghost': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'ghost'); return { success: true, message: 'activó el Incienso Fantasma (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
  'incensepsychic': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'psychic'); return { success: true, message: 'activó el Incienso Psíquico (30 min)' }; }), // magic-ok: Explicit mathematical constant or ratio
};
