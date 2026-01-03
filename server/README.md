# FleetTools VPS Services

**Systemd service files for VPS deployment of FleetTools server infrastructure.**

## Services

### 1) postgres.service
PostgreSQL 16.x database server.

### 2) fleettools-api.service
FleetTools API server - handles write operations and query endpoints.

### 3) zero.service
Rocicorp Zero server for read replication to clients.

### 4) fleettools-embedder.service
Ollama-based embedding worker - always-on, processes chunks and stores vectors in pgvector.

## Installation

Copy service files to VPS:
```bash
sudo cp fleettools-api.service /etc/systemd/system/
sudo cp postgresql.service /etc/systemd/system/
sudo cp zero.service /etc/systemd/system/
sudo cp fleettools-embedder.service /etc/systemd/system/

# Enable services
sudo systemctl daemon-reload
sudo systemctl enable postgresql fleettools-api zero fleettools-embedder

# Start services
sudo systemctl start postgresql fleettools-api zero fleettools-embedder
```

## Configuration

These service files should be configured with appropriate paths and environment variables. See individual service files for details.
