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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "get_channels": {
        // Get all enabled channels for the worker to monitor
        const { data: channels, error } = await supabase
          .from("discord_channels")
          .select("*")
          .eq("enabled", true)
          .order("name");

        if (error) throw error;

        return new Response(
          JSON.stringify({ channels }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_pending_messages": {
        // Get messages pending to be sent to Telegram
        const { data: messages, error } = await supabase
          .from("message_queue")
          .select(`
            *,
            discord_channels (
              name,
              server_name,
              telegram_topic_id,
              telegram_topic_name,
              mirror_attachments
            )
          `)
          .eq("status", "pending")
          .lt("retry_count", 3)
          .order("created_at")
          .limit(10);

        if (error) throw error;

        return new Response(
          JSON.stringify({ messages }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_telegram_config": {
        // Get Telegram destination configuration
        const { data: config, error } = await supabase
          .from("telegram_config")
          .select("*")
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        return new Response(
          JSON.stringify({ config }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_stats": {
        // Get system stats
        const { data: stats, error } = await supabase
          .from("system_stats")
          .select("*");

        if (error) throw error;

        const statsMap = stats?.reduce((acc, s) => {
          acc[s.stat_name] = s.stat_value;
          return acc;
        }, {} as Record<string, number>) || {};

        return new Response(
          JSON.stringify({ stats: statsMap }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_connection_status": {
        const { data: status, error } = await supabase
          .from("connection_status")
          .select("*");

        if (error) throw error;

        return new Response(
          JSON.stringify({ status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_banned_authors": {
        // Get global blacklist of authors to ban
        const { data: authors, error } = await supabase
          .from("banned_authors")
          .select("username")
          .order("username");

        if (error) throw error;

        // Return just the usernames as an array
        const usernames = authors?.map(a => a.username) || [];

        return new Response(
          JSON.stringify({ authors: usernames }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_pending_commands": {
        // Get pending commands for the worker to execute
        const { data: commands, error } = await supabase
          .from("worker_commands")
          .select("*")
          .eq("status", "pending")
          .order("created_at");

        if (error) throw error;

        return new Response(
          JSON.stringify({ commands }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "ack_command": {
        // Acknowledge command execution
        const body = await req.json();
        const { commandId, result, success } = body;

        const { error } = await supabase
          .from("worker_commands")
          .update({
            status: success ? "executed" : "failed",
            executed_at: new Date().toISOString(),
            result: result || null,
          })
          .eq("id", commandId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "heartbeat": {
        // Worker sends heartbeat to indicate it's alive
        const { error } = await supabase
          .from("connection_status")
          .update({
            status: "connected",
            last_ping_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("service", "worker");

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_trading_config": {
        // Get trading configuration including sigma bot ID for worker
        const { data: configs, error: configError } = await supabase
          .from("trading_config")
          .select("*")
          .eq("enabled", true)
          .order("channel_pattern");

        if (configError) throw configError;

        // Get sigma bot ID from relay_settings
        const { data: sigmaSetting } = await supabase
          .from("relay_settings")
          .select("setting_value")
          .eq("setting_key", "sigma_bot_id")
          .maybeSingle();

        return new Response(
          JSON.stringify({ 
            configs: configs || [],
            sigma_bot_id: sigmaSetting?.setting_value || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_pending_trades": {
        // Get trades pending Sigma Bot DM execution
        const { data: trades, error } = await supabase
          .from("trades")
          .select("*")
          .eq("status", "pending_sigma")
          .order("created_at")
          .limit(10);

        if (error) throw error;

        return new Response(
          JSON.stringify({ trades: trades || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_pending_sigma_trades": {
        // Get trades pending direct Solana execution (for Python trader)
        const { data: trades, error } = await supabase
          .from("trades")
          .select("*")
          .eq("status", "pending_sigma")
          .lt("retry_count", 3)
          .order("created_at")
          .limit(5);

        if (error) throw error;

        return new Response(
          JSON.stringify({ trades: trades || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_trade_bought": {
        // Mark trade as bought with TX signature
        const body = await req.json();
        const { trade_id, signature, expected_tokens } = body;

        // Calculate rough entry price
        const { data: trade } = await supabase
          .from("trades")
          .select("allocation_sol")
          .eq("id", trade_id)
          .single();

        const entryPrice = trade?.allocation_sol && expected_tokens 
          ? trade.allocation_sol / (expected_tokens / 1_000_000) 
          : null;

        const { error } = await supabase
          .from("trades")
          .update({
            status: "bought",
            buy_tx_hash: signature,
            entry_price: entryPrice,
            sigma_buy_sent_at: new Date().toISOString(),
          })
          .eq("id", trade_id);

        if (error) throw error;

        // Log success
        await supabase.from("relay_logs").insert({
          level: "success",
          message: `✅ BUY EXECUTED via Jupiter`,
          signal_type: "trade_executed",
          details: `TX: ${signature}`,
          metadata: { trade_id, signature, expected_tokens },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_trade_failed": {
        // Mark trade as failed with retry logic
        const body = await req.json();
        const { trade_id, error_message } = body;

        const { data: trade } = await supabase
          .from("trades")
          .select("retry_count")
          .eq("id", trade_id)
          .single();

        const newRetryCount = (trade?.retry_count || 0) + 1;
        const newStatus = newRetryCount >= 3 ? "failed" : "pending_sigma";

        const { error } = await supabase
          .from("trades")
          .update({
            status: newStatus,
            error_message,
            retry_count: newRetryCount,
          })
          .eq("id", trade_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, retry_count: newRetryCount }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "mark_trade_sent": {
        // Mark a trade as sent to Sigma Bot
        const body = await req.json();
        const { trade_id } = body;

        const { error } = await supabase
          .from("trades")
          .update({
            status: "bought",
            sigma_buy_sent_at: new Date().toISOString(),
          })
          .eq("id", trade_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "mark_trade_failed": {
        // Mark a trade as failed
        const body = await req.json();
        const { trade_id, error_message } = body;

        const { data: trade } = await supabase
          .from("trades")
          .select("retry_count")
          .eq("id", trade_id)
          .single();

        const newRetryCount = (trade?.retry_count || 0) + 1;
        const newStatus = newRetryCount >= 3 ? "failed" : "pending_sigma";

        const { error } = await supabase
          .from("trades")
          .update({
            status: newStatus,
            error_message,
            retry_count: newRetryCount,
          })
          .eq("id", trade_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action. Use: get_channels, get_pending_messages, get_telegram_config, get_stats, get_connection_status, get_banned_authors, get_trading_config, get_pending_trades, get_pending_sigma_trades, update_trade_bought, update_trade_failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Worker pull error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
