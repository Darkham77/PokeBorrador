import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { event_id, player_name, player_email, data } = req.body

  if (!event_id || !player_email || !data) {
    return res.status(400).json({ error: 'Datos incompletos' })
  }

  try {
    // Replicating "keep best ivs" logic from legacy server
    const { data: existing, error: fetchError } = await supabase
      .from('competition_entries')
      .select('*')
      .eq('event_id', event_id)
      .eq('player_email', player_email)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    const entry = {
      event_id,
      player_email,
      player_name,
      data,
      submitted_at: new Date().toISOString()
    }

    if (existing) {
      if ((data.total_ivs || 0) > (existing.data.total_ivs || 0)) {
        const { error: updateError } = await supabase
          .from('competition_entries')
          .update(entry)
          .eq('id', existing.id)
        if (updateError) throw updateError
      } else {
        return res.status(200).json({ ok: true, kept: 'previous', entry: existing })
      }
    } else {
      const { error: insertError } = await supabase
        .from('competition_entries')
        .insert(entry)
      if (insertError) throw insertError
    }

    res.status(200).json({ ok: true, entry })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}
