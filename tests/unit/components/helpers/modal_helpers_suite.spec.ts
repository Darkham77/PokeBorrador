import { describe, it, expect } from 'vitest'
import {
  resolveClassSurcharge,
  resolveHealButtonState
} from '@/components/modals/healModalHelper'
import {
  resolveCosmeticLockNotification,
  filterAvatarStylesByShape,
  checkIsLocalEnvironment,
  formatCosmeticRequirement,
  UNLOCK_MIN_CLASS_LEVEL,
  type LockableCosmeticStyle,
  type CosmeticPlayerContext
} from '@/components/modals/cosmeticsFilterHelper'
import {
  parseEventConfig,
  formatEventRemainingTime,
  extractCardSpeciesList,
  resolveEventBannerKey,
  resolveCardElementId,
  resolveEventCardClasses,
  EVENT_BANNER_FALLBACKS
} from '@/components/modals/eventCardHelper'
import type { Event as GameEvent, UpcomingEventOccurrence, SubCompetitionConfig } from '@/logic/events/eventEngine'
import { getSubCompDefaultIcon, getSubCompTitle } from '@/components/modals/eventSubCompHelper'
import {
  isLargeModalEligible,
  resolveModalPositionMode,
  resolveModalCorners,
  resolveModalCardStyles,
  getModalTweenPosition
} from '@/components/common/baseModalHelper'
import {
  MODAL_ANIM_INITIAL_SCALE_MIN,
  MODAL_ANIM_INITIAL_Y_OFFSET
} from '@/logic/constants/animations'
import {
  formatWinRate,
  resolveSearchMessage,
  resolveRankedTierDisplay,
  resolveRankedStatsDisplay
} from '@/components/modals/arenaRankedOverviewHelper'
import {
  isValidFaction,
  resolveCleanPlayerClass,
  resolveLeaderboardRankBadge,
  resolveLeaderboardScore,
  resolveLeaderboardFactionLabel
} from '@/components/modals/arenaLeaderboardHelper'
import {
  getPokemonTypeIcon,
  formatDifficultyLabel,
  resolveGymButtonGradient,
  resolveGymButtonShadow,
  resolveGymHeaderGradient
} from '@/components/gyms/gymCardHelper'
import {
  formatWinnerMetric,
  getRankMedal,
  getRankLabel
} from '@/components/modals/pastEventMetricFormatter'
import type { PastCompetitionWinner } from '@/types/system/stores'

