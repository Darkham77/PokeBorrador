import type { Ref } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useErrorStore } from '@/stores/errorStore.ts'
import { 
  resolveEventSubCompetitions,
  evaluatePokemonForSubCompetition,
  isPokemonEligibleForSubCompetition,
  isPokemonEnrolledInOtherSubCompetition,
  type Event as GameEvent 
} from '@/logic/events/eventEngine'
import { getServerTime } from '@/logic/utils/timeUtils'
import type { CompetitionEntry } from '@/types/system/stores'
import type { useGameStore } from '@/stores/game.ts'
import type { useAuthStore } from '@/stores/auth.ts'
import type { useUIStore } from '@/stores/ui.ts'

export interface EventEnrollmentContext {
  gameStore: ReturnType<typeof useGameStore>
  authStore: ReturnType<typeof useAuthStore>
  uiStore: ReturnType<typeof useUIStore>
  allEvents: Ref<GameEvent[]>
  userEntries: Ref<Record<string, CompetitionEntry>>
}

export async function fetchUserEntries(ctx: EventEnrollmentContext) {
  const { authStore, gameStore, userEntries } = ctx
  if (!authStore.user || !gameStore.db) return

  const { data: entries, error } = await gameStore.db.from('competition_entries')
    .select('*')
    .eq('player_id', authStore.user.id)

  if (!error && entries) {
    const map: Record<string, CompetitionEntry> = {}
    for (const e of entries as CompetitionEntry[]) {
      const catId = e.category_id || 'ivs'
      map[`${e.event_id}:${catId}`] = e
      if (catId === 'ivs') {
        map[e.event_id] = e
      }
    }
    userEntries.value = map
  }
}

export async function submitCompetitionEntry(
  ctx: EventEnrollmentContext,
  eventId: string,
  categoryIdOrUid: string,
  maybeUid?: string
) {
  const categoryId = typeof maybeUid === 'string' ? categoryIdOrUid : 'ivs'
  const pokemonUid = typeof maybeUid === 'string' ? maybeUid : categoryIdOrUid

  const { gameStore, authStore, uiStore, allEvents, userEntries } = ctx
  if (!authStore.user || !gameStore.db) {
    uiStore.notify('Debes iniciar sesión para participar en eventos.', '⚠️')
    return
  }

  const isCrossEnrolled = isPokemonEnrolledInOtherSubCompetition(
    userEntries.value,
    eventId,
    categoryId,
    pokemonUid
  )
  if (isCrossEnrolled) {
    uiStore.notify('Este Pokémon ya está participando en otra categoría de este evento.', '⚠️')
    return
  }

  const pokemon = gameStore.getPokemonByUid(pokemonUid)

  if (!pokemon) {
    uiStore.notify('El Pokémon seleccionado no existe en tu equipo o cajas.', '❌')
    return
  }

  try {
    const eventCfg = allEvents.value.find(e => e.id === eventId)
    const synchronizedDate = Temporal.Instant.fromEpochMilliseconds(getServerTime())

    if (eventCfg) {
      const subComps = resolveEventSubCompetitions(eventCfg, synchronizedDate)
      const subComp = subComps.find(s => s.id === categoryId) || subComps[0]!
      const eligibility = isPokemonEligibleForSubCompetition(eventCfg, subComp, pokemon, synchronizedDate)
      if (!eligibility.eligible) {
        uiStore.notify(eligibility.reason || 'Este Pokémon no cumple con los requisitos del evento.', '⚠️')
        return
      }
    }

    if (typeof pokemon.obtainedAt !== 'number' || isNaN(pokemon.obtainedAt) || pokemon.obtainedAt <= 0) {
      uiStore.notify('El Pokémon seleccionado no tiene una fecha de captura registrada.', '⚠️')
      return
    }

    const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)

    const subComps = eventCfg ? resolveEventSubCompetitions(eventCfg, synchronizedDate) : []
    const subComp = subComps.find(s => s.id === categoryId) || {
      id: categoryId,
      name: 'Competición',
      metric: 'total_ivs' as const
    }
    const evalRes = evaluatePokemonForSubCompetition(pokemon, subComp)

    const entryId = `${eventId}:${categoryId}:${authStore.user.id}`
    const entryData: CompetitionEntry = {
      id: entryId,
      event_id: eventId,
      category_id: categoryId,
      player_id: authStore.user.id,
      player_name: authStore.user.user_metadata?.username || authStore.user.user_metadata?.full_name || authStore.user.email?.split('@')[0] || 'Entrenador',
      player_email: authStore.user.email || '',
      pokemon_uid: pokemonUid,
      data: {
        species: pokemon.id,
        name: pokemon.name,
        nickname: pokemon.nickname,
        level: pokemon.level,
        score: evalRes.score,
        total_ivs: totalIvs,
        ivs: evalRes.ivs || ivs,
        is_shiny: pokemon.isShiny,
        obtained_at: pokemon.obtainedAt,
        height: pokemon.height,
        weight: pokemon.weight,
        displayValue: evalRes.displayValue,
        player_class: gameStore.state.playerClass || 'entrenador',
        trainer_level: gameStore.state.trainerLevel || 1,
        avatar_style: gameStore.state.avatar_style || '',
        nick_style: gameStore.state.nick_style || '',
        gender: gameStore.state.gender || 'h'
      },
      submitted_at: Temporal.Now.instant().toString()
    }
    
    const res = await gameStore.db.from('competition_entries').upsert(entryData, {
      onConflict: 'event_id, category_id, player_id'
    }).select().single()
    const entry = res.data as { id?: string } | null // domain-ok
    const error = res.error as { message?: string } | null // domain-ok
    
    if (error) {
      const dbError = new Error(error.message || 'Error al registrar Pokémon en sub-competencia')
      if (Error.captureStackTrace) {
        Error.captureStackTrace(dbError, submitCompetitionEntry)
      }
      useErrorStore().setError(dbError, {
        type: 'Competition Entry Database Error',
        source: 'submitCompetitionEntry'
      })
    } else {
      const assignedId = entry?.id || entryId
      userEntries.value = {
        ...userEntries.value,
        [`${eventId}:${categoryId}`]: { ...entryData, id: assignedId },
        ...(categoryId === 'ivs' ? { [eventId]: { ...entryData, id: assignedId } } : {})
      }
      pokemon.onEvent = true
      if (!gameStore.state.stats) {
        gameStore.state.stats = {}
      }
      const activeUserEventIds = new Set(Object.keys(userEntries.value).map(k => k.split(':')[0]).filter(Boolean))
      gameStore.state.stats.eventParticipations = Math.max(
        Number(gameStore.state.stats.eventParticipations || 0),
        activeUserEventIds.size
      )
      gameStore.scheduleSave()
      uiStore.notify('¡Pokémon registrado exitosamente!', '✅')
    }
  } catch (e) {
    logger.error('Events', `Error submitting entry: ${(e as Error).message}`)
    useErrorStore().setError(e, {
      type: 'Competition Entry Exception',
      source: 'submitCompetitionEntry'
    })
  }
}

