import { getSupabaseServer } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { userId, name, email } = await request.json()

    // Validate input
    if (!userId || !name) {
      return Response.json(
        { error: 'Missing required fields: userId, name' },
        { status: 400 }
      )
    }

    // This runs on the server with service role key → safe to bypass RLS
    const supabaseServer = getSupabaseServer()
    const { data, error } = await supabaseServer
      .from('profiles')
      .insert({ user_id: userId, name, email })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return Response.json(
        { error: 'Missing required query parameter: userId' },
        { status: 400 }
      )
    }

    // Fetch user profile
    const supabaseServer = getSupabaseServer()
    const { data, error } = await supabaseServer
      .from('profiles')
      .select()
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json(
          { error: 'Profile not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
