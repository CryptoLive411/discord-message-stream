#!/usr/bin/env python3
"""
Discord to Telegram Mirror Relay Worker
========================================
Watches Discord channels via browser automation (Playwright)
and relays messages to Telegram via MTProto (Telethon).

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
from playwright.async_api import async_playwright, Browser, Page
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
    poll_interval: int = 5  # seconds between Discord checks
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
            poll_interval=int(os.getenv('POLL_INTERVAL', '5')),
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
                    "data": {"message_id": message_id, "error": error}
                }
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to mark message as failed: {e}")
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
# Discord Watcher (Playwright)
# ============================================================================

class DiscordWatcher:
    """Watches Discord channels for new messages using Playwright."""
    
    def __init__(self, config: Config, api: APIClient):
        self.config = config
        self.api = api
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.running = False
        self.last_fingerprints: dict[str, str] = {}
    
    async def start(self):
        """Start the browser and login to Discord."""
        logger.info("Starting Discord watcher...")
        
        playwright = await async_playwright().start()
        
        # Use persistent context for session persistence
        context = await playwright.chromium.launch_persistent_context(
            self.config.browser_profile_path,
            headless=self.config.headless,
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        self.page = context.pages[0] if context.pages else await context.new_page()
        self.running = True
        
        # Check if we're logged in
        await self.page.goto('https://discord.com/channels/@me')
        await asyncio.sleep(3)
        
        # Check for login page
        if 'login' in self.page.url.lower():
            logger.warning("Not logged in to Discord. Please login manually...")
            await self.api.update_connection_status('discord', 'disconnected', 'Login required')
            await self.api.log('warn', 'Discord login required - please login in the browser window')
            
            # Wait for manual login (up to 5 minutes)
            for _ in range(60):
                await asyncio.sleep(5)
                if 'login' not in self.page.url.lower():
                    logger.info("Discord login successful!")
                    break
            else:
                raise Exception("Discord login timeout - please run in non-headless mode to login")
        
        await self.api.update_connection_status('discord', 'connected')
        await self.api.log('info', 'Discord watcher connected and ready')
        logger.info("Discord watcher ready!")
    
    def _generate_fingerprint(self, channel_id: str, message_id: str) -> str:
        """Generate a unique fingerprint for a message."""
        content = f"{channel_id}:{message_id}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]
    
    async def _scrape_messages(self, channel_url: str) -> list[dict]:
        """Scrape messages from a Discord channel."""
        messages = []
        
        try:
            await self.page.goto(channel_url)
            await asyncio.sleep(3)  # Wait for messages to load
            
            # Try multiple selectors for Discord messages (Discord changes these frequently)
            selectors = [
                '[id^="chat-messages-"]',  # Message container IDs
                '[class*="messageListItem-"]',  # Message list items
                '[class*="message-"][class*="cozyMessage-"]',  # Cozy message format
                '[data-list-item-id^="chat-messages-"]',  # Data attribute selector
                'li[id^="chat-messages-"]',  # List item messages
            ]
            
            message_elements = []
            for selector in selectors:
                elements = await self.page.query_selector_all(selector)
                if elements:
                    logger.info(f"Found {len(elements)} messages with selector: {selector}")
                    message_elements = elements
                    break
            
            if not message_elements:
                # Debug: log page content to see what we have
                logger.warning(f"No messages found with any selector in {channel_url}")
                # Try to get the chat container for debugging
                chat_container = await self.page.query_selector('[class*="chatContent-"]')
                if chat_container:
                    logger.debug("Chat container found, but no messages matched selectors")
                else:
                    logger.warning("Chat container not found - page may not be fully loaded")
                return messages
            
            for element in message_elements[-20:]:  # Last 20 messages
                try:
                    # Extract message ID from data attribute
                    message_id = await element.get_attribute('id')
                    if not message_id:
                        continue
                    
                    # Extract author
                    author_el = await element.query_selector('[class*="username-"]')
                    author = await author_el.text_content() if author_el else 'Unknown'
                    
                    # Extract message content
                    content_el = await element.query_selector('[class*="messageContent-"]')
                    content = await content_el.text_content() if content_el else ''
                    
                    # Extract attachments
                    attachments = []
                    attachment_els = await element.query_selector_all('[class*="imageWrapper-"] img, [class*="attachment-"] a')
                    for att_el in attachment_els:
                        src = await att_el.get_attribute('src') or await att_el.get_attribute('href')
                        if src:
                            attachments.append(src)
                    
                    # Extract timestamp
                    time_el = await element.query_selector('time')
                    timestamp = await time_el.get_attribute('datetime') if time_el else None
                    
                    messages.append({
                        'message_id': message_id,
                        'author': author.strip(),
                        'content': content.strip(),
                        'attachments': attachments,
                        'timestamp': timestamp
                    })
                    
                except Exception as e:
                    logger.debug(f"Error parsing message element: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error scraping channel {channel_url}: {e}")
        
        return messages
    
    async def watch_channels(self):
        """Main loop to watch all enabled channels."""
        while self.running:
            try:
                channels = await self.api.get_channels()
                
                for channel in channels:
                    if not channel.get('enabled'):
                        continue
                    
                    channel_id = channel['id']
                    channel_url = channel['url']
                    channel_name = channel['name']
                    last_fingerprint = channel.get('last_message_fingerprint')
                    
                    logger.debug(f"Checking channel: {channel_name}")
                    
                    messages = await self._scrape_messages(channel_url)
                    
                    # Find new messages (after last fingerprint)
                    new_messages = []
                    found_last = last_fingerprint is None
                    
                    for msg in messages:
                        fingerprint = self._generate_fingerprint(channel_id, msg['message_id'])
                        
                        if found_last:
                            new_messages.append({**msg, 'fingerprint': fingerprint})
                        elif fingerprint == last_fingerprint:
                            found_last = True
                    
                    # Push new messages to queue
                    for msg in new_messages:
                        success = await self.api.push_message(channel_id, {
                            'fingerprint': msg['fingerprint'],
                            'discord_message_id': msg['message_id'],
                            'author_name': msg['author'],
                            'message_text': msg['content'],
                            'attachment_urls': msg['attachments']
                        })
                        
                        if success:
                            logger.info(f"Queued message from {msg['author']} in #{channel_name}")
                            await self.api.log('info', f"Queued message from {msg['author']}", channel_name)
                
                await self.api.update_connection_status('discord', 'connected')
                
            except Exception as e:
                logger.error(f"Error in watch loop: {e}")
                await self.api.update_connection_status('discord', 'error', str(e))
            
            await asyncio.sleep(self.config.poll_interval)
    
    async def stop(self):
        """Stop the watcher and close browser."""
        self.running = False
        if self.page:
            await self.page.context.close()
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
        parts = []
        
        # Add channel prefix
        parts.append(f"**#{channel_name}**")
        
        # Add author
        parts.append(f"**{msg['author_name']}:**")
        
        # Add content
        if msg.get('message_text'):
            parts.append(msg['message_text'])
        
        return '\n'.join(parts)
    
    async def send_pending_messages(self):
        """Main loop to send pending messages."""
        while self.running:
            try:
                messages = await self.api.get_pending_messages()
                
                if not messages:
                    await asyncio.sleep(2)
                    continue
                
                # Get destination
                dest = await self._get_destination()
                if not dest:
                    logger.warning("No Telegram destination configured")
                    await asyncio.sleep(10)
                    continue
                
                for msg in messages:
                    try:
                        # Get channel info for formatting
                        channels = await self.api.get_channels()
                        channel = next((c for c in channels if c['id'] == msg.get('channel_id')), None)
                        channel_name = channel['name'] if channel else 'Unknown'
                        
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
                            parse_mode='md'
                        )
                        
                        # Handle attachments
                        attachments = msg.get('attachment_urls', [])
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
            
            await asyncio.sleep(1)
    
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
        logger.info("=" * 50)
        logger.info("Discord to Telegram Relay Starting")
        logger.info("=" * 50)
        
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
            
            await self.api.log('info', 'Discord to Telegram relay started')
            
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
