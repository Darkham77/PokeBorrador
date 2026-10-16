import { ref } from 'vue';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import type { MapRouteId } from '@/data/world/map-assets';
import type { PokemonGender, PokemonStatus } from '@/types/pokemon/pokemon';

export function useBattleVisuals() {
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const containerRef = ref<HTMLElement | null>(null);

  const HP_HIGH_THRESHOLD_PCT = 50;
  const HP_MID_THRESHOLD_PCT = 25;
  const HP_WARN_THRESHOLD_PCT = 20;

  const getHpPct = (cur: number, max: number) => (cur / max) * 100;
  const getHpClass = (pct: number) => {
    if (pct > HP_HIGH_THRESHOLD_PCT) return 'hp-high';
    if (pct > HP_MID_THRESHOLD_PCT) return 'hp-mid';
    return 'hp-low';
  };

  const getHpColor = (pct: number) => {
    if (pct > HP_HIGH_THRESHOLD_PCT) return '#4ade80';
    if (pct > HP_WARN_THRESHOLD_PCT) return '#facc15';
    return '#f87171';
  };

  const getSprite = (id: string, isShiny: boolean, isBack = false) => {
    return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack });
  };

  const redrawBackground = (isBattleActive: boolean, locationId: MapRouteId, cycle: string) => {
    if (isBattleActive && typeof window.drawBattleBackground === 'function') {
      const arena = containerRef.value;
      const canvas = canvasRef.value;
      if (arena && canvas) {
        canvas.width = arena.offsetWidth;
        canvas.height = arena.offsetHeight;
        window.drawBattleBackground(locationId || 'wild', cycle);
      }
    }
  };

  const getStatusIcon = (s: string) => {
    const icons: Partial<Record<PokemonStatus, string>> = {
      brn: '🔥',
      psn: '☠️',
      tox: '☠️',
      par: '⚡',
      slp: '💤',
      frz: '🧊'
    };
    return (icons as Record<string, string>)[s] || ''; // open-record: Generic fallback for non-canonical status
  };

  const getGenderText = (g: string) => {
    const texts: Partial<Record<NonNullable<PokemonGender>, string>> = { m: '♂', f: '♀' };
    return (texts as Record<string, string>)[g] || ''; // open-record: Generic gender fallback
  };

  const getGenderCls = (g: string) => {
    const classes: Partial<Record<NonNullable<PokemonGender>, string>> = {
      m: 'gender-male',
      f: 'gender-female'
    };
    return (classes as Record<string, string>)[g] || 'gender-none'; // open-record: Generic gender fallback
  };

  return {
    canvasRef,
    containerRef,
    getHpPct,
    getHpClass,
    getHpColor,
    getSprite,
    redrawBackground,
    getStatusIcon,
    getGenderText,
    getGenderCls
  };
}
