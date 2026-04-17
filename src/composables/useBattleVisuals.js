import { ref, nextTick } from 'vue'

export function useBattleVisuals() {
  const canvasRef = ref(null)

  const getHpPct = (cur, max) => (cur / max) * 100
  const getHpClass = (pct) => {
    if (pct > 50) return 'hp-high'
    if (pct > 25) return 'hp-mid'
    return 'hp-low'
  }

  const getSprite = (id, isShiny, isBack = false) => {
    const num = window.POKEMON_SPRITE_IDS?.[id.toLowerCase()] || id
    if (!num) return ''
    const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'
    const path = isBack ? 'back/' : ''
    const shinyPath = isShiny ? 'shiny/' : ''
    return `${base}${path}${shinyPath}${num}.webp`
  }

  const redrawBackground = (isBattleActive, locationId, cycle) => {
    if (isBattleActive && typeof window.drawBattleBackground === 'function') {
      const arena = document.getElementById('battle-arena')
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
    getHpPct,
    getHpClass,
    getSprite,
    redrawBackground,
    getStatusIcon,
    getGenderText,
    getGenderCls
  }
}