export async function removeCompetitionEntry(
  ctx: EventEnrollmentContext,
  eventId: string,
  categoryId = 'ivs'
): Promise<boolean> {
  const { gameStore, authStore, uiStore, userEntries } = ctx
  if (!authStore.user || !gameStore.db) {
    uiStore.notify('Debes iniciar sesión para gestionar tus inscripciones.', '⚠️')
    return false
  }

  const existingKey = `${eventId}:${categoryId}`
  const existingEntry = userEntries.value[existingKey] || (categoryId === 'ivs' ? userEntries.value[eventId] : null)
  
  if (!existingEntry) {
    uiStore.notify('No hay ninguna inscripción activa en esta categoría.', '⚠️')
    return false
  }

  try {
    const { error } = await gameStore.db.from('competition_entries')
      .delete()
      .eq('event_id', eventId)
      .eq('category_id', categoryId)
      .eq('player_id', authStore.user.id)

    if (error) {
      const errMsg = typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : String(error || 'Error al desinscribir el Pokémon')
      uiStore.notify(errMsg, '❌')
      return false
    }

    const updatedEntries = { ...userEntries.value }
    delete updatedEntries[existingKey]
    if (categoryId === 'ivs') {
      delete updatedEntries[eventId]
    }
    userEntries.value = updatedEntries

    // Free Pokémon if not in other subcompetitions
    if (existingEntry.pokemon_uid) {
      const isEnrolledElsewhere = Object.values(userEntries.value).some(
        e => e.pokemon_uid === existingEntry.pokemon_uid
      )
      const poke = gameStore.getPokemonByUid(existingEntry.pokemon_uid)
      if (poke && !isEnrolledElsewhere) {
        poke.onEvent = false
      }
    }

    gameStore.scheduleSave()
    uiStore.notify('Inscripción cancelada. Pokémon liberado.', '✅')
    return true
  } catch (e) {
    logger.error('Events', `Error removing entry: ${(e as Error).message}`)
    uiStore.notify('Error al desinscribir el Pokémon.', '❌')
    return false
  }
}