describe('Modal & Card Helpers Domain Suite', () => {
  describe('healModalHelper', () => {
    describe('resolveClassSurcharge', () => {
      it('returns rocket surcharge message', () => {
        expect(resolveClassSurcharge('rocket')).toContain('Equipo Rocket (2x)')
      })

      it('returns criador surcharge message', () => {
        expect(resolveClassSurcharge('criador')).toContain('Criador Profesional')
      })

      it('returns null for other classes or undefined', () => {
        expect(resolveClassSurcharge('entrenador')).toBeNull()
        expect(resolveClassSurcharge(null)).toBeNull()
        expect(resolveClassSurcharge(undefined)).toBeNull()
      })
    })

    describe('resolveHealButtonState', () => {
      it('is disabled when healing is in progress', () => {
        const state = resolveHealButtonState({
          isHealing: true,
          teamCount: 6,
          cost: 100,
          money: 500
        })
        expect(state.disabled).toBe(true)
        expect(state.text).toBe('CURANDO...')
      })

      it('is disabled when team is empty', () => {
        const state = resolveHealButtonState({
          isHealing: false,
          teamCount: 0,
          cost: 100,
          money: 500
        })
        expect(state.disabled).toBe(true)
        expect(state.text).toBe('CURAR EQUIPO')
      })

      it('is disabled when money is insufficient', () => {
        const state = resolveHealButtonState({
          isHealing: false,
          teamCount: 3,
          cost: 300,
          money: 200
        })
        expect(state.disabled).toBe(true)
        expect(state.text).toBe('CURAR EQUIPO')
      })

      it('is enabled when ready to heal', () => {
        const state = resolveHealButtonState({
          isHealing: false,
          teamCount: 6,
          cost: 300,
          money: 500
        })
        expect(state.disabled).toBe(false)
        expect(state.text).toBe('CURAR EQUIPO')
      })
    })
  })

  describe('cosmeticsFilterHelper', () => {
    const baseContext: CosmeticPlayerContext = {
      isAdmin: false,
      playerClass: 'ace_trainer',
      classLevel: 25,
      trainerLevel: 50,
      faction: 'union'
    }

    describe('resolveCosmeticLockNotification', () => {
      it('returns admin lock message for admin-only cosmetic', () => {
        const adminStyle: LockableCosmeticStyle = { id: 'adm', requiredRole: 'admin' }
        expect(resolveCosmeticLockNotification(adminStyle, 'estilo', baseContext)).toBe(
          'Este estilo es exclusivo para Administradores'
        )
      })

      it('returns class lock message for wrong class or low level', () => {
        const classStyle: LockableCosmeticStyle = { id: 'breeder', requiredClass: 'breeder' }
        expect(resolveCosmeticLockNotification(classStyle, 'marco', baseContext)).toBe(
          'Este marco es exclusivo para la profesión BREEDER'
        )

        const lowLevelContext: CosmeticPlayerContext = {
          ...baseContext,
          playerClass: 'breeder',
          classLevel: 10,
          trainerLevel: 10
        }
        expect(resolveCosmeticLockNotification(classStyle, 'marco', lowLevelContext)).toBe(
          `Este marco requiere profesión BREEDER Nivel ${UNLOCK_MIN_CLASS_LEVEL}`
        )
      })

      it('returns faction lock message for mismatched faction', () => {
        const factionStyle: LockableCosmeticStyle = { id: 'poder', requiredFaction: 'poder' }
        expect(resolveCosmeticLockNotification(factionStyle, 'marco', baseContext)).toBe(
          'Este marco es exclusivo para miembros del Team PODER'
        )
      })
    })

    describe('filterAvatarStylesByShape', () => {
      const styles = [
        { id: '1', class: 'avatar-circle' },
        { id: '2', class: 'avatar-frame-sq' },
        { id: '3', class: 'avatar-gold' },
        { id: '4', class: 'avatar-sq-neon' }
      ]

      it('returns all styles when filter is all', () => {
        expect(filterAvatarStylesByShape(styles, 'all')).toHaveLength(4)
      })

      it('filters circular styles (excludes sq)', () => {
        const circular = filterAvatarStylesByShape(styles, 'circular')
        expect(circular).toHaveLength(2)
        expect(circular.every(s => !s.class.includes('sq'))).toBe(true)
      })

      it('filters square styles (includes sq)', () => {
        const square = filterAvatarStylesByShape(styles, 'square')
        expect(square).toHaveLength(2)
        expect(square.every(s => s.class.includes('sq'))).toBe(true)
      })
    })

    describe('checkIsLocalEnvironment', () => {
      it('returns true when isDev is true', () => {
        expect(checkIsLocalEnvironment(true)).toBe(true)
      })

      it('identifies local hostnames', () => {
        expect(checkIsLocalEnvironment(false, 'localhost')).toBe(true)
        expect(checkIsLocalEnvironment(false, '127.0.0.1')).toBe(true)
        expect(checkIsLocalEnvironment(false, 'devbox.local')).toBe(true)
      })

      it('returns false for production hostnames', () => {
        expect(checkIsLocalEnvironment(false, 'pokevicio.online')).toBe(false)
        expect(checkIsLocalEnvironment(false, undefined)).toBe(false)
      })
    })

    describe('formatCosmeticRequirement', () => {
      it('returns ADMIN for role admin', () => {
        expect(formatCosmeticRequirement({ id: 'adm', requiredRole: 'admin' })).toBe('ADMIN')
      })

      it('returns class name and level for requiredClass', () => {
        expect(formatCosmeticRequirement({ id: 'cls', requiredClass: 'ace_trainer' })).toBe('ACE_TRAINER (NIVEL 25)')
      })

      it('returns team name for requiredFaction', () => {
        expect(formatCosmeticRequirement({ id: 'fac', requiredFaction: 'union' })).toBe('TEAM UNION')
      })

      it('returns empty string when no requirement', () => {
        expect(formatCosmeticRequirement({ id: 'free' })).toBe('')
      })
    })
  })

  describe('eventCardHelper', () => {
    describe('parseEventConfig', () => {
      it('parses valid JSON string config', () => {
        const config = parseEventConfig('{"species":"pikachu","speciesShinyMult":2}')
        expect(config.species).toBe('pikachu')
        expect(config.speciesShinyMult).toBe(2)
      })

      it('returns empty object on invalid JSON string', () => {
        expect(parseEventConfig('{invalid')).toEqual({})
      })

      it('returns object if already parsed', () => {
        const obj = { species: 'bulbasaur' }
        expect(parseEventConfig(obj)).toEqual(obj)
      })
    })

    describe('extractCardSpeciesList', () => {
      it('extracts comma-separated pokemon species ids and ignores invalid ones', () => {
        const list = extractCardSpeciesList('pikachu, charizard, not_a_real_mon')
        expect(list).toContain('pikachu')
        expect(list).toContain('charizard')
        expect(list).not.toContain('not_a_real_mon')
      })

      it('ignores wildcard *', () => {
        expect(extractCardSpeciesList('*')).toEqual([])
      })

      it('falls back to configSpecies if rotationSpecies is undefined', () => {
        expect(extractCardSpeciesList(undefined, 'mewtwo')).toEqual(['mewtwo'])
      })
    })

    describe('resolveEventBannerKey', () => {
      it('prefers rotationBanner over configBanner and fallbacks', () => {
        expect(resolveEventBannerKey('dia_pesca', 'custom_rotation', 'custom_config')).toBe('custom_rotation')
      })

      it('uses configBanner if rotationBanner is missing', () => {
        expect(resolveEventBannerKey('dia_pesca', undefined, 'custom_config')).toBe('custom_config')
      })

      it('uses canonical fallback if banners are missing', () => {
        expect(resolveEventBannerKey('dia_pesca')).toBe(EVENT_BANNER_FALLBACKS.dia_pesca)
        expect(resolveEventBannerKey('torneo_pesca')).toBe('pesca_exotica_full')
      })
    })

    describe('resolveCardElementId', () => {
      it('constructs correct element id with prefix and timestamp', () => {
        const id = resolveCardElementId('modal-', 'torneo_pesca', 123456789)
        expect(id).toBe('modal-event-card-torneo_pesca-123456789')
      })

      it('constructs element id without prefix or timestamp', () => {
        const id = resolveCardElementId(undefined, 'torneo_pesca')
        expect(id).toBe('event-card-torneo_pesca')
      })
    })

    describe('resolveEventCardClasses', () => {
      it('returns correct class mappings', () => {
        expect(resolveEventCardClasses(true, false)).toEqual({
          'has-banner': true,
          'is-upcoming-card': false,
          'is-active-card': true
        })
        expect(resolveEventCardClasses(false, true)).toEqual({
          'has-banner': false,
          'is-upcoming-card': true,
          'is-active-card': false
        })
      })
    })

    describe('formatEventRemainingTime', () => {
      it('returns startsInLabel for upcoming occurrence', () => {
        const occurrence = { startsInLabel: 'Inicia en 2 horas' } as UpcomingEventOccurrence
        const event = { id: 'test' } as GameEvent
        expect(formatEventRemainingTime(event, occurrence, Date.now())).toBe('Inicia en 2 horas')
      })

      it('returns Manual (Activo) for active manual event', () => {
        const event = { id: 'test', manual: true } as GameEvent
        expect(formatEventRemainingTime(event, undefined, Date.now())).toBe('Manual (Activo)')
      })
    })
  })

  describe('eventSubCompHelper', () => {
    describe('getSubCompDefaultIcon', () => {
      it('returns appropriate emojis for recognized prefixes', () => {
        expect(getSubCompDefaultIcon('ivs_total')).toBe('🧬')
        expect(getSubCompDefaultIcon('weight_min')).toBe('⚖️')
        expect(getSubCompDefaultIcon('height_max')).toBe('📏')
        expect(getSubCompDefaultIcon('level_cap')).toBe('📈')
        expect(getSubCompDefaultIcon('friendship_cup')).toBe('💖')
        expect(getSubCompDefaultIcon('unknown_metric')).toBe('🏆')
      })
    })

    describe('getSubCompTitle', () => {
      it('formats total_ivs metric correctly', () => {
        const config: SubCompetitionConfig = {
          id: 'sub_ivs',
          name: 'IVs',
          metric: 'total_ivs'
        }
        expect(getSubCompTitle('event_1', config)).toBe('Mayor cantidad de IVs totales (0 a 186)')
      })

      it('formats stat_iv metric with species suffix if present', () => {
        const config: SubCompetitionConfig = {
          id: 'sub_stat',
          name: 'Stat IV',
          metric: 'stat_iv',
          targetStat: 'atk',
          targetSpecies: 'pikachu'
        }
        expect(getSubCompTitle('event_1', config)).toBe('Mayor IV en ATK (PIKACHU)')
      })

      it('formats weight metric according to resolved direction', () => {
        const configMax: SubCompetitionConfig = {
          id: 'sub_w',
          name: 'Peso Max',
          metric: 'weight',
          order: 'max'
        }
        expect(getSubCompTitle('event_1', configMax)).toBe('Mayor Peso')

        const configMin: SubCompetitionConfig = {
          id: 'sub_w_min',
          name: 'Peso Min',
          metric: 'weight',
          order: 'min',
          targetSpecies: 'snorlax'
        }
        expect(getSubCompTitle('event_1', configMin)).toBe('Menor Peso (SNORLAX)')
      })

      it('formats height, level and friendship correctly', () => {
        expect(getSubCompTitle('event_1', { id: 'h', name: 'Altura', metric: 'height', order: 'max' })).toBe('Mayor Altura')
        expect(getSubCompTitle('event_1', { id: 'lvl', name: 'Nivel', metric: 'level', order: 'min' })).toBe('Menor Nivel')
        expect(getSubCompTitle('event_1', { id: 'fr', name: 'Amistad', metric: 'friendship', order: 'max' })).toBe('Mayor Amistad')
      })

      it('falls back to description or name if metric is custom', () => {
        expect(getSubCompTitle('event_1', { id: 'custom', name: 'Nombre Fallback', metric: 'custom' as never, description: 'Especial' })).toBe('Especial')
        expect(getSubCompTitle('event_1', { id: 'custom', name: 'Nombre', metric: 'custom' as never })).toBe('Nombre')
      })
    })
  })

  describe('baseModalHelper', () => {
    describe('isLargeModalEligible', () => {
      it('returns false if disableAutoGrow is true', () => {
        expect(isLargeModalEligible('shop', '900px', true)).toBe(false)
      })
      it('returns false for inventory with 480px', () => {
        expect(isLargeModalEligible('inventory', '480px', false)).toBe(false)
      })
      it('returns true for known large modal ids', () => {
        expect(isLargeModalEligible('inventory', '900px', false)).toBe(true)
        expect(isLargeModalEligible('shop', '600px', false)).toBe(true)
      })
    })

    describe('resolveModalPositionMode', () => {
      it('preserves explicit positionMode', () => {
        expect(resolveModalPositionMode('custom', 'center')).toBe('custom')
      })
      it('resolves stuck for side and fullscreen types', () => {
        expect(resolveModalPositionMode(null, 'side')).toBe('stuck')
        expect(resolveModalPositionMode(null, 'fullscreen')).toBe('stuck')
      })
      it('resolves floating for center', () => {
        expect(resolveModalPositionMode(null, 'center')).toBe('floating')
      })
    })

    describe('resolveModalCorners', () => {
      it('preserves explicit corners', () => {
        expect(resolveModalCorners('top', 'floating', 'center')).toBe('top')
      })
      it('returns all for floating', () => {
        expect(resolveModalCorners(null, 'floating', 'center')).toBe('all')
      })
      it('returns type mapping when not floating', () => {
        expect(resolveModalCorners(null, 'stuck', 'center')).toBe('all')
        expect(resolveModalCorners(null, 'stuck', 'fullscreen')).toBe('none')
      })
    })

    describe('resolveModalCardStyles', () => {
      it('returns empty object for fullscreen', () => {
        expect(resolveModalCardStyles({
          type: 'fullscreen',
          id: 'test',
          maxWidth: '500px',
          height: 'auto',
          maxHeight: '90vh',
          accentColor: '#fff',
          disableZoom: true,
          disableAutoGrow: true,
          appZoom: 1,
          positionMode: 'floating'
        })).toEqual({})
      })
      it('computes styles for standard floating modal', () => {
        const styles = resolveModalCardStyles({
          type: 'center',
          id: 'test',
          maxWidth: '500px',
          height: 'auto',
          maxHeight: '90vh',
          accentColor: '#123456',
          disableZoom: true,
          disableAutoGrow: true,
          appZoom: 1,
          positionMode: 'floating'
        })
        expect(styles.width).toBe('100%')
        expect(styles['--modal-accent']).toBe('#123456')
      })
    })

    describe('getModalTweenPosition', () => {
      it('returns correct offset for directional types', () => {
        expect(getModalTweenPosition('down', true)).toEqual({ y: '100%' })
        expect(getModalTweenPosition('top', true)).toEqual({ y: '-100%' })
        expect(getModalTweenPosition('left', true)).toEqual({ x: '-100%' })
        expect(getModalTweenPosition('side-right', true)).toEqual({ x: '100%' })
      })

      it('returns scale and y offset for center modals', () => {
        expect(getModalTweenPosition('center', true)).toEqual({
          scale: MODAL_ANIM_INITIAL_SCALE_MIN,
          y: MODAL_ANIM_INITIAL_Y_OFFSET
        })
      })
    })
  })

  describe('arenaRankedOverviewHelper', () => {
    describe('formatWinRate', () => {
      it('returns 0.0% when total matches is 0', () => {
        expect(formatWinRate(0, 0)).toBe('0.0%')
      })

      it('calculates correct win percentage', () => {
        expect(formatWinRate(3, 1)).toBe('75.0%')
        expect(formatWinRate(1, 2)).toBe('33.3%')
      })
    })

    describe('resolveSearchMessage', () => {
      it('returns passive defense message on fallback phase', () => {
        expect(resolveSearchMessage('passive_fallback', 5)).toBe('Buscando defensa pasiva...')
      })

      it('returns human opponent search message with countdown', () => {
        expect(resolveSearchMessage('human_matching', 12)).toBe('Buscando rival humano... (12s)')
      })
    })

    describe('resolveRankedTierDisplay', () => {
      it('uses fallback defaults when tier is undefined', () => {
        const display = resolveRankedTierDisplay(undefined, undefined)
        expect(display.name).toBe('Bronce')
        expect(display.color).toBe('#888')
        expect(display.icon).toBe('🥉')
        expect(display.elo).toBe(1000)
      })

      it('uses tier values when present', () => {
        const display = resolveRankedTierDisplay(
          { name: 'Maestro', color: '#ffcc00', icon: '👑' },
          1850
        )
        expect(display.name).toBe('Maestro')
        expect(display.color).toBe('#ffcc00')
        expect(display.icon).toBe('👑')
        expect(display.elo).toBe(1850)
      })
    })

    describe('resolveRankedStatsDisplay', () => {
      it('formats stats with 0 defaults', () => {
        const stats = resolveRankedStatsDisplay(undefined)
        expect(stats.wins).toBe(0)
        expect(stats.losses).toBe(0)
        expect(stats.winRateText).toBe('0.0%')
      })

      it('formats stats accurately', () => {
        const stats = resolveRankedStatsDisplay({ wins: 8, losses: 2 })
        expect(stats.wins).toBe(8)
        expect(stats.losses).toBe(2)
        expect(stats.winRateText).toBe('80.0%')
      })
    })
  })

  describe('arenaLeaderboardHelper', () => {
    describe('isValidFaction', () => {
      it('returns false for nullish or invalid faction values', () => {
        expect(isValidFaction(null)).toBe(false)
        expect(isValidFaction(undefined)).toBe(false)
        expect(isValidFaction('')).toBe(false)
        expect(isValidFaction('   ')).toBe(false)
        expect(isValidFaction('null')).toBe(false)
        expect(isValidFaction('NULL')).toBe(false)
        expect(isValidFaction('undefined')).toBe(false)
      })

      it('returns true for genuine faction names', () => {
        expect(isValidFaction('poder')).toBe(true)
        expect(isValidFaction('union')).toBe(true)
        expect(isValidFaction('rocket')).toBe(true)
        expect(isValidFaction('Poder')).toBe(true)
      })
    })

    describe('resolveCleanPlayerClass', () => {
      it('returns Entrenador for empty or nullish strings', () => {
        expect(resolveCleanPlayerClass(null)).toBe('Entrenador')
        expect(resolveCleanPlayerClass(undefined)).toBe('Entrenador')
        expect(resolveCleanPlayerClass('')).toBe('Entrenador')
        expect(resolveCleanPlayerClass('null')).toBe('Entrenador')
        expect(resolveCleanPlayerClass('Null')).toBe('Entrenador')
        expect(resolveCleanPlayerClass('NULL')).toBe('Entrenador')
      })

      it('preserves valid player classes', () => {
        expect(resolveCleanPlayerClass('Cazabichos')).toBe('Cazabichos')
        expect(resolveCleanPlayerClass('Campeón')).toBe('Campeón')
      })
    })

    describe('resolveLeaderboardRankBadge', () => {
      it('returns podium medals for top 3 indexes', () => {
        expect(resolveLeaderboardRankBadge(0)).toEqual({ isPodium: true, emoji: '🥇' })
        expect(resolveLeaderboardRankBadge(1)).toEqual({ isPodium: true, emoji: '🥈' })
        expect(resolveLeaderboardRankBadge(2)).toEqual({ isPodium: true, emoji: '🥉' })
      })

      it('returns 1-based digit text for rank 4 and above', () => {
        expect(resolveLeaderboardRankBadge(3)).toEqual({ isPodium: false, digitText: '4' })
        expect(resolveLeaderboardRankBadge(99)).toEqual({ isPodium: false, digitText: '100' })
      })
    })

    describe('resolveLeaderboardScore', () => {
      it('formats ELO score', () => {
        expect(resolveLeaderboardScore('elo_rating', { elo: 1540 })).toBe('1540 ELO')
        expect(resolveLeaderboardScore('elo_rating', {})).toBe('0 ELO')
      })

      it('formats trainer level score', () => {
        expect(resolveLeaderboardScore('trainer_level', { level: 42 })).toBe('Nv. 42')
        expect(resolveLeaderboardScore('trainer_level', {})).toBe('Nv. 1')
      })

      it('formats badges count score', () => {
        expect(resolveLeaderboardScore('badges', { badges: 8 })).toBe('8 Medallas')
        expect(resolveLeaderboardScore('badges', {})).toBe('0 Medallas')
      })
    })

    describe('resolveLeaderboardFactionLabel', () => {
      it('formats known factions', () => {
        expect(resolveLeaderboardFactionLabel('poder')).toBe('PODER')
        expect(resolveLeaderboardFactionLabel('union')).toBe('UNIÓN')
        expect(resolveLeaderboardFactionLabel('rocket')).toBe('ROCKET')
      })
    })
  })

  describe('gymCardHelper', () => {
    describe('getPokemonTypeIcon', () => {
      it('returns emoji icon for known types', () => {
        expect(getPokemonTypeIcon('rock')).toBe('🪨')
        expect(getPokemonTypeIcon('water')).toBe('💧')
        expect(getPokemonTypeIcon('fire')).toBe('🔥')
        expect(getPokemonTypeIcon('grass')).toBe('🌿')
      })

      it('returns default trophy icon for unknown types', () => {
        expect(getPokemonTypeIcon('unknown')).toBe('🏆')
      })
    })

    describe('formatDifficultyLabel', () => {
      it('returns uppercase Spanish labels for difficulties', () => {
        expect(formatDifficultyLabel('easy')).toBe('FÁCIL')
        expect(formatDifficultyLabel('normal')).toBe('NORMAL')
        expect(formatDifficultyLabel('hard')).toBe('DIFÍCIL')
      })
    })

    describe('gradient & shadow helpers', () => {
      it('generates button gradient and shadow from gym color', () => {
        expect(resolveGymButtonGradient('#ff0000')).toBe('linear-gradient(135deg, #ff0000 0%, #ff0000dd 100%)')
        expect(resolveGymButtonShadow('#ff0000')).toBe('0 8px 25px #ff000044')
        expect(resolveGymHeaderGradient('#ff0000')).toBe('linear-gradient(180deg, #ff000015 0%, transparent 100%)')
      })
    })
  })

  describe('pastEventMetricFormatter', () => {
    it('formats ivs category with total IVs and tier label', () => {
      const winner: PastCompetitionWinner = {
        player_id: 'user-1',
        player_name: 'Ash',
        rank: 'first',
        score: 180,
        entry_data: {
          species: 'pikachu',
          total_ivs: 180,
          tier_label: 'S'
        }
      }
      expect(formatWinnerMetric(winner, 'ivs_highest')).toBe('180 / 186 IVs (S)')
    })

    it('formats level category', () => {
      const winner: PastCompetitionWinner = {
        player_id: 'user-1',
        player_name: 'Ash',
        rank: 'first',
        score: 75,
        entry_data: {
          species: 'pikachu'
        }
      }
      expect(formatWinnerMetric(winner, 'level_highest')).toBe('Nv. 75 / 100')
    })

    it('formats friendship category', () => {
      const winner: PastCompetitionWinner = {
        player_id: 'user-1',
        player_name: 'Ash',
        rank: 'first',
        score: 220,
        entry_data: {
          species: 'pikachu'
        }
      }
      expect(formatWinnerMetric(winner, 'friendship_highest')).toBe('220 / 255 Amistad')
    })

    it('formats weight category with physical dimension tier', () => {
      const winner: PastCompetitionWinner = {
        player_id: 'user-1',
        player_name: 'Ash',
        rank: 'first',
        score: 6.0,
        entry_data: {
          species: 'pikachu'
        }
      }
      const result = formatWinnerMetric(winner, 'weight_max')
      expect(result).toContain('6.0 kg')
    })

    it('formats height category with physical dimension tier', () => {
      const winner: PastCompetitionWinner = {
        player_id: 'user-1',
        player_name: 'Ash',
        rank: 'first',
        score: 0.4,
        entry_data: {
          species: 'pikachu'
        }
      }
      const result = formatWinnerMetric(winner, 'height_max')
      expect(result).toContain('0.4 m')
    })

    it('formats display_value when provided', () => {
      const winner: PastCompetitionWinner = {
        player_id: 'user-1',
        player_name: 'Ash',
        rank: 'first',
        entry_data: {
          display_value: 'Custom Value'
        }
      }
      expect(formatWinnerMetric(winner, 'other')).toBe('Custom Value')
    })

    it('formats medals and labels correctly', () => {
      expect(getRankMedal('first')).toBe('🥇')
      expect(getRankMedal('second')).toBe('🥈')
      expect(getRankMedal('third')).toBe('🥉')
      expect(getRankMedal(4)).toBe('🎖️')

      expect(getRankLabel('first')).toBe('1º')
      expect(getRankLabel('second')).toBe('2º')
      expect(getRankLabel('third')).toBe('3º')
      expect(getRankLabel(4)).toBe('4º')
    })
  })
})

