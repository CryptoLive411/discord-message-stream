import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

// Extract contract address from message text
function extractContractAddress(messageText: string): string | null {
  // Solana address pattern - alphanumeric, typically 32-44 chars
  // Base58 chars are: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  // But pump.fun addresses often end in "pump" which includes 'l' and 'o'
  // Using broader pattern to catch all Solana-style addresses
  const solanaPattern = /[1-9A-Za-z]{32,44}/g;
  // ETH address pattern
  const ethPattern = /0x[a-fA-F0-9]{40}/g;
  
  const solanaMatches = messageText.match(solanaPattern);
  const ethMatches = messageText.match(ethPattern);
  
  // Prefer Solana addresses (this is a Solana-focused bot)
  if (solanaMatches && solanaMatches.length > 0) {
    // Filter out common false positives
    const validCAs = solanaMatches.filter(ca => {
      // Skip if it looks like a word or common false positive
      if (ca.length < 32 || ca.length > 44) return false;
      // Must contain both letters and numbers (addresses always do)
      if (!/[0-9]/.test(ca) || !/[a-zA-Z]/.test(ca)) return false;
      return true;
    });
    if (validCAs.length > 0) return validCAs[0];
  }
  
  if (ethMatches && ethMatches.length > 0) {
    return ethMatches[0];
  }
  
  return null;
}

// Extract token symbol from message
function extractTokenSymbol(messageText: string): string | null {
  // Look for $SYMBOL pattern
  const dollarPattern = /\$([A-Z]{2,10})/gi;
  const match = messageText.match(dollarPattern);
  if (match) {
    return match[0].replace('$', '').toUpperCase();
  }
  
  // Look for SYMBOL/SOL or SYMBOL/ETH pattern
  const pairPattern = /([A-Z]{2,10})\/(?:SOL|ETH)/gi;
  const pairMatch = messageText.match(pairPattern);
  if (pairMatch) {
    return pairMatch[0].split('/')[0].toUpperCase();
  }
  
  return null;
}

// Note: Sigma Bot DM is now handled by the Python worker via Telethon (user session)
// This function just creates the trade record - worker will execute via DM

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify worker API key
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
      case "execute_trade": {
        // Execute a trade based on a Discord signal
        const { 
          message_text, 
          channel_name, 
          channel_id, 
          fingerprint, 
          author_name 
        } = data;

        // Check if trading is enabled for this channel
        const { data: config } = await supabase
          .from("trading_config")
          .select("*")
          .eq("channel_pattern", channel_name)
          .eq("enabled", true)
          .maybeSingle();

        if (!config) {
          console.log(`Trading not enabled for channel: ${channel_name}`);
          return new Response(
            JSON.stringify({ success: false, reason: "trading_not_enabled" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Extract contract address from message
        const contractAddress = extractContractAddress(message_text);
        if (!contractAddress) {
          console.log("No contract address found in message");
          return new Response(
            JSON.stringify({ success: false, reason: "no_ca_found" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check for duplicate trade (same CA in last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existingTrade } = await supabase
          .from("trades")
          .select("id")
          .eq("contract_address", contractAddress)
          .gte("created_at", fiveMinutesAgo)
          .maybeSingle();

        if (existingTrade) {
          console.log(`Duplicate trade for CA: ${contractAddress}`);
          return new Response(
            JSON.stringify({ success: false, reason: "duplicate_trade", trade_id: existingTrade.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokenSymbol = extractTokenSymbol(message_text);

        // Create trade record
        const { data: trade, error: insertError } = await supabase
          .from("trades")
          .insert({
            contract_address: contractAddress,
            token_symbol: tokenSymbol,
            chain: contractAddress.startsWith("0x") ? "ethereum" : "solana",
            channel_id,
            channel_name,
            message_fingerprint: fingerprint,
            author_name,
            allocation_sol: config.allocation_sol,
            stop_loss_pct: config.stop_loss_pct,
            take_profit_1_pct: config.take_profit_1_pct,
            take_profit_2_pct: config.take_profit_2_pct,
            status: "pending_sigma", // Worker will DM Sigma Bot
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Log that trade is queued for worker to execute
        await supabase.from("relay_logs").insert({
          level: "info",
          message: `🔄 TRADE QUEUED: ${tokenSymbol || "Token"} from #${channel_name}`,
          channel_name,
          signal_type: "trade_queued",
          author_name,
          original_text: message_text.substring(0, 500),
          formatted_text: `/buy ${contractAddress} ${config.allocation_sol}`,
          details: `Allocation: ${config.allocation_sol} SOL | Pending worker DM to Sigma Bot`,
          metadata: {
            trade_id: trade.id,
            contract_address: contractAddress,
            token_symbol: tokenSymbol,
            allocation_sol: config.allocation_sol,
          },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            trade_id: trade.id,
            contract_address: contractAddress,
            allocation_sol: config.allocation_sol,
            status: "pending_sigma",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_open_trades": {
        // Get all open trades for monitoring
        const { data: trades } = await supabase
          .from("trades")
          .select("*")
          .in("status", ["bought", "partial_tp1"])
          .order("created_at", { ascending: false });

        return new Response(
          JSON.stringify({ trades: trades || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_trade_price": {
        // Update current price and check SL/TP
        const { trade_id, current_price } = data;

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

        const pnlPct = ((current_price - trade.entry_price) / trade.entry_price) * 100;

        await supabase
          .from("trades")
          .update({ current_price })
          .eq("id", trade_id);

        // Check SL/TP triggers
        let action_needed = null;
        if (pnlPct <= trade.stop_loss_pct) {
          action_needed = "stop_loss";
        } else if (trade.status === "bought" && pnlPct >= trade.take_profit_1_pct) {
          action_needed = "take_profit_1";
        } else if (trade.status === "partial_tp1" && pnlPct >= trade.take_profit_2_pct) {
          action_needed = "take_profit_2";
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            pnl_pct: pnlPct,
            action_needed,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_trading_config": {
        const { data: configs } = await supabase
          .from("trading_config")
          .select("*")
          .order("channel_pattern");

        return new Response(
          JSON.stringify({ configs: configs || [] }),
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
    console.error("Trade executor error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
