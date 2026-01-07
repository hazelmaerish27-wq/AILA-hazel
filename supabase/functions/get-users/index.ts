import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    )

    // Get all users from auth.users table with proper pagination
    let allAuthUsers = []
    let page = 1
    let hasMore = true
    const pageSize = 100
    
    while (hasMore) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: pageSize
        })
        
        if (error) {
          console.error('Auth error on page', page, ':', error)
          break
        }
        
        if (!data || !data.users || data.users.length === 0) {
          hasMore = false
          break
        }
        
        allAuthUsers = allAuthUsers.concat(data.users)
        
        // If we got fewer users than the page size, we've reached the end
        if (data.users.length < pageSize) {
          hasMore = false
        }
        
        page++
      } catch (err) {
        console.error('Error fetching page', page, ':', err)
        break
      }
    }
    
    console.log(`Fetched ${allAuthUsers.length} total users from ${page} pages`)
    
    const users = { users: allAuthUsers }

    // Transform users data for frontend
    const transformedUsers = (users?.users || []).map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      role: user.role || 'user',
      avatar_url: user.user_metadata?.avatar_url,
      user_metadata: user.user_metadata || {},
    }))

    return new Response(
      JSON.stringify({ users: transformedUsers }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
