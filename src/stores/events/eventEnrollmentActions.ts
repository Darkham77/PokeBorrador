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
import { getPokemonPhysicalHeight, getPokemonPhysicalWeight } from '@/logic/pokemon/physicalDimensionsMath'
import { calculateTotalIVs } from '@/logic/pokemon/statsMath'
import type { Pokemon } from '@/types/pokemon/pokemon'
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

function validateEligibility(
  ctx: EventEnrollmentContext,
  eventId: string,
  categoryId: string,
  pokemonUid: string
): { valid: false } | { valid: true; pokemon: Pokemon; eventCfg: GameEvent | undefined; synchronizedDate: Temporal.Instant } {
  const { gameStore, authStore, uiStore, allEvents, userEntries } = ctx
  if (!authStore.user || !gameStore.db) {
    uiStore.notify('Debes iniciar sesión para participar en eventos.', '⚠️')
    return { valid: false }
  }

  if (isPokemonEnrolledInOtherSubCompetition(userEntries.value, eventId, categoryId, pokemonUid)) {
    uiStore.notify('Este Pokémon ya está participando en otra categoría de este evento.', '⚠️')
    return { valid: false }
  }

  const pokemon = gameStore.getPokemonByUid(pokemonUid)
  if (!pokemon) {
    uiStore.notify('El Pokémon seleccionado no existe en tu equipo o cajas.', '❌')
    return { valid: false }
  }

  const eventCfg = allEvents.value.find(e => e.id === eventId)
  const synchronizedDate = Temporal.Instant.fromEpochMilliseconds(getServerTime())

  if (eventCfg) {
    const subComps = resolveEventSubCompetitions(eventCfg, synchronizedDate)
    const subComp = subComps.find(s => s.id === categoryId) || subComps[0]!
    const eligibility = isPokemonEligibleForSubCompetition(eventCfg, subComp, pokemon, synchronizedDate)
    if (!eligibility.eligible) {
      uiStore.notify(eligibility.reason || 'Este Pokémon no cumple con los requisitos del evento.', '⚠️')
      return { valid: false }
    }
  }

  if (typeof pokemon.obtainedAt !== 'number' || isNaN(pokemon.obtainedAt) || pokemon.obtainedAt <= 0) {
    uiStore.notify('El Pokémon seleccionado no tiene una fecha de captura registrada.', '⚠️')
    return { valid: false }
  }

  return { valid: true, pokemon, eventCfg, synchronizedDate }
}

function buildEntryPayload(
  ctx: EventEnrollmentContext,
  eventId: string,
  categoryId: string,
  pokemonUid: string,
  pokemon: Pokemon,
  eventCfg: GameEvent | undefined,
  synchronizedDate: Temporal.Instant,
  existingEntry: CompetitionEntry | null
): CompetitionEntry {
  const { authStore, gameStore } = ctx
  const existingId = existingEntry?.id
  const totalIvs = calculateTotalIVs(pokemon.ivs)

  const subComps = eventCfg ? resolveEventSubCompetitions(eventCfg, synchronizedDate) : []
  const subComp = subComps.find(s => s.id === categoryId) || {
    id: categoryId,
    name: 'Competición',
    metric: 'total_ivs' as const
  }
  const evalRes = evaluatePokemonForSubCompetition(pokemon, subComp)

  return {
    ...(existingId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existingId) ? { id: existingId } : {}),
    event_id: eventId,
    category_id: categoryId,
    player_id: authStore.user!.id,
    player_name: authStore.user!.user_metadata?.username || authStore.user!.user_metadata?.full_name || authStore.user!.email?.split('@')[0] || 'Entrenador',
    player_email: authStore.user!.email || '',
    pokemon_uid: pokemonUid,
    data: {
      species: pokemon.id,
      name: pokemon.name,
      nickname: pokemon.nickname,
      level: pokemon.level,
      score: evalRes.score,
      total_ivs: totalIvs,
      ivs: evalRes.ivs || pokemon.ivs,
      is_shiny: pokemon.isShiny,
      obtained_at: pokemon.obtainedAt,
      height: typeof pokemon.height === 'number' ? pokemon.height : Number(getPokemonPhysicalHeight(pokemon).toFixed(1)),
      weight: typeof pokemon.weight === 'number' ? pokemon.weight : Number(getPokemonPhysicalWeight(pokemon).toFixed(1)),
      displayValue: evalRes.displayValue,
      player_class: gameStore.state.playerClass || 'entrenador',
      trainer_level: gameStore.state.trainerLevel || 1,
      avatar_style: gameStore.state.avatar_style || '',
      nick_style: gameStore.state.nick_style || '',
      gender: gameStore.state.gender || 'h'
    },
    submitted_at: Temporal.Now.instant().toString()
  }
}

