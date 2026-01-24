import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify worker API key
    const workerKey = req.headers.get("x-worker-key");
    const expectedKey = Deno.env.get("WORKER_API_KEY");
    
    if (!workerKey || workerKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, data } = body;

    switch (action) {
      case "push_message": {
        // Push a new message from Discord to the queue
        const { channel_id, fingerprint, discord_message_id, message_text, author_name, attachment_urls } = data;

        // Check for duplicate
        const { data: existing } = await supabase
          .from("message_queue")
          .select("id")
          .eq("fingerprint", fingerprint)
          .single();

        if (existing) {
          return new Response(
            JSON.stringify({ success: true, duplicate: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Insert new message
        const { error: insertError } = await supabase
          .from("message_queue")
          .insert({
            channel_id,
            fingerprint,
            discord_message_id,
            message_text,
            author_name,
            attachment_urls: attachment_urls || [],
            status: "pending",
          });

        if (insertError) throw insertError;

        // Update channel's last message info
        await supabase
          .from("discord_channels")
          .update({
            last_message_fingerprint: fingerprint,
            last_message_at: new Date().toISOString(),
            message_count: supabase.rpc("increment_message_count", { row_id: channel_id }),
          })
          .eq("id", channel_id);

        // Log the event
        const { data: channel } = await supabase
          .from("discord_channels")
          .select("name")
          .eq("id", channel_id)
          .single();

        await supabase.from("relay_logs").insert({
          level: "info",
          message: `New message queued from #${channel?.name || "unknown"}`,
          channel_name: channel?.name,
          details: `Author: ${author_name}`,
        });

        return new Response(
          JSON.stringify({ success: true, duplicate: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_connection_status": {
        const { service, status, error_message } = data;

        const { error } = await supabase
          .from("connection_status")
          .upsert({
            service,
            status,
            error_message,
            last_ping_at: new Date().toISOString(),
          }, { onConflict: "service" });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "log": {
        const { level, message, channel_name, details } = data;

        await supabase.from("relay_logs").insert({
          level,
          message,
          channel_name,
          details,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "mark_sent": {
        // Mark a message as sent to Telegram
        const { message_id } = data;

        await supabase
          .from("message_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", message_id);

        // Update stats
        await supabase.rpc("increment_stat", { stat_key: "messages_forwarded" });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "mark_failed": {
        const { message_id, error_message } = data;

        const { data: msg } = await supabase
          .from("message_queue")
          .select("retry_count")
          .eq("id", message_id)
          .single();

        await supabase
          .from("message_queue")
          .update({
            status: (msg?.retry_count || 0) >= 3 ? "failed" : "pending",
            error_message,
            retry_count: (msg?.retry_count || 0) + 1,
          })
          .eq("id", message_id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Worker push error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
