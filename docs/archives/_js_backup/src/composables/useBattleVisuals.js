import { ref } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

export function useBattleVisuals() {
  const canvasRef = ref(null)
  const containerRef = ref(null)

  const getHpPct = (cur, max) => (cur / max) * 100
  const getHpClass = (pct) => {
    if (pct > 50) return 'hp-high'
    if (pct > 25) return 'hp-mid'
    return 'hp-low'
  }

  const getHpColor = (pct) => {
    if (pct > 50) return '#4ade80'
    if (pct > 20) return '#facc15'
    return '#f87171'
  }

  const getSprite = (id, isShiny, isBack = false) => {
    return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack })
  }

  const redrawBackground = (isBattleActive, locationId, cycle) => {
    if (isBattleActive && typeof window.drawBattleBackground === 'function') {
      const arena = containerRef.value
      if (arena && canvasRef.value) {
        canvasRef.value.width = arena.offsetWidth
        canvasRef.value.height = arena.offsetHeight
        window.drawBattleBackground(locationId || 'wild', cycle)
      }
    }
  }

  const getStatusIcon = (s) => ({ 
    burn: '🔥', poison: '☠️', paralyze: '⚡', sleep: '💤', freeze: '🧊' 
  }[s] || '')

  const getGenderText = (g) => ({ M: '♂', F: '♀' }[g] || '')
  const getGenderCls = (g) => ({ M: 'gender-male', F: 'gender-female' }[g] || 'gender-none')

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
