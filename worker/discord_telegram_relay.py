#!/usr/bin/env python3
"""
Discord to Telegram Mirror Relay Worker
========================================
Watches Discord channels via browser automation (Playwright) using MutationObserver
for real-time message detection, and relays messages to Telegram via MTProto (Telethon).

Architecture:
- Opens one browser tab per Discord channel
- Injects MutationObserver to detect new messages instantly (<100ms)
- No polling — event-driven message detection

Run with: python discord_telegram_relay.py
"""

import asyncio
import hashlib
import json
import logging
import os
import re
import signal
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import httpx
from dotenv import load_dotenv
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from telethon import TelegramClient
from telethon.tl.types import InputPeerChannel, InputPeerChat

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('relay.log')
    ]
)
logger = logging.getLogger('discord_relay')

# ============================================================================
# Configuration
# ============================================================================

@dataclass
class Config:
    """Application configuration from environment variables."""
    worker_api_key: str
    supabase_url: str
    telegram_api_id: int
    telegram_api_hash: str
    telegram_session_name: str = "discord_mirror_session"
    channel_refresh_interval: int = 60  # seconds between checking for new/removed channels
    headless: bool = True   # Run browser in headless mode
    browser_profile_path: str = "./discord_profile"
    
    @classmethod
    def from_env(cls) -> 'Config':
        """Load configuration from environment variables."""
        required = ['WORKER_API_KEY', 'SUPABASE_URL', 'TELEGRAM_API_ID', 'TELEGRAM_API_HASH']
        missing = [key for key in required if not os.getenv(key)]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        return cls(
            worker_api_key=os.getenv('WORKER_API_KEY'),
            supabase_url=os.getenv('SUPABASE_URL'),
            telegram_api_id=int(os.getenv('TELEGRAM_API_ID')),
            telegram_api_hash=os.getenv('TELEGRAM_API_HASH'),
            telegram_session_name=os.getenv('TELEGRAM_SESSION_NAME', 'discord_mirror_session'),
            channel_refresh_interval=int(os.getenv('CHANNEL_REFRESH_INTERVAL', '60')),
            headless=os.getenv('HEADLESS', 'true').lower() == 'true',
            browser_profile_path=os.getenv('BROWSER_PROFILE_PATH', './discord_profile'),
        )

# ============================================================================
# API Client
# ============================================================================

