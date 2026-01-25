import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-key",
};

interface ParsedSignal {
  type: "ca" | "leverage_trade" | "alpha_call" | "skip";
  formatted: string | null;
  contractAddress?: string;
  token?: string;
  direction?: "LONG" | "SHORT";
  entry?: string;
  stopLoss?: string;
  takeProfit?: string[];
  leverage?: string;
}

const SYSTEM_PROMPT = `You are a crypto trading signal parser. Analyze Discord messages and extract ONLY actionable trading information.

EXTRACT these types of signals:
1. CONTRACT ADDRESS (CA) - Solana addresses (32-44 chars, base58) or ETH addresses (0x...)
2. LEVERAGE TRADES - Messages with entry price, stop loss, take profit, leverage amount
3. ALPHA CALLS - Short actionable calls like "aping X", "sending", "entry here" with a token mention

SKIP these types of messages:
- General chat ("wow", "crazy", "nice", reactions)
- Questions ("what do you think?", "should I buy?")
- Past tense commentary ("I bought", "made 10x")
- Just emojis or short reactions
- Messages without any token/CA/trade info

For CA signals, extract:
- The contract address
- Token name if mentioned
- Any brief context (e.g., "fresh launch", "low cap gem")

For leverage trades, extract:
- Direction (LONG/SHORT)
- Entry price
- Stop loss
- Take profit target(s)
- Leverage amount

Respond with a JSON object. If the message should be skipped, set type to "skip".`;

async function parseWithAI(messageText: string, authorName: string): Promise<ParsedSignal> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    // Fallback: check for CA pattern and pass through if found
    return fallbackParse(messageText, authorName);
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Author: ${authorName}\nMessage: ${messageText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_signal",
              description: "Parse and categorize a trading signal from Discord",
              parameters: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["ca", "leverage_trade", "alpha_call", "skip"],
                    description: "Type of signal detected"
                  },
                  contractAddress: {
                    type: "string",
                    description: "Contract address if found (Solana or ETH)"
                  },
                  token: {
                    type: "string",
                    description: "Token name/symbol if mentioned"
                  },
                  direction: {
                    type: "string",
                    enum: ["LONG", "SHORT"],
                    description: "Trade direction for leverage trades"
                  },
                  entry: {
                    type: "string",
                    description: "Entry price"
                  },
                  stopLoss: {
                    type: "string",
                    description: "Stop loss price"
                  },
                  takeProfit: {
                    type: "array",
                    items: { type: "string" },
                    description: "Take profit targets"
                  },
                  leverage: {
                    type: "string",
                    description: "Leverage amount (e.g., '10x')"
                  },
                  context: {
                    type: "string",
                    description: "Brief context about the signal"
                  },
                  skipReason: {
                    type: "string",
                    description: "Why this message should be skipped"
                  }
                },
                required: ["type"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_signal" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        console.error("AI rate limited, using fallback");
        return fallbackParse(messageText, authorName);
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return fallbackParse(messageText, authorName);
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    
    if (parsed.type === "skip") {
      return { type: "skip", formatted: null };
    }

    // Format the signal for Telegram
    const formatted = formatSignal(parsed, authorName);
    
    return {
      type: parsed.type,
      formatted,
      contractAddress: parsed.contractAddress,
      token: parsed.token,
      direction: parsed.direction,
      entry: parsed.entry,
      stopLoss: parsed.stopLoss,
      takeProfit: parsed.takeProfit,
      leverage: parsed.leverage,
    };
  } catch (error) {
    console.error("AI parsing error:", error);
    return fallbackParse(messageText, authorName);
  }
}

function fallbackParse(messageText: string, authorName: string): ParsedSignal {
  // Solana address pattern (32-44 base58 chars, often ending in 'pump')
  const solanaPattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
  // ETH address pattern
  const ethPattern = /0x[a-fA-F0-9]{40}/g;
  
  const solanaMatches = messageText.match(solanaPattern);
  const ethMatches = messageText.match(ethPattern);
  
  // Check for leverage trade patterns
  const hasEntry = /entry|buy|long|short/i.test(messageText);
  const hasSL = /sl|stop\s*loss|stoploss/i.test(messageText);
  const hasTP = /tp|take\s*profit|target/i.test(messageText);
  const hasLeverage = /\d+x|leverage/i.test(messageText);
  
  // Skip noise patterns
  const noisePatterns = [
    /^(wow|nice|crazy|damn|lol|lmao|haha|gg|gm|gn|based|lets go|fire|lit)[\s!]*$/i,
    /^[\p{Emoji}\s]+$/u,
    /^.{1,10}$/,  // Very short messages
  ];
  
  for (const pattern of noisePatterns) {
    if (pattern.test(messageText.trim())) {
      return { type: "skip", formatted: null };
    }
  }
  
  // If we found a CA
  if (solanaMatches || ethMatches) {
    const ca = solanaMatches?.[0] || ethMatches?.[0] || "";
    const formatted = formatCASignal(ca, messageText, authorName);
    return {
      type: "ca",
      formatted,
      contractAddress: ca,
    };
  }
  
  // If it looks like a leverage trade
  if (hasEntry && (hasSL || hasTP) && hasLeverage) {
    return {
      type: "leverage_trade",
      formatted: formatLeverageTrade(messageText, authorName),
    };
  }
  
  // Skip everything else
  return { type: "skip", formatted: null };
}

