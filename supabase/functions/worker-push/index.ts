import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AI Signal Parser integration
async function parseSignal(messageText: string, authorName: string, workerKey: string): Promise<{
  type: "ca" | "leverage_trade" | "alpha_call" | "skip";
  formatted: string | null;
}> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const response = await fetch(`${supabaseUrl}/functions/v1/parse-signal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-key": workerKey,
      },
      body: JSON.stringify({ message_text: messageText, author_name: authorName }),
    });
    
    if (!response.ok) {
      console.error("Parse signal failed:", response.status);
      return { type: "skip", formatted: null };
    }
    
    return await response.json();
  } catch (error) {
    console.error("Parse signal error:", error);
    // On error, don't block - let the message through raw
    return { type: "alpha_call", formatted: messageText };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify worker API key (supports both x-worker-key header and Authorization: Bearer)
    let workerKey = req.headers.get("x-worker-key");
    if (!workerKey) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        workerKey = authHeader.replace("Bearer ", "");
      }
    }
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

        // Check for duplicate (use limit instead of single to avoid errors on multiple matches)
        const { data: existingRows } = await supabase
          .from("message_queue")
          .select("id")
          .eq("fingerprint", fingerprint)
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          // Even if duplicate, advance cursor so the watcher can stop re-sending history.
          await supabase
            .from("discord_channels")
            .update({
              last_message_fingerprint: fingerprint,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", channel_id);

          return new Response(
            JSON.stringify({ success: true, duplicate: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Parse the signal with AI to filter noise and format nicely
        const parsed = await parseSignal(message_text, author_name, workerKey || "");
        
        // Skip noise messages
        if (parsed.type === "skip") {
          // Still update cursor so we don't re-process this message
          await supabase
            .from("discord_channels")
            .update({
              last_message_fingerprint: fingerprint,
              last_message_at: new Date().toISOString(),
            })
            .eq("id", channel_id);

          // Log that we skipped
          const { data: channel } = await supabase
            .from("discord_channels")
            .select("name")
            .eq("id", channel_id)
            .single();

          await supabase.from("relay_logs").insert({
            level: "info",
            message: `Skipped noise from #${channel?.name || "unknown"}`,
            channel_name: channel?.name,
            details: `Author: ${author_name}, Preview: ${message_text.substring(0, 50)}...`,
          });

          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: "noise" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Use formatted message if available, otherwise use original
        const finalMessageText = parsed.formatted || message_text;

        // Insert new message with parsed/formatted text
        const { error: insertError } = await supabase
          .from("message_queue")
          .insert({
            channel_id,
            fingerprint,
            discord_message_id,
            message_text: finalMessageText,
            author_name,
            attachment_urls: attachment_urls || [],
            status: "pending",
          });

        if (insertError) throw insertError;

        // Update channel's last message info
        const nowIso = new Date().toISOString();
        const { error: channelUpdateError } = await supabase
          .from("discord_channels")
          .update({
            last_message_fingerprint: fingerprint,
            last_message_at: nowIso,
          })
          .eq("id", channel_id);

        if (channelUpdateError) throw channelUpdateError;

        // Increment message count via RPC (keeps logic centralized)
        const { error: incErr } = await supabase.rpc("increment_message_count", { row_id: channel_id });
        if (incErr) throw incErr;

        // Log the event with signal type
        const { data: channel } = await supabase
          .from("discord_channels")
          .select("name")
          .eq("id", channel_id)
          .single();

        await supabase.from("relay_logs").insert({
          level: "success",
          message: `${parsed.type.toUpperCase()} signal queued from #${channel?.name || "unknown"}`,
          channel_name: channel?.name,
          details: `Author: ${author_name}, Type: ${parsed.type}`,
        });

        return new Response(
          JSON.stringify({ success: true, duplicate: false, signalType: parsed.type }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set_channel_cursor": {
        const { channel_id, last_message_fingerprint, last_message_at } = data;
        const { error } = await supabase
          .from("discord_channels")
          .update({
            last_message_fingerprint,
            last_message_at: last_message_at || new Date().toISOString(),
          })
          .eq("id", channel_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
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
        const { message_id } = data;
        const error_message = data?.error_message ?? data?.error ?? "Unknown error";

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