class APIClient:
    """Client for communicating with Supabase edge functions."""
    
    def __init__(self, config: Config):
        self.config = config
        self.base_url = f"{config.supabase_url}/functions/v1"
        self.headers = {
            "Authorization": f"Bearer {config.worker_api_key}",
            "Content-Type": "application/json"
        }
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_channels(self) -> list[dict]:
        """Fetch enabled Discord channels to watch."""
        try:
            response = await self.client.get(
                f"{self.base_url}/worker-pull",
                params={"action": "get_channels"},
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()
            return data.get('channels', [])
        except Exception as e:
            logger.error(f"Failed to fetch channels: {e}")
            return []
    
    async def get_pending_messages(self) -> list[dict]:
        """Fetch messages pending to be sent to Telegram."""
        try:
            response = await self.client.get(
                f"{self.base_url}/worker-pull",
                params={"action": "get_pending_messages"},
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()
            return data.get('messages', [])
        except Exception as e:
            logger.error(f"Failed to fetch pending messages: {e}")
            return []
    
    async def get_telegram_config(self) -> Optional[dict]:
        """Fetch Telegram destination configuration."""
        try:
            response = await self.client.get(
                f"{self.base_url}/worker-pull",
                params={"action": "get_telegram_config"},
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()
            return data.get('config')
        except Exception as e:
            logger.error(f"Failed to fetch Telegram config: {e}")
            return None
    
    async def push_message(self, channel_id: str, message_data: dict) -> bool:
        """Push a new message to the queue."""
        try:
            response = await self.client.post(
                f"{self.base_url}/worker-push",
                headers=self.headers,
                json={
                    "action": "push_message",
                    "data": {
                        "channel_id": channel_id,
                        **message_data
                    }
                }
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to push message: {e}")
            return False
    
    async def mark_sent(self, message_id: str) -> bool:
        """Mark a message as successfully sent."""
        try:
            response = await self.client.post(
                f"{self.base_url}/worker-push",
                headers=self.headers,
                json={
                    "action": "mark_sent",
                    "data": {"message_id": message_id}
                }
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to mark message as sent: {e}")
            return False
    
    async def mark_failed(self, message_id: str, error: str) -> bool:
        """Mark a message as failed with error message."""
        try:
            response = await self.client.post(
                f"{self.base_url}/worker-push",
                headers=self.headers,
                json={
                    "action": "mark_failed",
                    "data": {"message_id": message_id, "error_message": error}
                }
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to mark message as failed: {e}")
            return False

    async def set_channel_cursor(self, channel_id: str, fingerprint: str, last_message_at: Optional[str] = None) -> bool:
        """Update a channel's last seen message fingerprint without enqueueing messages."""
        try:
            response = await self.client.post(
                f"{self.base_url}/worker-push",
                headers=self.headers,
                json={
                    "action": "set_channel_cursor",
                    "data": {
                        "channel_id": channel_id,
                        "last_message_fingerprint": fingerprint,
                        "last_message_at": last_message_at,
                    },
                },
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to set channel cursor: {e}")
            return False
    
    async def update_connection_status(self, service: str, status: str, error: Optional[str] = None) -> bool:
        """Update connection status for a service."""
        try:
            response = await self.client.post(
                f"{self.base_url}/worker-push",
                headers=self.headers,
                json={
                    "action": "update_connection_status",
                    "data": {
                        "service": service,
                        "status": status,
                        "error_message": error
                    }
                }
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to update connection status: {e}")
            return False
    
    async def log(self, level: str, message: str, channel_name: Optional[str] = None, details: Optional[str] = None) -> bool:
        """Send a log entry to the backend."""
        try:
            response = await self.client.post(
                f"{self.base_url}/worker-push",
                headers=self.headers,
                json={
                    "action": "log",
                    "data": {
                        "level": level,
                        "message": message,
                        "channel_name": channel_name,
                        "details": details
                    }
                }
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to send log: {e}")
            return False
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

# ============================================================================
# Channel Tab Manager (MutationObserver-based real-time detection)
# ============================================================================

class ChannelTab:
    """Manages a single browser tab watching one Discord channel."""
    
    # JavaScript to inject for real-time message detection
    OBSERVER_SCRIPT = """
    (function() {
        // Avoid double-injection
        if (window.__discordObserverActive) return;
        window.__discordObserverActive = true;
        
        const seenMessages = new Set();
        let lastProcessedId = null;
        
        // Initialize with existing messages to avoid backfill
        function initializeSeenMessages() {
            const messages = document.querySelectorAll('[id^="chat-messages-"]');
            messages.forEach(msg => {
                const id = msg.id || msg.getAttribute('data-list-item-id');
                if (id) seenMessages.add(id);
            });
            if (messages.length > 0) {
                lastProcessedId = messages[messages.length - 1].id;
            }
            console.log('[Observer] Initialized with', seenMessages.size, 'existing messages');
        }
        
        // Extract message data from a DOM element
        function extractMessage(element) {
            const id = element.id || element.getAttribute('data-list-item-id');
            if (!id || seenMessages.has(id)) return null;
            
            seenMessages.add(id);
            
            // Extract author
            let author = 'Unknown';
            const authorSelectors = [
                '[class*="username-"]',
                'h3 span[class*="username"]',
                'span[class*="headerText-"] span',
                '[class*="headerText-"] [class*="username"]',
            ];
            for (const sel of authorSelectors) {
                const el = element.querySelector(sel);
                if (el && el.innerText && el.innerText.trim()) {
                    // Get text content and strip emojis/special unicode chars (badges, diamonds, etc.)
                    author = el.innerText.trim().replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{2300}-\\u{23FF}\\u{FE00}-\\u{FE0F}\\u{200D}]/gu, '').trim();
                    break;
                }
            }
            
            // Extract content
            let content = '';
            const contentSelectors = [
                '[id^="message-content-"]',
                '[class*="messageContent-"]',
                '[class*="markup-"]',
            ];
            for (const sel of contentSelectors) {
                const el = element.querySelector(sel);
                if (el && el.innerText && el.innerText.trim()) {
                    content = el.innerText.trim();
                    break;
                }
            }
            
            // Extract attachments
            const attachments = [];
            element.querySelectorAll('a[class*="imageWrapper-"], a[href*="cdn.discordapp.com"]').forEach(a => {
                if (a.href) attachments.push(a.href);
            });
            element.querySelectorAll('img[src*="cdn.discordapp.com"]').forEach(img => {
                if (img.src && !attachments.includes(img.src)) attachments.push(img.src);
            });
            
            // Skip empty messages
            if (!content && attachments.length === 0) return null;
            
            return {
                message_id: id,
                author: author,
                content: content,
                attachments: attachments,
                timestamp: new Date().toISOString()
            };
        }
        
        // Process new message nodes
        function processNewMessages(nodes) {
            nodes.forEach(node => {
                if (node.nodeType !== 1) return;
                
                // Check if this is a message element
                const isMessage = node.id?.startsWith('chat-messages-') || 
                                  node.getAttribute?.('data-list-item-id')?.startsWith('chat-messages-');
                
                if (isMessage) {
                    const msg = extractMessage(node);
                    if (msg) {
                        console.log('[Observer] New message detected:', msg.author, msg.content?.substring(0, 50));
                        window.__onNewMessage(JSON.stringify(msg));
                    }
                }
                
                // Also check children (for batch insertions)
                if (node.querySelectorAll) {
                    const childMessages = node.querySelectorAll('[id^="chat-messages-"]');
                    childMessages.forEach(child => {
                        const msg = extractMessage(child);
                        if (msg) {
                            console.log('[Observer] New message detected (child):', msg.author);
                            window.__onNewMessage(JSON.stringify(msg));
                        }
                    });
                }
            });
        }
        
        // Set up MutationObserver
        function setupObserver() {
            // Find the messages container
            const container = document.querySelector('[class*="messagesWrapper-"]') ||
                              document.querySelector('[class*="scrollerInner-"]') ||
                              document.querySelector('main');
            
            if (!container) {
                console.log('[Observer] No container found, retrying...');
                setTimeout(setupObserver, 1000);
                return;
            }
            
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        processNewMessages(mutation.addedNodes);
                    }
                }
            });
            
            observer.observe(container, {
                childList: true,
                subtree: true
            });
            
            console.log('[Observer] MutationObserver active on', container.className);
        }
        
        // Scroll to bottom to ensure we see latest messages
        function scrollToBottom() {
            const scroller = document.querySelector('[class*="messagesWrapper-"]');
            if (scroller) {
                scroller.scrollTop = scroller.scrollHeight;
            }
        }
        
        // Initialize
        setTimeout(() => {
            scrollToBottom();
            setTimeout(() => {
                initializeSeenMessages();
                setupObserver();
            }, 500);
        }, 1000);
    })();
    """
    
    def __init__(self, channel: dict, context: BrowserContext, api: APIClient, on_message_callback):
        self.channel = channel
        self.context = context
        self.api = api
        self.on_message_callback = on_message_callback
        self.page: Optional[Page] = None
        self.running = False
        self.channel_id = channel['id']
        self.channel_name = channel['name']
        self.channel_url = channel['url']
    
    def _generate_fingerprint(self, message_id: str) -> str:
        """Generate a unique fingerprint for a message."""
        content = f"{self.channel_id}:{message_id}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]
    
    async def _handle_new_message(self, message_json: str):
        """Callback when MutationObserver detects a new message."""
        try:
            msg = json.loads(message_json)
            fingerprint = self._generate_fingerprint(msg['message_id'])
            
            logger.info(f"[{self.channel_name}] New message from {msg['author']}: {msg['content'][:50] if msg['content'] else '[attachment]'}...")
            
            # Push to queue immediately
            success = await self.api.push_message(self.channel_id, {
                'fingerprint': fingerprint,
                'discord_message_id': msg['message_id'],
                'author_name': msg['author'],
                'message_text': msg['content'],
                'attachment_urls': msg['attachments']
            })
            
            if success:
                await self.api.log('success', f"Queued message from {msg['author']}", self.channel_name, f"Content: {msg['content'][:50] if msg['content'] else '[attachment]'}...")
                # Update cursor
                await self.api.set_channel_cursor(self.channel_id, fingerprint, msg.get('timestamp'))
            
            # Notify main relay
            if self.on_message_callback:
                await self.on_message_callback(self.channel_id, msg)
                
        except Exception as e:
            logger.error(f"[{self.channel_name}] Error handling message: {e}")
    
    async def start(self):
        """Open tab and start watching the channel."""
        try:
            self.page = await self.context.new_page()
            self.running = True
            
            # Expose Python callback to JavaScript
            await self.page.expose_function('__onNewMessage', self._handle_new_message)
            
            # Navigate to channel
            logger.info(f"[{self.channel_name}] Opening channel tab...")
            await self.page.goto(self.channel_url, wait_until='domcontentloaded')
            
            # Wait for messages to load
            try:
                await self.page.wait_for_selector('[class*="messagesWrapper-"]', timeout=10000)
            except:
                await asyncio.sleep(2)
            
            # Inject the observer script
            await self.page.evaluate(self.OBSERVER_SCRIPT)
            
            await self.api.log('success', f"Channel tab opened with real-time observer", self.channel_name)
            logger.info(f"[{self.channel_name}] MutationObserver active - watching for new messages")
            
            # Keep the tab alive
            while self.running:
                await asyncio.sleep(5)
                # Periodically re-inject observer in case Discord's SPA navigation broke it
                try:
                    await self.page.evaluate(self.OBSERVER_SCRIPT)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"[{self.channel_name}] Tab error: {e}")
            await self.api.log('error', f"Channel tab error: {e}", self.channel_name)
    
    async def stop(self):
        """Close the tab."""
        self.running = False
        if self.page:
            try:
                await self.page.close()
            except:
                pass
        logger.info(f"[{self.channel_name}] Tab closed")


class DiscordWatcher:
    """Watches Discord channels using parallel tabs with MutationObserver."""
    
    def __init__(self, config: Config, api: APIClient):
        self.config = config
        self.api = api
        self.context: Optional[BrowserContext] = None
        self.tabs: dict[str, ChannelTab] = {}  # channel_id -> ChannelTab
        self.running = False
        self.message_queue = asyncio.Queue()
    
    async def start(self):
        """Start the browser and login to Discord."""
        logger.info("Starting Discord watcher (MutationObserver mode)...")
        
        playwright = await async_playwright().start()
        
        # Use persistent context for session persistence
        self.context = await playwright.chromium.launch_persistent_context(
            self.config.browser_profile_path,
            headless=self.config.headless,
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        self.running = True
        
        # Check if we're logged in using an initial page
        page = self.context.pages[0] if self.context.pages else await self.context.new_page()
        await page.goto('https://discord.com/channels/@me')
        await asyncio.sleep(3)
        
        # Check for login page
        if 'login' in page.url.lower():
            logger.warning("Not logged in to Discord. Please login manually...")
            await self.api.update_connection_status('discord', 'disconnected', 'Login required')
            await self.api.log('warn', 'Discord login required - please login in the browser window')
            
            # Wait for manual login (up to 5 minutes)
            for _ in range(60):
                await asyncio.sleep(5)
                if 'login' not in page.url.lower():
                    logger.info("Discord login successful!")
                    break
            else:
                raise Exception("Discord login timeout - please run in non-headless mode to login")
        
        # Close the login check page
        await page.close()
        
        await self.api.update_connection_status('discord', 'connected')
        await self.api.log('info', 'Discord watcher connected (real-time MutationObserver mode)')
        logger.info("Discord watcher ready!")
    
    async def _on_message(self, channel_id: str, message: dict):
        """Callback when any tab detects a new message."""
        await self.message_queue.put((channel_id, message))
    
    async def _sync_tabs(self):
        """Sync tabs with enabled channels from database."""
        channels = await self.api.get_channels()
        enabled_channels = {c['id']: c for c in channels if c.get('enabled')}
        
        # Close tabs for disabled/removed channels
        to_remove = [cid for cid in self.tabs if cid not in enabled_channels]
        for cid in to_remove:
            logger.info(f"Closing tab for disabled channel: {self.tabs[cid].channel_name}")
            await self.tabs[cid].stop()
            del self.tabs[cid]
        
        # Open tabs for new channels
        for cid, channel in enabled_channels.items():
            if cid not in self.tabs:
                logger.info(f"Opening tab for new channel: {channel['name']}")
                tab = ChannelTab(channel, self.context, self.api, self._on_message)
                self.tabs[cid] = tab
                # Start tab in background
                asyncio.create_task(tab.start())
        
        return len(self.tabs)
    
    async def watch_channels(self):
        """Main loop to manage channel tabs."""
        # Initial sync
        count = await self._sync_tabs()
        await self.api.log('info', f'Started watching {count} channels with real-time detection')
        
        # Periodic sync to add/remove channels
        while self.running:
            try:
                await asyncio.sleep(self.config.channel_refresh_interval)
                count = await self._sync_tabs()
                await self.api.update_connection_status('discord', 'connected')
                logger.debug(f"Channel sync complete: {count} tabs active")
            except Exception as e:
                logger.error(f"Error in channel sync: {e}")
                await self.api.log('error', f"Channel sync error: {e}")
    
    async def stop(self):
        """Stop the watcher and close all tabs."""
        self.running = False
        
        # Stop all tabs
        for tab in self.tabs.values():
            await tab.stop()
        self.tabs.clear()
        
        # Close browser context
        if self.context:
            await self.context.close()
        
        logger.info("Discord watcher stopped")

# ============================================================================
# Telegram Sender (Telethon)
# ============================================================================

class TelegramSender:
    """Sends messages to Telegram using Telethon (MTProto)."""
    
    def __init__(self, config: Config, api: APIClient):
        self.config = config
        self.api = api
        self.client: Optional[TelegramClient] = None
        self.running = False
        self.destination = None
    
    async def start(self):
        """Start the Telegram client and authenticate."""
        logger.info("Starting Telegram sender...")
        
        self.client = TelegramClient(
            self.config.telegram_session_name,
            self.config.telegram_api_id,
            self.config.telegram_api_hash
        )
        
        await self.client.start()
        
        me = await self.client.get_me()
        logger.info(f"Logged in to Telegram as: {me.first_name} (@{me.username})")
        
        await self.api.update_connection_status('telegram', 'connected')
        await self.api.log('info', f'Telegram connected as {me.first_name}')
        
        self.running = True
        logger.info("Telegram sender ready!")
    
    async def _get_destination(self):
        """Get the Telegram destination from config."""
        config = await self.api.get_telegram_config()
        
        if not config:
            return None
        
        identifier = config.get('identifier')
        dest_type = config.get('destination_type')
        use_topics = config.get('use_topics', False)
        
        try:
            # Parse the identifier (can be username, group ID, or channel ID)
            if identifier.startswith('@'):
                entity = await self.client.get_entity(identifier)
            elif identifier.startswith('-100'):
                entity = await self.client.get_entity(int(identifier))
            else:
                entity = await self.client.get_entity(int(identifier))
            
            return {
                'entity': entity,
                'use_topics': use_topics,
                'config': config
            }
        except Exception as e:
            logger.error(f"Failed to resolve Telegram destination: {e}")
            return None
    
    async def _format_message(self, msg: dict, channel_name: str) -> str:
        """Format a message for Telegram."""
        author = (msg.get('author_name') or '').strip()
        text = (msg.get('message_text') or '').strip()

        # Simple format: "Author: message" (no channel prefix)
        if author and author.lower() != 'unknown':
            if text:
                return f"{author}: {text}"
            return f"{author}:"
        
        # Fallback for unknown author
        return text if text else ""
    
    async def send_pending_messages(self):
        """Main loop to send pending messages."""
        while self.running:
            try:
                messages = await self.api.get_pending_messages()
                
                if not messages:
                    await asyncio.sleep(0.3)  # Fast poll when no messages
                    continue
                
                # Get destination
                dest = await self._get_destination()
                if not dest:
                    logger.warning("No Telegram destination configured")
                    await asyncio.sleep(10)
                    continue
                
                # Fetch channels once per batch (avoid N calls)
                channels = await self.api.get_channels()

                for msg in messages:
                    try:
                        # Get channel info for formatting
                        channel = next((c for c in channels if c['id'] == msg.get('channel_id')), None)
                        channel_name = channel['name'] if channel else 'Unknown'

                        attachments = msg.get('attachment_urls', []) or []
                        has_text = bool((msg.get('message_text') or '').strip())
                        if not has_text and not attachments:
                            await self.api.mark_failed(msg['id'], 'Empty message (no text/attachments)')
                            await self.api.log('warning', 'Skipped empty message (no text/attachments)', channel_name)
                            continue
                        
                        # Format message
                        text = await self._format_message(msg, channel_name)
                        
                        # Determine topic ID if using topics
                        reply_to = None
                        if dest['use_topics'] and channel and channel.get('telegram_topic_id'):
                            reply_to = int(channel['telegram_topic_id'])
                        
                        # Send message
                        await self.client.send_message(
                            dest['entity'],
                            text,
                            reply_to=reply_to,
                            parse_mode=None  # Send plain text
                        )
                        
                        # Handle attachments
                        if attachments and channel and channel.get('mirror_attachments', True):
                            for url in attachments[:5]:  # Limit to 5 attachments
                                try:
                                    await self.client.send_file(
                                        dest['entity'],
                                        url,
                                        reply_to=reply_to
                                    )
                                except Exception as e:
                                    logger.warning(f"Failed to send attachment: {e}")
                        
                        # Mark as sent
                        await self.api.mark_sent(msg['id'])
                        logger.info(f"Sent message to Telegram: {msg['id'][:8]}...")
                        await self.api.log('info', f"Sent message from {msg['author_name']}", channel_name)
                        
                    except Exception as e:
                        logger.error(f"Failed to send message {msg['id']}: {e}")
                        await self.api.mark_failed(msg['id'], str(e))
                        await self.api.log('error', f"Failed to send message: {e}", channel_name if 'channel_name' in dir() else None)
                
                await self.api.update_connection_status('telegram', 'connected')
                
            except Exception as e:
                logger.error(f"Error in send loop: {e}")
                await self.api.update_connection_status('telegram', 'error', str(e))
            
            await asyncio.sleep(0.2)  # Fast loop
    
    async def stop(self):
        """Stop the sender and disconnect."""
        self.running = False
        if self.client:
            await self.client.disconnect()
        logger.info("Telegram sender stopped")

# ============================================================================
# Main Application
# ============================================================================

class DiscordTelegramRelay:
    """Main application coordinating Discord watching and Telegram sending."""
    
    def __init__(self):
        self.config = Config.from_env()
        self.api = APIClient(self.config)
        self.discord_watcher = DiscordWatcher(self.config, self.api)
        self.telegram_sender = TelegramSender(self.config, self.api)
        self.running = False
    
    async def start(self):
        """Start the relay."""
        logger.info("=" * 60)
        logger.info("Discord to Telegram Relay Starting (Real-Time Mode)")
        logger.info("=" * 60)
        
        self.running = True
        
        # Setup signal handlers
        for sig in (signal.SIGINT, signal.SIGTERM):
            asyncio.get_event_loop().add_signal_handler(
                sig, lambda: asyncio.create_task(self.stop())
            )
        
        try:
            # Start both services
            await asyncio.gather(
                self.discord_watcher.start(),
                self.telegram_sender.start()
            )
            
            await self.api.log('info', 'Discord to Telegram relay started (real-time mode)')
            
            # Run both watch/send loops
            await asyncio.gather(
                self.discord_watcher.watch_channels(),
                self.telegram_sender.send_pending_messages(),
                self._heartbeat()
            )
            
        except Exception as e:
            logger.error(f"Relay error: {e}")
            await self.api.log('error', f'Relay error: {e}')
            raise
    
    async def _heartbeat(self):
        """Send periodic heartbeats."""
        while self.running:
            try:
                await self.api.update_connection_status('discord', 'connected')
                await self.api.update_connection_status('telegram', 'connected')
            except Exception as e:
                logger.debug(f"Heartbeat error: {e}")
            await asyncio.sleep(30)
    
    async def stop(self):
        """Stop the relay gracefully."""
        logger.info("Shutting down relay...")
        self.running = False
        
        await asyncio.gather(
            self.discord_watcher.stop(),
            self.telegram_sender.stop()
        )
        
        await self.api.update_connection_status('discord', 'disconnected')
        await self.api.update_connection_status('telegram', 'disconnected')
        await self.api.log('info', 'Discord to Telegram relay stopped')
        await self.api.close()
        
        logger.info("Relay stopped")

# ============================================================================
# Entry Point
# ============================================================================

async def main():
    """Main entry point."""
    relay = DiscordTelegramRelay()
    await relay.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
