/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLivePvPStore } from '@/stores/livePvP.ts'
import { useGameStore } from '@/stores/game.ts'
import { useAuthStore } from '@/stores/auth.ts'
import { initSQLite, resetSQLite } from '@/logic/db/sqliteEngine.ts'
import { TABLES_SCHEMA } from '@/logic/db/schema.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleInvite } from '@/types/battle/pvp'
import { makePokemon } from '@/logic/pokemon/pokemonFactory.ts'

describe('Local Instance PvP Matchmaking Full Simulation', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await resetSQLite()
    const db = await initSQLite()
    if (db) {
      TABLES_SCHEMA.forEach(schema => {
        try {
          db.run(`CREATE TABLE IF NOT EXISTS ${schema}`)
        } catch {
          // ignore duplicate tables
        }
      })
    }
  })

  afterEach(async () => {
    await resetSQLite()
  })

  const createTestPokemon = (uid: string, species: string): Pokemon => {
    const mon = makePokemon(species.toLowerCase(), 50)!
    mon.uid = uid
    return mon
  }

  it('simulates full 2-player local ranked matchmaking cycle on real SQLite without mock DB', async () => {
    const authStore = useAuthStore()
    const gameStore = useGameStore()
    const livePvPStore = useLivePvPStore()

    // 1. Setup Player 1 (Ash)
    authStore.user = { id: 'local_ash', email: 'ash@poke.local' } as unknown as typeof authStore.user
    const poke1 = createTestPokemon('ash-p1', 'Pikachu')
    Object.assign(gameStore.state, {
      trainer: 'Ash',
      eloRating: 1200,
      team: [poke1],
      box: [],
      pvpTeam: ['ash-p1'],
      pvpTeam6: ['ash-p1'],
      starterChosen: true
    })

    // Setup local DB connection
    expect(gameStore.db).toBeDefined()

    // Player 1 starts matchmaking search
    await livePvPStore.startSearch()
    expect(livePvPStore.isSearching).toBe(true)

    // Verify Player 1 was written to real SQLite ranked_queue
    const queueRes1 = await gameStore.db.from('ranked_queue').select('*').eq('user_id', 'local_ash')
    expect(queueRes1.error).toBeNull()
    expect(queueRes1.data).toHaveLength(1)
    expect((queueRes1.data as Record<string, unknown>[])[0]!.user_id).toBe('local_ash')
    expect((queueRes1.data as Record<string, unknown>[])[0]!.elo).toBe(1200)

    // 2. Setup Player 2 (Franco) entering the same local SQLite queue
    await gameStore.db.from('ranked_queue').upsert({
      user_id: 'local_franco',
      elo: 1250,
      status: 'searching',
      created_at: new Date().toISOString()
    })

    const allInQueue = await gameStore.db.from('ranked_queue').select('*')
    expect(allInQueue.data).toHaveLength(2)

    // 3. Matchmaker finds Player 1 for Player 2
    const searchRes = await gameStore.db
      .from('ranked_queue')
      .select('*')
      .neq('user_id', 'local_franco')
      .order('created_at', { ascending: true })
      .limit(1)

    expect(searchRes.error).toBeNull()
    const matchedOpponent = (searchRes.data as Record<string, unknown>[])[0]!
    expect(matchedOpponent.user_id).toBe('local_ash')

    // Create ranked_match invite in real SQLite
    const invitePayload = {
      challenger_id: 'local_franco',
      sender_id: 'local_franco',
      opponent_id: matchedOpponent.user_id as string,
      status: 'ranked_match',
      config: { format: '6v6', levelRule: 'flat50', arena: { gymId: 'celadon' }, mode: 'ranked' }
    }
    const invRes = await gameStore.db.from('battle_invites').insert(invitePayload).select().single()
    expect(invRes.error).toBeNull()
    const invite = invRes.data as BattleInvite
    expect(invite).toBeDefined()
    expect(invite.status).toBe('ranked_match')
    expect(invite.config?.mode).toBe('ranked')

    // Clean up both players from ranked_queue using .in()
    await gameStore.db.from('ranked_queue').delete().in('user_id', ['local_franco', 'local_ash'])
    const queueAfterMatch = await gameStore.db.from('ranked_queue').select('*')
    expect(queueAfterMatch.data).toHaveLength(0)

    // 4. Player 1's invite polling receives the match invite
    const pollerRes = await gameStore.db
      .from('battle_invites')
      .select('*')
      .eq('opponent_id', 'local_ash')
      .in('status', ['pending', 'ranked_match'])
      .order('created_at', { ascending: false })
      .limit(1)

    expect(pollerRes.error).toBeNull()
    expect(pollerRes.data).toHaveLength(1)
    const receivedInvite = (pollerRes.data as BattleInvite[])[0]!
    expect(receivedInvite.id).toBe(invite.id)
    expect(receivedInvite.status).toBe('ranked_match')

    // Player 1 accepts the match
    await livePvPStore.acceptInvite(receivedInvite.id, true)

    // Verify Player 1 has entered live battle
    expect(livePvPStore.battleState.active).toBe(true)
    expect(livePvPStore.battleState.isRanked).toBe(true)
    expect(livePvPStore.battleState.inviteId).toBe(receivedInvite.id)
    expect(livePvPStore.battleState.myTeam).toHaveLength(1)
  })

  it('cancels search cleanly and removes entry from real SQLite ranked_queue', async () => {
    const authStore = useAuthStore()
    const gameStore = useGameStore()
    const livePvPStore = useLivePvPStore()

    authStore.user = { id: 'local_carl', email: 'carl@poke.local' } as unknown as typeof authStore.user
    Object.assign(gameStore.state, {
      trainer: 'Carl',
      eloRating: 1000,
      team: [createTestPokemon('carl-1', 'Charmander')],
      box: [],
      pvpTeam: ['carl-1'],
      pvpTeam6: ['carl-1'],
      starterChosen: true
    })

    await livePvPStore.startSearch()
    expect(livePvPStore.isSearching).toBe(true)

    const inQueue = await gameStore.db.from('ranked_queue').select('*').eq('user_id', 'local_carl')
    expect(inQueue.data).toHaveLength(1)

    await livePvPStore.cancelSearch()
    expect(livePvPStore.isSearching).toBe(false)

    const afterCancel = await gameStore.db.from('ranked_queue').select('*').eq('user_id', 'local_carl')
    expect(afterCancel.data).toHaveLength(0)
  })
})
