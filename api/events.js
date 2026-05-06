import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('active', true)

    if (error) throw error

    // Filter by schedule (replicated from server_legacy.js)
    const activeEvents = events.filter(ev => {
      if (ev.manual) return true
      const sched = ev.schedule
      if (!sched) return false

      // GMT-3 logic using Node 26 Temporal API
      const now = Temporal.Now.zonedDateTimeISO('-03:00')
      
      // Temporal dayOfWeek: 1 is Monday, 7 is Sunday. 
      // Legacy getUTCDay(): 0 is Sunday, 1 is Monday.
      const day = now.dayOfWeek === 7 ? 0 : now.dayOfWeek
      const hour = now.hour + now.minute / 60

      if (sched.type === 'weekly') {
        if (!sched.days.includes(day)) return false
        if (sched.startHour !== undefined && hour < sched.startHour) return false
        if (sched.endHour !== undefined && hour >= sched.endHour) return false
      }
      return true
    })

    res.status(200).json({ events: activeEvents })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
