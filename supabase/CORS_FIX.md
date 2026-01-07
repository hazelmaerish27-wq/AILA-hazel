# CORS Error Fix Guide

## Error
```
Access to fetch at 'https://woqlvcgryahmcejdlcqz.supabase.co/functions/v1/get-users' from origin 'http://127.0.0.1:5508' has been blocked by CORS policy
```

## Root Cause
The `get-users` Edge Function is either:
1. Not properly configured with CORS headers
2. Returning an error on preflight request (OPTIONS)
3. Not handling requests correctly

## Solution: Update the get-users Edge Function

Update `supabase/functions/get-users/index.ts`:

```typescript
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

    const token = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get all users from auth.users table
    const { data: users, error } = await supabaseClient.auth.admin.listUsers()
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ users: users?.users || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## Additional Notes

1. **Service Role vs Anon Key**: To use `auth.admin.listUsers()`, you need the **service role key** in the Edge Function, not the anon key.

2. **Update your script.js** to send the auth header properly:
   ```javascript
   async function fetchUsers() {
     try {
       const { data: { session } } = await _supabase.auth.getSession();
       
       const { data, error } = await _supabase.functions.invoke('get-users', {
         headers: {
           'Authorization': `Bearer ${session.access_token}`
         }
       });
       
       if (error) throw error;
       if (data.error) throw new Error(data.error);
       
       // ... rest of mapping logic
     } catch (error) {
       console.error('Error fetching users:', error);
       return [];
     }
   }
   ```

3. Test the function directly in Supabase console to ensure it returns proper responses
