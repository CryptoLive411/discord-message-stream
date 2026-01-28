#!/usr/bin/env python3
"""
Jupiter Solana Trader Module
============================
Executes SOL <-> Token swaps via Jupiter Aggregator V6 API.

This is a standalone module that integrates with the worker 
WITHOUT modifying existing tracker functions.

Usage:
    from jupiter_trader import SolanaTrader
    
    trader = SolanaTrader(api_client, private_key)
    await trader.process_pending_trades()
"""

import asyncio
import base58
import json
import logging
from typing import Optional
from dataclasses import dataclass

import httpx
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed

logger = logging.getLogger('jupiter_trader')

# ============================================================================
# Constants
# ============================================================================

JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote"
JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap"
SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

# RPC endpoints (with fallbacks)
RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://solana-mainnet.g.alchemy.com/v2/demo",
    "https://rpc.ankr.com/solana",
]

# ============================================================================
# Trade Result
# ============================================================================

@dataclass
class TradeResult:
    """Result of a trade execution."""
    success: bool
    signature: Optional[str] = None
    error: Optional[str] = None
    expected_output: Optional[float] = None

# ============================================================================
# Solana Trader
# ============================================================================

class SolanaTrader:
    """
    Executes Solana token trades via Jupiter Aggregator.
    
    This class handles:
    - Wallet management from private key
    - Jupiter quote fetching
    - Swap transaction execution
    - Trade status updates via API client
    """
    
    def __init__(self, api_client, private_key: str, rpc_url: str = None):
        """
        Initialize the Solana trader.
        
        Args:
            api_client: APIClient instance for database updates
            private_key: Base58 or JSON array private key
            rpc_url: Optional custom RPC endpoint
        """
        self.api = api_client
        self.http = httpx.AsyncClient(timeout=30.0)
        self.rpc_url = rpc_url or RPC_ENDPOINTS[0]
        self.rpc = None
        self.keypair = self._load_keypair(private_key)
        self.running = True
        
        logger.info(f"🔑 Solana wallet loaded: {self.public_key}")
    
    def _load_keypair(self, private_key: str) -> Keypair:
        """Load keypair from various private key formats."""
        try:
            # Try base58 decode first
            decoded = base58.b58decode(private_key)
            return Keypair.from_bytes(decoded)
        except Exception:
            pass
        
        try:
            # Try JSON array format
            arr = json.loads(private_key)
            return Keypair.from_bytes(bytes(arr))
        except Exception:
            pass
        
        raise ValueError("Invalid private key format. Expected base58 or JSON array.")
    
    @property
    def public_key(self) -> str:
        """Get wallet public key as string."""
        return str(self.keypair.pubkey())
    
    async def connect_rpc(self):
        """Connect to Solana RPC with fallback endpoints."""
        for endpoint in RPC_ENDPOINTS:
            try:
                self.rpc = AsyncClient(endpoint)
                # Test connection
                await self.rpc.get_latest_blockhash()
                self.rpc_url = endpoint
                logger.info(f"✅ Connected to Solana RPC: {endpoint}")
                return
            except Exception as e:
                logger.warning(f"RPC {endpoint} failed: {e}")
                continue
        
        raise ConnectionError("Failed to connect to any Solana RPC endpoint")
    
    async def get_balance(self) -> float:
        """Get wallet SOL balance."""
        if not self.rpc:
            await self.connect_rpc()
        
        resp = await self.rpc.get_balance(self.keypair.pubkey())
        return resp.value / 1_000_000_000
    
    async def get_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 100
    ) -> Optional[dict]:
        """
        Get a swap quote from Jupiter.
        
        Args:
            input_mint: Input token mint address
            output_mint: Output token mint address
            amount: Amount in smallest unit (lamports/token base units)
            slippage_bps: Slippage tolerance in basis points (100 = 1%)
        
        Returns:
            Quote dict or None if failed
        """
        try:
            params = {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": str(amount),
                "slippageBps": str(slippage_bps),
            }
            
            response = await self.http.get(JUPITER_QUOTE_API, params=params)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"Jupiter quote failed: {e}")
            return None
    
    async def execute_swap(self, quote: dict) -> TradeResult:
        """
        Execute a swap transaction.
        
        Args:
            quote: Quote dict from get_quote()
        
        Returns:
            TradeResult with signature or error
        """
        try:
            if not self.rpc:
                await self.connect_rpc()
            
            # Get swap transaction from Jupiter
            swap_payload = {
                "quoteResponse": quote,
                "userPublicKey": self.public_key,
                "wrapAndUnwrapSol": True,
                "dynamicComputeUnitLimit": True,
                "prioritizationFeeLamports": "auto",
            }
            
            response = await self.http.post(
                JUPITER_SWAP_API,
                json=swap_payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            swap_result = response.json()
            
            swap_tx = swap_result.get("swapTransaction")
            if not swap_tx:
                return TradeResult(success=False, error="No swap transaction returned")
            
            # Deserialize and sign transaction
            tx_bytes = base58.b58decode(swap_tx)
            tx = VersionedTransaction.from_bytes(tx_bytes)
            
            # Sign with our keypair
            tx.sign([self.keypair])
            
            # Send transaction
            result = await self.rpc.send_raw_transaction(
                bytes(tx),
                opts={"skip_preflight": True, "max_retries": 3}
            )
            
            signature = str(result.value)
            logger.info(f"📤 TX sent: {signature}")
            
            # Wait for confirmation
            await self.rpc.confirm_transaction(signature, commitment=Confirmed)
            
            return TradeResult(
                success=True,
                signature=signature,
                expected_output=int(quote.get("outAmount", 0))
            )
            
        except Exception as e:
            logger.error(f"Swap execution failed: {e}")
            return TradeResult(success=False, error=str(e))
    
    async def buy_token(
        self,
        contract_address: str,
        amount_sol: float,
        slippage_bps: int = 100
    ) -> TradeResult:
        """
        Buy a token with SOL.
        
        Args:
            contract_address: Token mint address to buy
            amount_sol: Amount of SOL to spend
            slippage_bps: Slippage tolerance
        
        Returns:
            TradeResult with transaction details
        """
        lamports = int(amount_sol * 1_000_000_000)
        
        logger.info(f"🛒 Buying token {contract_address[:8]}... with {amount_sol} SOL")
        
        quote = await self.get_quote(SOL_MINT, contract_address, lamports, slippage_bps)
        if not quote:
            return TradeResult(success=False, error="Failed to get Jupiter quote")
        
        expected_tokens = int(quote.get("outAmount", 0))
        logger.info(f"📊 Quote: {amount_sol} SOL → {expected_tokens} tokens")
        
        result = await self.execute_swap(quote)
        if result.success:
            logger.info(f"✅ BUY SUCCESS: {result.signature}")
        
        return result
    
    async def sell_token(
        self,
        contract_address: str,
        percentage: int = 100,
        slippage_bps: int = 100
    ) -> TradeResult:
        """
        Sell a token for SOL.
        
        Args:
            contract_address: Token mint address to sell
            percentage: Percentage of balance to sell (1-100)
            slippage_bps: Slippage tolerance
        
        Returns:
            TradeResult with transaction details
        """
        if not self.rpc:
            await self.connect_rpc()
        
        from solders.pubkey import Pubkey
        from spl.token.constants import TOKEN_PROGRAM_ID
        
        # Get token balance
        token_accounts = await self.rpc.get_token_accounts_by_owner(
            self.keypair.pubkey(),
            {"mint": Pubkey.from_string(contract_address)}
        )
        
        if not token_accounts.value:
            return TradeResult(success=False, error="No token balance found")
        
        account_data = token_accounts.value[0].account.data
        # Parse token amount from account data
        token_amount = int.from_bytes(account_data[64:72], 'little')
        
        sell_amount = (token_amount * percentage) // 100
        if sell_amount <= 0:
            return TradeResult(success=False, error="No tokens to sell")
        
        logger.info(f"💰 Selling {percentage}% ({sell_amount}) of {contract_address[:8]}...")
        
        quote = await self.get_quote(contract_address, SOL_MINT, sell_amount, slippage_bps)
        if not quote:
            return TradeResult(success=False, error="Failed to get Jupiter quote for sell")
        
        expected_sol = int(quote.get("outAmount", 0)) / 1_000_000_000
        logger.info(f"📊 Quote: {sell_amount} tokens → {expected_sol:.4f} SOL")
        
        result = await self.execute_swap(quote)
        if result.success:
            logger.info(f"✅ SELL SUCCESS: {result.signature}")
        
        return result
    
    async def process_pending_trades(self):
        """
        Main loop to process pending trades and sells from database.
        
        Polls for trades with status 'pending_sigma' and executes buys.
        Also processes pending sell requests.
        """
        logger.info("🚀 Starting Solana trade processor...")
        await self.api.log('info', '🚀 Solana trader started', details=f'Wallet: {self.public_key}')
        
        while self.running:
            try:
                # Process pending BUY trades
                trades = await self.api.get_pending_sigma_trades()
                
                for trade in trades:
                    trade_id = trade.get('id')
                    contract_address = trade.get('contract_address')
                    amount_sol = trade.get('allocation_sol', 0.1)
                    
                    logger.info(f"📝 Processing BUY {trade_id}: {contract_address[:8]}... for {amount_sol} SOL")
                    
                    try:
                        result = await self.buy_token(contract_address, amount_sol)
                        
                        if result.success:
                            await self.api.update_trade_bought(
                                trade_id,
                                signature=result.signature,
                                expected_tokens=result.expected_output
                            )
                            await self.api.log(
                                'success',
                                f'✅ BUY EXECUTED: {amount_sol} SOL',
                                details=f'TX: {result.signature}'
                            )
                        else:
                            await self.api.update_trade_failed(trade_id, result.error)
                            await self.api.log(
                                'error',
                                f'❌ BUY FAILED: {result.error}',
                                details=f'Trade ID: {trade_id}'
                            )
                            
                    except Exception as e:
                        logger.error(f"Trade execution error: {e}")
                        await self.api.update_trade_failed(trade_id, str(e))
                
                # Process pending SELL requests
                sells = await self.api.get_pending_sells()
                
                for sell in sells:
                    sell_id = sell.get('id')
                    trade_info = sell.get('trades', {})
                    contract_address = trade_info.get('contract_address')
                    percentage = sell.get('percentage', 100)
                    slippage = sell.get('slippage_bps', 100)
                    
                    if not contract_address:
                        logger.warning(f"Sell {sell_id} missing contract address")
                        await self.api.update_sell_failed(sell_id, "Missing contract address")
                        continue
                    
                    logger.info(f"💰 Processing SELL {sell_id}: {percentage}% of {contract_address[:8]}...")
                    
                    try:
                        result = await self.sell_token(contract_address, percentage, slippage)
                        
                        if result.success:
                            # Calculate realized SOL from expected output
                            realized_sol = (result.expected_output or 0) / 1_000_000_000
                            
                            await self.api.update_sell_executed(
                                sell_id,
                                tx_hash=result.signature,
                                realized_sol=realized_sol
                            )
                            await self.api.log(
                                'success',
                                f'💰 SELL EXECUTED: {percentage}% → {realized_sol:.4f} SOL',
                                details=f'TX: {result.signature}'
                            )
                        else:
                            await self.api.update_sell_failed(sell_id, result.error)
                            await self.api.log(
                                'error',
                                f'❌ SELL FAILED: {result.error}',
                                details=f'Sell ID: {sell_id}'
                            )
                            
                    except Exception as e:
                        logger.error(f"Sell execution error: {e}")
                        await self.api.update_sell_failed(sell_id, str(e))
                
                # Wait before next poll
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Trade processor error: {e}")
                await asyncio.sleep(10)
    
    async def stop(self):
        """Stop the trader gracefully."""
        self.running = False
        await self.http.aclose()
        if self.rpc:
            await self.rpc.close()
        logger.info("Solana trader stopped")
