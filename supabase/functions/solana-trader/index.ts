import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Keypair, Connection, VersionedTransaction, PublicKey } from "https://esm.sh/@solana/web3.js@1.95.8";
import bs58 from "https://esm.sh/bs58@6.0.0";
import { decodeBase64 } from "https://deno.land/std@0.220.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Convert SOL amount to lamports
function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

// Get wallet from private key
function getWallet(): Keypair {
  const privateKey = Deno.env.get("SOLANA_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("SOLANA_PRIVATE_KEY not configured");
  }
  
  try {
    // Try base58 decode first
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
  } catch {
    // Try JSON array format
    try {
      const arr = JSON.parse(privateKey);
      return Keypair.fromSecretKey(new Uint8Array(arr));
    } catch {
      throw new Error("Invalid private key format");
    }
  }
}

// Get Jupiter quote
async function getQuote(inputMint: string, outputMint: string, amount: number, slippageBps = 100) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
  });
  
  const response = await fetch(`${JUPITER_QUOTE_API}?${params}`);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jupiter quote failed: ${error}`);
  }
  
  return response.json();
}

// Execute Jupiter swap
async function executeSwap(quote: any, userPublicKey: string) {
  const response = await fetch(JUPITER_SWAP_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jupiter swap failed: ${error}`);
  }
  
  return response.json();
}

