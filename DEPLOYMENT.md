# FleetTools Deployment Guide

Complete guide for deploying FleetTools to your VPS and integrating with OpenCode/Claude Code.

## Prerequisites

### VPS Requirements
- **OS:** Linux (tested on Ubuntu/Debian)
- **Resources:** 2 vCPU, 3.6GB+ RAM, 20GB+ storage
- **Software:**
  - Node.js 18+ (v25.2.1+ tested)
  - Postgres 16.x
  - Podman (for local development)
  - Caddy (for Cloudflare Tunnel)
  - Cloudflared (for Cloudflare Tunnel)

### Local Development Machine
- **OS:** macOS or Linux
- **Software:**
  - Node.js 18+ (v25.2.1+ tested)
  - Podman (optional, for local Postgres)
  - Fleet CLI
  - OpenCode or Claude Code

---

## VPS Deployment Steps

### 1. Upload FleetTools to VPS
```bash
# On local machine
cd /home/vitruvius/git/fleettools
git status  # Ensure clean state
git add .
git commit -m "Initial FleetTools implementation"
git push origin main

# On VPS (if not cloning from GitHub yet)
cd /opt
git clone https://github.com/v1truv1us/fleettools.git
cd fleettools
```

### 2. Install Dependencies on VPS
```bash
# Install Node.js 18+ (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y postgresql-16 postgresql-contrib-pgvector

# Verify installations
node --version  # Should be v18.17.0+
psql --version   # Should be 16.x
```

### 3. Install Ollama on VPS
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version

# Pull embedding model
ollama pull bge-small-en-v1.5

