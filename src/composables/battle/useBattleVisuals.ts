
import { ref } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

export function useBattleVisuals() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const containerRef = ref<HTMLElement | null>(null)

  const HP_HIGH_THRESHOLD_PCT = 50
  const HP_MID_THRESHOLD_PCT = 25
  const HP_WARN_THRESHOLD_PCT = 20

  const getHpPct = (cur: number, max: number) => (cur / max) * 100
  const getHpClass = (pct: number) => {
    if (pct > HP_HIGH_THRESHOLD_PCT) return 'hp-high'
    if (pct > HP_MID_THRESHOLD_PCT) return 'hp-mid'
    return 'hp-low'
  }

  const getHpColor = (pct: number) => {
    if (pct > HP_HIGH_THRESHOLD_PCT) return '#4ade80'
    if (pct > HP_WARN_THRESHOLD_PCT) return '#facc15'
    return '#f87171'
  }

  const getSprite = (id: string, isShiny: boolean, isBack = false) => {
    return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack })
  }

  const redrawBackground = (isBattleActive: boolean, locationId: string, cycle: string) => {
    if (isBattleActive && typeof window.drawBattleBackground === 'function') {
      const arena = containerRef.value
      const canvas = canvasRef.value
      if (arena && canvas) {
        canvas.width = arena.offsetWidth
        canvas.height = arena.offsetHeight
        window.drawBattleBackground(locationId || 'wild', cycle)
      }
    }
  }

  const getStatusIcon = (s: string) => {
    const icons: Record<string, string> = { 
      burn: '🔥', poison: '☠️', paralyze: '⚡', sleep: '💤', freeze: '🧊' 
    }
    return icons[s] || ''
  }

  const getGenderText = (g: string) => {
    const texts: Record<string, string> = { m: '♂', f: '♀' }
    return texts[g] || ''
  }

  const getGenderCls = (g: string) => {
    const classes: Record<string, string> = { m: 'gender-male', f: 'gender-female' }
    return classes[g] || 'gender-none'
  }

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
  }
}