async function applyEnrollmentSuccess(
  ctx: EventEnrollmentContext,
  eventId: string,
  categoryId: string,
  pokemonUid: string,
  pokemon: Pokemon,
  entryData: CompetitionEntry,
  existingEntry: CompetitionEntry | null,
  dbAssignedId?: string // uuid-ok: Database generated record UUID
): Promise<void> {
  const { gameStore, uiStore, userEntries, authStore } = ctx
  const assignedId = dbAssignedId || existingEntry?.id || `${eventId}:${categoryId}:${authStore.user!.id}`

  userEntries.value = {
    ...userEntries.value,
    [`${eventId}:${categoryId}`]: { ...entryData, id: assignedId },
    ...(categoryId === 'ivs' ? { [eventId]: { ...entryData, id: assignedId } } : {})
  }

  if (existingEntry?.pokemon_uid && existingEntry.pokemon_uid !== pokemonUid) {
    const isPrevEnrolledElsewhere = Object.values(userEntries.value).some(
      e => e && e.pokemon_uid === existingEntry.pokemon_uid && e.id !== assignedId
    )
    if (!isPrevEnrolledElsewhere) {
      const prevPoke = gameStore.getPokemonByUid(existingEntry.pokemon_uid)
      if (prevPoke) prevPoke.onEvent = false
    }
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
  await gameStore.scheduleSave()
  uiStore.notify('¡Inscripción al evento guardada con éxito!', '🏆')
}

export async function submitCompetitionEntry(
  ctx: EventEnrollmentContext,
  eventId: string,
  categoryIdOrUid: string,
  maybeUid?: string
) {
  const categoryId = typeof maybeUid === 'string' ? categoryIdOrUid : 'ivs'
  const pokemonUid = typeof maybeUid === 'string' ? maybeUid : categoryIdOrUid

  const validation = validateEligibility(ctx, eventId, categoryId, pokemonUid)
  if (!validation.valid) return

  const { pokemon, eventCfg, synchronizedDate } = validation
  const { gameStore, userEntries } = ctx

  try {
    const existingEntry = userEntries.value[`${eventId}:${categoryId}`] || (categoryId === 'ivs' ? userEntries.value[eventId] : null) || null
    const entryData = buildEntryPayload(ctx, eventId, categoryId, pokemonUid, pokemon, eventCfg, synchronizedDate, existingEntry)

    const res = await gameStore.db.from('competition_entries').upsert(entryData, {
      onConflict: 'event_id, category_id, player_id'
    }).select().single()
    const entry = res.data as { id?: string } | null // domain-ok: Open dynamic text or non-domain string payload
    const error = res.error as { message?: string } | null // domain-ok: Open dynamic text or non-domain string payload

    if (error) {
      const dbError = new Error(error.message || 'Error al registrar Pokémon en sub-competencia')
      if (Error.captureStackTrace) {
        Error.captureStackTrace(dbError, submitCompetitionEntry)
      }
      useErrorStore().setError(dbError, {
        type: 'Competition Entry Database Error',
        source: 'submitCompetitionEntry'
      })
      return
    }

    await applyEnrollmentSuccess(ctx, eventId, categoryId, pokemonUid, pokemon, entryData, existingEntry, entry?.id)
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

    await gameStore.scheduleSave()
    uiStore.notify('Inscripción cancelada. Pokémon liberado.', '✅')
    return true
  } catch (e) {
    logger.error('Events', `Error removing entry: ${(e as Error).message}`)
    uiStore.notify('Error al desinscribir el Pokémon.', '❌')
    return false
  }
}