// Get token price in SOL
async function getTokenPrice(tokenMint: string): Promise<number | null> {
  try {
    // Get quote for 1 token -> SOL
    const quote = await getQuote(tokenMint, SOL_MINT, 1_000_000, 500); // 1 token with 6 decimals
    if (quote && quote.outAmount) {
      return parseInt(quote.outAmount) / 1_000_000_000; // Convert lamports to SOL
    }
  } catch (e) {
    console.error("Failed to get token price:", e);
  }
  return null;
}

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

    const connection = new Connection(SOLANA_RPC, "confirmed");
    const wallet = getWallet();
    const publicKey = wallet.publicKey.toBase58();

    const body = await req.json();
    const { action, data } = body;

    // NOTE: Direct Jupiter execution from this hosted function is disabled.
    // The runtime environment can fail DNS resolution for quote-api.jup.ag.
    // Trading execution is handled by the self-hosted Python worker instead.
    const disabledActions = new Set(["buy", "sell", "process_pending", "get_positions"]);
    if (disabledActions.has(action)) {
      return new Response(
        JSON.stringify({
          error:
            "Trading actions are disabled here. Queue trades for the Python worker (Jupiter direct) instead.",
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    switch (action) {
      case "get_wallet": {
        // Return wallet public key and SOL balance
        const balance = await connection.getBalance(wallet.publicKey);
        return new Response(
          JSON.stringify({ 
            publicKey, 
            balanceSol: balance / 1_000_000_000,
            balanceLamports: balance,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "buy": {
        // Buy a token with SOL
        const { trade_id, contract_address, amount_sol } = data;
        
        if (!contract_address || !amount_sol) {
          throw new Error("Missing contract_address or amount_sol");
        }

        const lamports = solToLamports(amount_sol);
        
        // Get quote: SOL -> Token
        console.log(`Getting quote for ${amount_sol} SOL -> ${contract_address}`);
        const quote = await getQuote(SOL_MINT, contract_address, lamports, 100);
        
        if (!quote || !quote.outAmount) {
          throw new Error("Failed to get Jupiter quote");
        }

        const expectedTokens = parseInt(quote.outAmount);
        console.log(`Expected tokens: ${expectedTokens}`);

        // Execute swap
        const swapResult = await executeSwap(quote, publicKey);
        const { swapTransaction } = swapResult;
        
        if (!swapTransaction) {
          throw new Error("No swap transaction returned");
        }

        // Deserialize and sign
        const txBuffer = decodeBase64(swapTransaction);
        const tx = VersionedTransaction.deserialize(txBuffer);
        tx.sign([wallet]);

        // Send transaction
        const signature = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        });

        console.log(`Buy TX sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, "confirmed");
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        // Update trade record
        if (trade_id) {
          // Get entry price estimate
          const entryPrice = amount_sol / (expectedTokens / 1_000_000); // Rough price per token
          
          await supabase
            .from("trades")
            .update({
              status: "bought",
              buy_tx_hash: signature,
              entry_price: entryPrice,
              sigma_buy_sent_at: new Date().toISOString(),
            })
            .eq("id", trade_id);

          // Log success
          await supabase.from("relay_logs").insert({
            level: "success",
            message: `✅ BUY EXECUTED: ${amount_sol} SOL`,
            signal_type: "trade_executed",
            details: `TX: ${signature}`,
            metadata: { trade_id, signature, amount_sol, expected_tokens: expectedTokens },
          });
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            signature,
            expected_tokens: expectedTokens,
            explorer: `https://solscan.io/tx/${signature}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sell": {
        // Sell a token for SOL
        const { trade_id, contract_address, percentage = 100 } = data;
        
        if (!contract_address) {
          throw new Error("Missing contract_address");
        }

        // Get token balance
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          { mint: new PublicKey(contract_address) }
        );

        if (tokenAccounts.value.length === 0) {
          throw new Error("No token balance found");
        }

        const tokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
        const rawAmount = BigInt(tokenBalance.amount);
        const sellAmount = (rawAmount * BigInt(percentage)) / BigInt(100);

        if (sellAmount <= 0n) {
          throw new Error("No tokens to sell");
        }

        console.log(`Selling ${percentage}% = ${sellAmount.toString()} tokens`);

        // Get quote: Token -> SOL
        const quote = await getQuote(contract_address, SOL_MINT, Number(sellAmount), 100);
        
        if (!quote || !quote.outAmount) {
          throw new Error("Failed to get Jupiter quote for sell");
        }

        const expectedSol = parseInt(quote.outAmount) / 1_000_000_000;
        console.log(`Expected SOL: ${expectedSol}`);

        // Execute swap
        const swapResult = await executeSwap(quote, publicKey);
        const { swapTransaction } = swapResult;
        
        if (!swapTransaction) {
          throw new Error("No swap transaction returned");
        }

        // Deserialize and sign
        const txBuffer = decodeBase64(swapTransaction);
        const tx = VersionedTransaction.deserialize(txBuffer);
        tx.sign([wallet]);

        // Send transaction
        const signature = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        });

        console.log(`Sell TX sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, "confirmed");
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        // Update trade record
        if (trade_id) {
          const newStatus = percentage >= 100 ? "sold" : "partial_tp1";
          
          await supabase
            .from("trades")
            .update({
              status: newStatus,
              sell_tx_hash: signature,
              realized_pnl_sol: expectedSol,
              sigma_sell_sent_at: new Date().toISOString(),
            })
            .eq("id", trade_id);

          await supabase.from("relay_logs").insert({
            level: "success",
            message: `✅ SELL EXECUTED: ${percentage}% for ${expectedSol.toFixed(4)} SOL`,
            signal_type: "trade_executed",
            details: `TX: ${signature}`,
            metadata: { trade_id, signature, percentage, received_sol: expectedSol },
          });
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            signature,
            received_sol: expectedSol,
            explorer: `https://solscan.io/tx/${signature}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "process_pending": {
        // Process all pending trades
        const { data: pendingTrades } = await supabase
          .from("trades")
          .select("*")
          .eq("status", "pending_sigma")
          .order("created_at", { ascending: true })
          .limit(5);

        if (!pendingTrades || pendingTrades.length === 0) {
          return new Response(
            JSON.stringify({ processed: 0, message: "No pending trades" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const results = [];
        for (const trade of pendingTrades) {
          try {
            // Recursively call ourselves with buy action
            const buyResult = await fetch(req.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-worker-key": workerKey!,
              },
              body: JSON.stringify({
                action: "buy",
                data: {
                  trade_id: trade.id,
                  contract_address: trade.contract_address,
                  amount_sol: trade.allocation_sol,
                },
              }),
            });
            
            const result = await buyResult.json();
            results.push({ trade_id: trade.id, ...result });
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : "Unknown error";
            results.push({ trade_id: trade.id, success: false, error: errorMsg });
            
            // Update trade with error
            await supabase
              .from("trades")
              .update({ 
                status: "failed", 
                error_message: errorMsg,
                retry_count: trade.retry_count + 1,
              })
              .eq("id", trade.id);
          }
        }

        return new Response(
          JSON.stringify({ processed: results.length, results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_positions": {
        // Get all open positions with current values
        const { data: openTrades } = await supabase
          .from("trades")
          .select("*")
          .in("status", ["bought", "partial_tp1"])
          .order("created_at", { ascending: false });

        if (!openTrades || openTrades.length === 0) {
          return new Response(
            JSON.stringify({ positions: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current prices for each position
        const positions = [];
        for (const trade of openTrades) {
          try {
            // Get token balance
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
              wallet.publicKey,
              { mint: new PublicKey(trade.contract_address) }
            );

            let balance = 0;
            let currentValueSol = 0;
            
            if (tokenAccounts.value.length > 0) {
              const tokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
              balance = parseFloat(tokenBalance.uiAmount || 0);
              
              // Get current price
              const price = await getTokenPrice(trade.contract_address);
              if (price) {
                currentValueSol = balance * price;
              }
            }

            const entrySol = trade.allocation_sol || 0;
            const pnlSol = currentValueSol - entrySol;
            const pnlPercent = entrySol > 0 ? ((currentValueSol - entrySol) / entrySol) * 100 : 0;

            positions.push({
              ...trade,
              token_balance: balance,
              current_value_sol: currentValueSol,
              pnl_sol: pnlSol,
              pnl_percent: pnlPercent,
            });
          } catch (e) {
            console.error(`Error getting position for ${trade.contract_address}:`, e);
            positions.push({
              ...trade,
              token_balance: 0,
              current_value_sol: 0,
              pnl_sol: 0,
              pnl_percent: 0,
              error: "Failed to fetch position data",
            });
          }
        }

        return new Response(
          JSON.stringify({ positions }),
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
    console.error("Solana trader error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
