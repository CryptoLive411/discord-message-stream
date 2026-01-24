# Discord to Telegram Mirror Relay Worker

Python worker that watches Discord channels and relays messages to Telegram.

## Requirements

- Python 3.11+
- A VPS or always-on computer
- Discord account (with access to channels you want to mirror)
- Telegram account (with API credentials from https://my.telegram.org)

## Quick Setup

### 1. Clone/Copy Files to Your VPS

```bash
mkdir ~/discord-mirror
cd ~/discord-mirror
# Copy all files from this worker/ directory
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
playwright install chromium
```

### 4. Configure Environment

```bash
cp .env.example .env
nano .env  # Edit with your values
```

Fill in:
- `WORKER_API_KEY` - From your Lovable project secrets
- `SUPABASE_URL` - Already filled in
- `TELEGRAM_API_ID` - Already filled in
- `TELEGRAM_API_HASH` - Already filled in

### 5. First-Time Discord Login

Run in non-headless mode to login to Discord:

```bash
HEADLESS=false python discord_telegram_relay.py
```

A browser window will open. Login to Discord manually. Your session will be saved in `./discord_profile/`.

Press Ctrl+C after successful login.

### 6. First-Time Telegram Authentication

Run the script:

```bash
python discord_telegram_relay.py
```

Telethon will prompt for:
1. Your phone number (with country code, e.g., +1234567890)
2. The verification code sent to your Telegram app
3. 2FA password (if enabled)

Your session will be saved in `discord_mirror_session.session`.

### 7. Configure Channels in Dashboard

1. Go to your Lovable app dashboard
2. Navigate to **Channels** page
3. Add Discord channel URLs to watch
4. Configure Telegram destination in **Settings**

### 8. Run as Service (Production)

```bash
# Edit the service file with your username
nano discord-mirror.service

# Install the service
sudo cp discord-mirror.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable discord-mirror
sudo systemctl start discord-mirror
```

### Check Status

```bash
sudo systemctl status discord-mirror
sudo journalctl -u discord-mirror -f
```

## Headless Mode with Virtual Display

For headless servers, you may need a virtual display:

```bash
# Install Xvfb
sudo apt install xvfb

# Run with virtual display
xvfb-run --server-args="-screen 0 1920x1080x24" python discord_telegram_relay.py
```

## Troubleshooting

### Browser issues
- Ensure Playwright chromium is installed: `playwright install chromium`
- Try non-headless mode: `HEADLESS=false python discord_telegram_relay.py`

### Telegram connection issues
- Delete session file and re-authenticate: `rm discord_mirror_session.session`
- Check API credentials match https://my.telegram.org

### Discord login expired
- Delete browser profile and re-login: `rm -rf ./discord_profile/`
- Run in non-headless mode to login again

### Messages not being picked up
- Check channel URLs are correct
- Ensure channels are enabled in dashboard
- Check logs: `tail -f relay.log`

## Files

- `discord_telegram_relay.py` - Main worker script
- `requirements.txt` - Python dependencies
- `.env` - Configuration (create from .env.example)
- `.env.example` - Example configuration template
- `discord-mirror.service` - Systemd service file
- `discord_profile/` - Browser session storage (auto-created)
- `discord_mirror_session.session` - Telegram session (auto-created)
- `relay.log` - Application logs
