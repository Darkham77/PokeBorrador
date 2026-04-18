import { supabase } from './supabase'

/**
 * DBRouter - Unified Data Persistence Layer
 * Centralizes all DB interactions and handles Offline/Online routing.
 * Implements Session Locking logic.
 */

export class DBRouter {
  constructor(realClient) {
    this.realClient = realClient
    this.isOffline = false
    this.currentSessionId = null
    this.userSubscription = null
  }

  from(table) {
    return new ProxyQuery(this, table)
  }

  async setOfflineMode(active) {
    this.isOffline = active
    if (active) await initSQLite()
    console.log(`[DBRouter] Mode: ${active ? 'OFFLINE' : 'ONLINE'}`)
  }

  /**
   * Initializes session monitoring
   * @param {string} userId 
   * @param {string} sessionId 
   */
  async initSession(userId, sessionId) {
    this.currentSessionId = sessionId
    
    if (this.isOffline || !this.realClient) return

    // 1. Update session in DB (Last-In-Wins)
    try {
        const { error } = await this.realClient
            .from('profiles')
            .update({ current_session_id: sessionId })
            .eq('id', userId)

        if (error) console.error('[DBRouter] Failed to set session ID:', error)
    } catch (err) {
        console.error('[DBRouter] Exception setting session ID:', err)
    }

    // 2. Subscribe to changes
    if (this.userSubscription) this.userSubscription.unsubscribe()
    
    this.userSubscription = this.realClient
      .channel(`session_lock:${userId}`)
      .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, (payload) => {
                const newSessionId = payload.new.current_session_id
                if (newSessionId && newSessionId !== this.currentSessionId) {
                    this.handleSessionConflict()
                }
            })
      .subscribe()
  }

  handleSessionConflict() {
    console.warn('[DBRouter] SESSION CONFLICT DETECTED!')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-conflict'))
    }
  }

  get auth() {
    if (this.isOffline || !this.realClient) {
      return {
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      }
    }
    return this.realClient.auth
  }

  async rpc(name, params) {
    if (this.isOffline || !this.realClient) {
      await initSQLite()
      
      if (name === 'add_war_points') {
        const { p_week_id, p_map_id, p_faction, p_points } = params
        const current = await queryLocal(`SELECT points FROM war_points WHERE week_id = ? AND map_id = ? AND faction = ?`, [p_week_id, p_map_id, p_faction])
        const newPts = (current[0]?.points || 0) + p_points
        await execLocal(`INSERT OR REPLACE INTO war_points (week_id, map_id, faction, points) VALUES (?, ?, ?, ?)`, [p_week_id, p_map_id, p_faction, newPts])
        return { data: null, error: null }
      }

      if (name === 'fn_report_passive_battle') {
        const { p_opponent_id, p_result, p_report_data } = params
        const userId = this.currentSessionId ? window.state?.currentUser?.id : 'local_user'
        await execLocal(`INSERT INTO passive_battle_reports (user_id, opponent_id, result, report_data) VALUES (?, ?, ?, ?)`, 
          [userId, p_opponent_id, p_result, JSON.stringify(p_report_data)])
        return { data: { success: true }, error: null }
      }

      if (name === 'claim_award') {
        const { p_award_id } = params
        await execLocal(`UPDATE awards SET claimed = 1, claimed_at = ? WHERE id = ?`, [new Date().toISOString(), p_award_id])
        const award = await queryLocal(`SELECT prize FROM awards WHERE id = ?`, [p_award_id])
        return { data: { ok: true, prize: JSON.parse(award[0]?.prize || '{}') }, error: null }
      }

      return { data: null, error: { message: `Offline RPC ${name} not implemented` } }
    }
    return this.realClient.rpc(name, params)
  }

  channel(name) {
    if (this.isOffline || !this.realClient) {
      return { subscribe: () => ({}), on: () => ({ subscribe: () => ({}) }) }
    }
    return this.realClient.channel(name)
  }
}

class ProxyQuery {
  constructor(router, table) {
    this.router = router
    this.table = table
    this.chain = []
    this.action = 'select'
    this.actionData = null
    this.actionOptions = null
  }