# Start Ollama (as systemd service, see below)
```

### 4. Deploy Systemd Services
Copy service files from `server/` directory to VPS:

```bash
# On local machine, copy files
scp server/*.service your-user@vps:/tmp/

# On VPS
sudo cp /tmp/*.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable postgresql fleettools-api fleettools-embedder zero

# Start services
sudo systemctl start postgresql
sudo systemctl start fleettools-api
sudo systemctl start fleettools-embedder
sudo systemctl start zero
```

### 5. Configure Postgres
```bash
# Create FleetTools database
sudo -u postgres psql -h localhost -p 5432 -c "CREATE USER fleettools WITH CREATEDB PASSWORD 'changeme';"
sudo -u postgres psql -h localhost -p 5432 -c "ALTER USER fleettools WITH PASSWORD 'changeme';"
sudo -u postgres psql -h localhost -p 5432 -c "CREATE DATABASE fleettools OWNER fleettools;"

# Create pgvector extension
sudo -u postgres psql -h localhost -p 5432 -d fleettools -c "CREATE EXTENSION vector;"

# Verify
sudo -u postgres psql -h localhost -p 5432 -d fleettools -c "\dx pgvector;"
```

### 6. Configure Caddy for Cloudflare Tunnel

Create `/etc/caddy/Caddyfile`:

```
# Cloudflare Zero
zero.example.com {
    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Cloudflare-Access-User-Identity {cf-user}
    }
}

# FleetTools API
api.example.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
    }
}
```

### 7. Configure Cloudflare Zero Trust

1. Log in to Cloudflare Zero Trust: https://dash.teams.cloudflare.com/
2. Add your VPS domain (e.g., `zero.example.com`, `api.example.com`)
3. Configure Access policies:
   - For `api.example.com`: Allow your identity
   - For `zero.example.com`: Allow your identity + Service Token

4. Generate a Service Token for machine-to-machine communication:
   - Go to: https://dash.teams.cloudflare.com/ -> Zero -> Service Tokens
   - Create token with appropriate permissions

5. Configure Cloudflare Tunnel (Cloudflared):
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Create tunnel configuration
cat > ~/.cloudflared/config.yml << EOF
tunnel: fleettools-zero
credentials-file: /home/vitruvius/.cloudflared/credentials.json
EOF

# Start tunnel (as systemd service)
sudo systemctl enable cloudflared@fleettools
sudo systemctl start cloudflared@fleettools
```

---

## Local Development Setup

### Install Fleet CLI
```bash
# Clone repository
git clone https://github.com/v1truv1us/fleettools.git
cd fleettools

# Create symbolic link for easy access
sudo ln -s $(pwd)/fleet /usr/local/bin/fleet

# Verify installation
fleet status
```

### OpenCode Plugin Installation
```bash
# Copy plugin to OpenCode plugins directory
cp -r plugins/opencode/* ~/.opencode/plugins/fleettools-opencode

# Restart OpenCode
# OpenCode should detect new plugin automatically
```

### Claude Code Plugin Installation
```bash
# Copy plugin to Claude Code plugins directory
cp -r plugins/claude-code/* ~/.claude/plugins/fleettools-claude

# Restart Claude Code
```

---

## Testing

### Test Local CLI
```bash
# Run diagnostics
fleet doctor

# Start local services (optional, requires Podman)
fleet services up

# Check status
fleet status
```

### Test VPS Services
```bash
# Check service status
sudo systemctl status postgresql fleettools-api fleettools-embedder zero

# Check logs
sudo journalctl -u fleettools-api -f
sudo journalctl -u fleettools-embedder -f
sudo journalctl -u zero -f

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Test Plugins
```bash
# In OpenCode or Claude Code, run:
/fleet status
/fleet help
```

---

## Configuration

### Fleet CLI Configuration
Fleet CLI configuration is stored at: `~/.config/fleet/fleet.json`

Key settings:
- `mode`: "local" or "synced"
- `services.postgres.enabled`: true/false
- `sync.zero.url`: Zero server URL
- `sync.api.url`: FleetTools API URL
- `memory.embeddings.enabled`: true/false
- `memory.embeddings.model`: "bge-small-en-v1.5" or "nomic-embed-text-v1.5"

### VPS Environment Variables
Services use environment variables configured in systemd unit files:
- `NODE_ENV=production`
- `PORT=3000` (API), `PORT=3001` (Squawk)
- `ZERO_POSTGRES_URL=postgres://...`
- `ZERO_LOG=/var/log/zero/fleettools.log`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `EMBEDDING_MODEL=bge-small-en-v1.5`

---

## Security Considerations

### Authentication
- **Human access:** Cloudflare Access with your identity (browser login)
- **Machine access:** Cloudflare Service Tokens (no API keys to manage)
- **API-only writes:** Plugins never write to Postgres directly
- **Zero reads only:** Clients read via Zero, no direct DB access

### Network
- **No public exposure:** Services behind Cloudflare Tunnel only
- **TLS termination:** Cloudflare handles TLS
- **Service tokens:** Limited scope tokens for machine-to-machine auth

### Data Isolation
- Per-workspace `.flightline/` directories
- Per-tenant Postgres databases
- Zero publication excludes sensitive data (vectors not synced)

---

## Troubleshooting

### Common Issues

#### Postgres won't start
```bash
# Check logs
sudo journalctl -u postgresql -f

# Check port availability
sudo netstat -tulpn | grep :5432

# Check disk space
df -h
```

#### Ollama won't start
```bash
# Check Ollama service
sudo systemctl status fleettools-embedder

# Test model directly
ollama run bge-small-en-v1.5 "test embedding"

# Check logs
sudo journalctl -u fleettools -f
```

#### Cloudflare Tunnel issues
```bash
# Check cloudflared status
sudo systemctl status cloudflared@fleettools

# Check Cloudflare Access logs
# https://dash.teams.cloudflare.com/
```

#### Plugin not detected
```bash
# Verify plugin installation
ls -la ~/.opencode/plugins/ | grep fleettools
ls -la ~/.claude/plugins/ | grep fleettools

# Restart editor
# OpenCode/Claude Code may need restart after plugin installation
```

---

## Architecture Recap

```
┌─────────────────────────────────────────────────────────────┐
│  Local Machine                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ OpenCode / Claude Code (Plugins)               │     │
│  │  └─→ /fleet commands (UI layer)            │     │
│  │         ↓                                    │     │
│  │  Fleet CLI (Operations)                       │     │
│  │  ├─→ Setup / Doctor / Sync / Services          │     │
│  │  │                                           │     │
│  │  ├─→ Local Mode:                         │     │
│  │  │    ├─→ Podman Postgres (optional)       │     │
│  │  │    └─→ .flightline/ (git-backed)        │     │
│  │  │                                           │     │
│  │  └─→ Sync Mode (opt-in):                   │     │
│  │        ├─→ API writes                          │     │
│  │        └─→ Zero reads (replicated projections)  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                          │
│                                                          │
└─────────────────────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────────────────────┐
│  VPS (Server)                                            │
│  ├─→ Postgres 16 (systemd)                             │
│  ├─→ FleetTools API (systemd)                         │
│  ├─→ Zero (systemd)                                   │
│  ├─→ FleetTools Embedder (Ollama, systemd)              │
│  └─→ Cloudflare Tunnel (cloudflared)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

### After VPS Deployment
1. Configure Cloudflare Access for your domains
2. Generate Service Token for machine auth
3. Test all services are running
4. Configure local development machine

### For Development
1. Install Fleet CLI and plugins
2. Test local-only mode
3. (Optional) Enable sync and test integration
4. Contribute back improvements!

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/v1truv1us/fleettools/issues
- Documentation: See README.md and IMPLEMENTATION.md
- Architecture: See flightline/README.md and squawk/README.md

---

## License

FleetTools includes vendored code from SwarmTools (MIT License).
See `THIRD_PARTY_NOTICES.md` for full attribution.
