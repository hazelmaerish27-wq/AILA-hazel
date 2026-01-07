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


    // Parse query params for pagination and search
    const url = new URL(req.url)
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSizeParam = parseInt(url.searchParams.get('pageSize') || '30', 10)
    const search = url.searchParams.get('search')?.toLowerCase() || ''

    // Always fetch all users for search, otherwise fetch only the requested page
    let allAuthUsers = []
    let page = 1
    let hasMore = true
    const fetchPageSize = 100
    while (hasMore) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: fetchPageSize
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
        if (data.users.length < fetchPageSize) {
          hasMore = false
        }
        page++
      } catch (err) {
        console.error('Error fetching page', page, ':', err)
        break
      }
    }

    // Transform users data for frontend
    let transformedUsers = (allAuthUsers || []).map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      role: user.role || 'user',
      avatar_url: user.user_metadata?.avatar_url,
      user_metadata: user.user_metadata || {},
    }))

    // Filter by search if provided
    if (search) {
      transformedUsers = transformedUsers.filter(user =>
        user.email?.toLowerCase().includes(search) ||
        user.name?.toLowerCase().includes(search)
      )
    }

    // Paginate results
    const total = transformedUsers.length
    const totalPages = Math.ceil(total / pageSizeParam)
    const paginatedUsers = transformedUsers.slice((pageParam - 1) * pageSizeParam, pageParam * pageSizeParam)

    return new Response(
      JSON.stringify({
        users: paginatedUsers,
        page: pageParam,
        pageSize: pageSizeParam,
        total,
        totalPages
      }),
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