  select(cols = '*') { this.chain.push({ type: 'select', args: [cols] }); return this }
  eq(c, v) { this.chain.push({ type: 'eq', args: [c, v] }); return this }
  neq(c, v) { this.chain.push({ type: 'neq', args: [c, v] }); return this }
  gt(c, v) { this.chain.push({ type: 'gt', args: [c, v] }); return this }
  gte(c, v) { this.chain.push({ type: 'gte', args: [c, v] }); return this }
  lt(c, v) { this.chain.push({ type: 'lt', args: [c, v] }); return this }
  lte(c, v) { this.chain.push({ type: 'lte', args: [c, v] }); return this }
  like(c, p) { this.chain.push({ type: 'like', args: [c, p] }); return this }
  ilike(c, p) { this.chain.push({ type: 'ilike', args: [c, p] }); return this }
  is(c, v) { this.chain.push({ type: 'is', args: [c, v] }); return this }
  in(c, a) { this.chain.push({ type: 'in', args: [c, a] }); return this }
  
  match(obj) { this.chain.push({ type: 'match', args: [obj] }); return this }
  order(c, o) { this.chain.push({ type: 'order', args: [c, o] }); return this }
  limit(n) { this.chain.push({ type: 'limit', args: [n] }); return this }
  
  update(values) { this.action = 'update'; this.actionData = values; return this }
  upsert(values, opts = {}) { this.action = 'upsert'; this.actionData = values; this.actionOptions = opts; return this }
  delete() { this.action = 'delete'; return this }

  async single() { return this.execute('single') }
  async maybeSingle() { return this.execute('maybeSingle') }
  
  async execute(final = null) {
    if (!this.router.isOffline && this.router.realClient) {
      try {
        let q = this.router.realClient.from(this.table)
        if (this.action === 'upsert') return await q.upsert(this.actionData, this.actionOptions)
        
        // Apply filters first
        for (const s of this.chain) {
          if (typeof q[s.type] === 'function') {
            q = q[s.type](...s.args)
          }
        }

        if (this.action === 'update') return await q.update(this.actionData)
        if (this.action === 'delete') return await q.delete()

        const res = final ? await q[final]() : await q
        if (res.error) throw res.error
        return res
      } catch (e) {
        console.warn(`[DBRouter] Online failed for ${this.table}, falling back...`, e)
      }
    }
    return this.executeLocal(final)
  }

  async executeLocal(final) {
    await initSQLite()
    if (this.action === 'upsert') {
      const res = await insertLocal(this.table, this.actionData)
      return { data: res, error: null }
    }
    
    // Advanced local selector with operator translation
    let sql = `SELECT * FROM ${this.table}`
    const params = []
    const where = []
    
    const OP_MAP = {
      eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=',
      like: 'LIKE', ilike: 'LIKE', is: 'IS'
    }

    for (const s of this.chain) {
      if (OP_MAP[s.type]) {
        where.push(`${s.args[0]} ${OP_MAP[s.type]} ?`)
        params.push(s.args[1])
      } else if (s.type === 'in') {
        const placeholders = s.args[1].map(() => '?').join(', ')
        where.push(`${s.args[0]} IN (${placeholders})`)
        params.push(...s.args[1])
      } else if (s.type === 'match') {
        Object.entries(s.args[0]).forEach(([col, val]) => {
          where.push(`${col} = ?`)
          params.push(val)
        })
      }
    }
    
    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`
    
    // Basic sorting
    const orderItems = this.chain.filter(s => s.type === 'order')
    if (orderItems.length > 0) {
      sql += ` ORDER BY ` + orderItems.map(o => `${o.args[0]} ${o.args[1]?.ascending === false ? 'DESC' : 'ASC'}`).join(', ')
    }

    // Basic limit
    const limitItem = this.chain.find(s => s.type === 'limit')
    if (limitItem) sql += ` LIMIT ${limitItem.args[0]}`
    
    const data = await queryLocal(sql, params)
    const result = (final === 'single' || final === 'maybeSingle') ? data[0] || null : data
    return { data: result, error: null }
  }
}
