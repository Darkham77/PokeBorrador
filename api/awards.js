import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
)

export default async function handler(req, res) {
  const { method } = req

  // Basic auth check placeholder (in a real app, use Supabase Auth to verify JWT)
  const authHeader = req.headers['authorization']
  if (!authHeader) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  // Handle pending awards for the user
  if (method === 'GET') {
    const email = req.query.email // In legacy it was parsed from JWT
    if (!email) return res.status(400).json({ error: 'Email requerido' })

    const { data, error } = await supabase
      .from('awards')
      .select('*')
      .eq('winner_email', email)
      .eq('claimed', false)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ awards: data })
  }

  // Claim award
  if (method === 'POST') {
    const { award_id } = req.body
    if (!award_id) return res.status(400).json({ error: 'ID de premio requerido' })

    const { error } = await supabase
      .from('awards')
      .update({ claimed: true, claimed_at: new Date().toISOString() })
      .eq('id', award_id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