function formatSignal(parsed: any, authorName: string): string {
  if (parsed.type === "ca") {
    let msg = "";
    if (parsed.token) {
      msg += `🪙 ${parsed.token}\n`;
    }
    msg += `\n\`${parsed.contractAddress}\``;
    if (parsed.context) {
      msg += `\n\n💬 ${parsed.context}`;
    }
    msg += `\n\n👤 ${authorName}`;
    return msg;
  }
  
  if (parsed.type === "leverage_trade") {
    const emoji = parsed.direction === "LONG" ? "🟢" : "🔴";
    let msg = `${emoji} ${parsed.direction || "TRADE"}`;
    if (parsed.token) {
      msg += ` #${parsed.token}`;
    }
    if (parsed.leverage) {
      msg += ` (${parsed.leverage})`;
    }
    msg += "\n";
    if (parsed.entry) {
      msg += `\n📍 Entry: ${parsed.entry}`;
    }
    if (parsed.stopLoss) {
      msg += `\n🛑 SL: ${parsed.stopLoss}`;
    }
    if (parsed.takeProfit?.length) {
      parsed.takeProfit.forEach((tp: string, i: number) => {
        msg += `\n🎯 TP${i + 1}: ${tp}`;
      });
    }
    msg += `\n\n👤 ${authorName}`;
    return msg;
  }
  
  if (parsed.type === "alpha_call") {
    let msg = `🚀 ALPHA`;
    if (parsed.token) {
      msg += ` #${parsed.token}`;
    }
    if (parsed.contractAddress) {
      msg += `\n\n\`${parsed.contractAddress}\``;
    }
    if (parsed.context) {
      msg += `\n\n💬 ${parsed.context}`;
    }
    msg += `\n\n👤 ${authorName}`;
    return msg;
  }
  
  return parsed.context || "";
}

function formatCASignal(ca: string, originalMessage: string, authorName: string): string {
  // Try to extract token name from message
  const tokenMatch = originalMessage.match(/\$([A-Z]{2,10})/i) || 
                     originalMessage.match(/([A-Z]{2,10})\/SOL/i) ||
                     originalMessage.match(/([A-Z]{2,10})\/ETH/i);
  const token = tokenMatch?.[1];
  
  let msg = "";
  if (token) {
    msg += `🪙 $${token.toUpperCase()}\n`;
  }
  msg += `\n\`${ca}\``;
  msg += `\n\n👤 ${authorName}`;
  return msg;
}

function formatLeverageTrade(messageText: string, authorName: string): string {
  const isLong = /long/i.test(messageText);
  const isShort = /short/i.test(messageText);
  const emoji = isShort ? "🔴" : "🟢";
  const direction = isShort ? "SHORT" : isLong ? "LONG" : "TRADE";
  
  // Extract leverage
  const leverageMatch = messageText.match(/(\d+)x/i);
  const leverage = leverageMatch?.[0];
  
  // Extract token
  const tokenMatch = messageText.match(/\$([A-Z]{2,10})/i) ||
                     messageText.match(/([A-Z]{2,10})(?:USDT|USD|PERP)/i);
  const token = tokenMatch?.[1];
  
  let msg = `${emoji} ${direction}`;
  if (token) {
    msg += ` #${token.toUpperCase()}`;
  }
  if (leverage) {
    msg += ` (${leverage})`;
  }
  
  // Include original message for context since we can't reliably parse all formats
  msg += `\n\n${messageText}`;
  msg += `\n\n👤 ${authorName}`;
  
  return msg;
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

    const { message_text, author_name } = await req.json();
    
    if (!message_text) {
      return new Response(
        JSON.stringify({ error: "message_text required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await parseWithAI(message_text, author_name || "Unknown");

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse signal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
