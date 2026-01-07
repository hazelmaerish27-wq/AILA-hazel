import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationRequest {
  action: "list" | "save" | "load" | "delete" | "rename" | "search";
  conversationId?: string;
  title?: string;
  messages?: Array<{ role: string; content: string }>;
  searchQuery?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body: ConversationRequest = await req.json();
    const userId = user.id;

    // List conversations
    if (body.action === "list") {
      const { data, error } = await supabase
        .from("conversation_history")
        .select("id, title, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return new Response(JSON.stringify({ conversations: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save conversation
    if (body.action === "save") {
      if (!body.title || !body.messages) {
        throw new Error("Title and messages are required");
      }

      // Auto-generate title from first user message if empty
      let finalTitle = body.title.trim();
      if (!finalTitle) {
        const firstUserMsg = body.messages.find((m) => m.role === "user");
        if (firstUserMsg) {
          finalTitle = firstUserMsg.content.substring(0, 50);
        } else {
          finalTitle = "Untitled Conversation";
        }
      }

      if (body.conversationId) {
        // Update existing
        const { error } = await supabase
          .from("conversation_history")
          .update({
            title: finalTitle,
            messages: body.messages,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.conversationId)
          .eq("user_id", userId);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, id: body.conversationId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Create new
        const { data, error } = await supabase
          .from("conversation_history")
          .insert({
            user_id: userId,
            title: finalTitle,
            messages: body.messages,
          })
          .select("id")
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, id: data.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Load conversation
    if (body.action === "load") {
      if (!body.conversationId) {
        throw new Error("Conversation ID is required");
      }

      const { data, error } = await supabase
        .from("conversation_history")
        .select("*")
        .eq("id", body.conversationId)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Conversation not found");

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete conversation
    if (body.action === "delete") {
      if (!body.conversationId) {
        throw new Error("Conversation ID is required");
      }

      const { error } = await supabase
        .from("conversation_history")
        .delete()
        .eq("id", body.conversationId)
        .eq("user_id", userId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rename conversation
    if (body.action === "rename") {
      if (!body.conversationId || !body.title) {
        throw new Error("Conversation ID and title are required");
      }

      const { error } = await supabase
        .from("conversation_history")
        .update({ title: body.title.trim() })
        .eq("id", body.conversationId)
        .eq("user_id", userId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search conversations
    if (body.action === "search") {
      if (!body.searchQuery) {
        throw new Error("Search query is required");
      }

      const query = body.searchQuery.toLowerCase();
      const { data, error } = await supabase
        .from("conversation_history")
        .select("id, title, updated_at")
        .eq("user_id", userId)
        .filter("title", "ilike", `%${query}%`)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return new Response(JSON.stringify({ conversations: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
