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

      case "get_open_positions": {
        // Get all open positions for price monitoring
        const { data: positions, error } = await supabase
          .from("trades")
          .select("*")
          .in("status", ["bought", "partial_tp1"])
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ positions: positions || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_position_price": {
        // Update current price and check for auto-sell triggers
        const body = await req.json();
        const { trade_id, current_price, current_value_sol } = body;

        const { data: trade } = await supabase
          .from("trades")
          .select("*")
          .eq("id", trade_id)
          .single();

        if (!trade || !trade.entry_price) {
          return new Response(
            JSON.stringify({ success: false, error: "Trade not found or no entry price" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate PnL percentage
        const pnlPct = ((current_price - trade.entry_price) / trade.entry_price) * 100;

        await supabase
          .from("trades")
          .update({ current_price })
          .eq("id", trade_id);

        // Determine if auto-sell should trigger
        let action_needed = null;
        let sell_percentage = 0;

        // Stop-loss check
        if (pnlPct <= trade.stop_loss_pct) {
          action_needed = "stop_loss";
          sell_percentage = 100;
        }
        // TP1 check (only if still in "bought" status)
        else if (trade.status === "bought" && pnlPct >= trade.take_profit_1_pct) {
          action_needed = "take_profit_1";
          sell_percentage = 50;
        }
        // TP2 check (only if already hit TP1)
        else if (trade.status === "partial_tp1" && pnlPct >= trade.take_profit_2_pct) {
          action_needed = "take_profit_2";
          sell_percentage = 100; // Sell remaining
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            pnl_pct: pnlPct,
            action_needed,
            sell_percentage,
            current_value_sol,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "trigger_auto_sell": {
        // Create a sell request triggered by position manager
        const body = await req.json();
        const { trade_id, percentage, reason } = body;

        // Check if there's already a pending sell for this trade
        const { data: existingSell } = await supabase
          .from("sell_requests")
          .select("id")
          .eq("trade_id", trade_id)
          .eq("status", "pending")
          .maybeSingle();

        if (existingSell) {
          return new Response(
            JSON.stringify({ success: false, error: "Sell already pending" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: sellReq, error } = await supabase
          .from("sell_requests")
          .insert({
            trade_id,
            percentage,
            slippage_bps: 150, // Slightly higher for auto-sells
            status: "pending",
          })
          .select()
          .single();

        if (error) throw error;

        // Log the auto-sell trigger
        await supabase.from("relay_logs").insert({
          level: "info",
          message: `🔔 AUTO-SELL TRIGGERED: ${reason}`,
          signal_type: "auto_sell",
          details: `Selling ${percentage}% of position`,
          metadata: { trade_id, percentage, reason },
        });

        return new Response(
          JSON.stringify({ success: true, sell_id: sellReq.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_partial_tp1": {
        // Update trade status after TP1 hit (sold 50%)
        const body = await req.json();
        const { trade_id } = body;

        const { error } = await supabase
          .from("trades")
          .update({ status: "partial_tp1" })
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

      case "get_pending_sells": {
        // Get pending sell requests for worker
        const { data: sells, error } = await supabase
          .from("sell_requests")
          .select(`
            *,
            trades (
              contract_address,
              channel_name,
              allocation_sol
            )
          `)
          .eq("status", "pending")
          .order("created_at")
          .limit(10);

        if (error) throw error;

        return new Response(
          JSON.stringify({ sells: sells || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_sell_executed": {
        // Mark sell request as executed with TX
        const body = await req.json();
        const { sell_id, tx_hash, realized_sol } = body;

        const { error } = await supabase
          .from("sell_requests")
          .update({
            status: "executed",
            tx_hash,
            realized_sol,
            executed_at: new Date().toISOString(),
          })
          .eq("id", sell_id);

        if (error) throw error;

        // Update parent trade realized PnL if 100% sell
        const { data: sellReq } = await supabase
          .from("sell_requests")
          .select("trade_id, percentage")
          .eq("id", sell_id)
          .single();

        if (sellReq?.percentage === 100) {
          const { data: trade } = await supabase
            .from("trades")
            .select("allocation_sol, realized_pnl_sol")
            .eq("id", sellReq.trade_id)
            .single();

          const pnl = realized_sol - (trade?.allocation_sol || 0);
          await supabase
            .from("trades")
            .update({
              status: "sold",
              realized_pnl_sol: pnl,
              sell_tx_hash: tx_hash,
            })
            .eq("id", sellReq.trade_id);
        }

        // Log success
        await supabase.from("relay_logs").insert({
          level: "success",
          message: `💰 SELL EXECUTED via Jupiter`,
          signal_type: "trade_executed",
          details: `TX: ${tx_hash}, Received: ${realized_sol} SOL`,
          metadata: { sell_id, tx_hash, realized_sol },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_sell_failed": {
        // Mark sell request as failed
        const body = await req.json();
        const { sell_id, error_message } = body;

        const { error } = await supabase
          .from("sell_requests")
          .update({
            status: "failed",
            error_message,
          })
          .eq("id", sell_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action. Use: get_channels, get_pending_messages, get_telegram_config, get_stats, get_connection_status, get_banned_authors, get_trading_config, get_pending_trades, get_pending_sigma_trades, update_trade_bought, update_trade_failed, get_pending_sells, update_sell_executed, update_sell_failed" }),
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
