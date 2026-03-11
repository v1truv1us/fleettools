# FAQ

Frequently asked questions about FleetTools.

## General Questions

### What is FleetTools?

FleetTools is an AI Agent Coordination System built with TypeScript. It enables seamless collaboration between AI agents, human developers, and development environments through an event-driven architecture with centralized coordination via the Squawk service.

### What can FleetTools do?

- **Agent Coordination**: Coordinate multiple AI agents across development tasks
- **Work Management**: Track missions, work orders, and checkpoints
- **Editor Integration**: Integrate with Claude Code and OpenCode
- **Real-time Updates**: Get real-time status updates via Squawk
- **API Access**: RESTful API for custom integrations

### Who is FleetTools for?

- Development teams using AI-assisted workflows
- Organizations managing multiple AI agents
- DevOps teams coordinating automated development
- Individual developers building with AI agents

### How much does FleetTools cost?

FleetTools is open-source and free to use. Enterprise support and custom integrations are available.

---

## Installation & Setup

### How do I install FleetTools?

```bash
# Clone repository
git clone https://github.com/yourusername/fleettools.git
cd fleettools

# Install dependencies
bun install

# Build all workspaces
bun run build
```

### Do I need Bun, or can I use Node.js?

FleetTools supports both Bun (>=1.0.0) and Node.js (>=18.0.0). Bun is recommended for optimal performance.

### What are the system requirements?

- Bun (>=1.0.0) or Node.js (>=18.0.0)
- TypeScript 5.9.3 (included as dependency)
- Git (optional, for version control)
- ~500MB free disk space
- 2GB RAM minimum (4GB recommended)

### How do I uninstall FleetTools?

```bash
# Remove global installation
npm uninstall -g @fleettools/fleet-cli

# Remove configuration and data
rm -rf ~/.fleet

# Remove project configurations
rm -rf your-project/.fleet
```

---

## Configuration

### Where is FleetTools configuration stored?

- **Global config**: `~/.fleet/config.json`
- **Project config**: `.fleet/config.json`
- **Database**: `~/.fleet/state.db` (global) or `.fleet/state.db` (project)

### How do I change the default ports?

```bash
# Change API port
fleet config set api.port 8080

# Change Squawk port
fleet config set squawk.port 8081

# Or use environment variables
export FLEET_API_PORT=8080
export FLEET_SQUAWK_PORT=8081
```

### How do I change the log level?

```bash
# Via CLI
fleet config set logging.level debug

# Via environment variable
export FLEET_LOG_LEVEL=debug

# Via command
fleet start --verbose
```

### Can I run multiple FleetTools instances?

Yes, but each instance must use different ports:

```bash
# Instance 1
FLEET_API_PORT=3001 FLEET_SQUAWK_PORT=3002 fleet start

# Instance 2 (different terminal)
FLEET_API_PORT=3011 FLEET_SQUAWK_PORT=3012 fleet start
```

---

## Usage

### How do I create my first mission?

```bash
# Create mission
fleet mission create "Build authentication system"

# Add work orders
fleet work-order create msn-abc123 "Design database schema"
fleet work-order create msn-abc123 "Implement login API"

# Check status
fleet mission status msn-abc123
```

### How do I assign agents to work orders?

```bash
# Assign to specific agent type
fleet work-order assign wo-jkl012 full-stack-developer

# Or auto-assign (if configured)
fleet work-order create msn-abc123 "Design schema" --auto-assign
```

### How do I check agent status?

```bash
# Check all agents
fleet agent status

# Check specific agent
fleet agent status full-stack-developer
```

### Can I use FleetTools with multiple editors?

Yes! FleetTools supports multiple editor plugins simultaneously:

```bash
# Enable multiple plugins
fleet config set plugins.enabled '["claude-code","opencode"]'
```

---

## Plugins

### Which editors are supported?

- **Claude Code**: Native support
- **OpenCode**: Native support
- **Custom Plugins**: Build your own using the plugin API

### How do I install a plugin?

```bash
# Official plugins are included in the repository
cd plugins/claude-code
bun install
bun run build

# Third-party plugins
npm install @vendor/fleet-plugin-editor-name
```

### How do I build a custom plugin?

See [Plugin Development Guide](./plugin-development.md) for detailed instructions.

### My plugin isn't connecting. What do I do?

1. Check Squawk is running: `curl http://localhost:3002/health`
2. Verify configuration: `fleet config get squawk.url`
3. Check plugin logs for errors
4. Restart the plugin

---

## API

### How do I access the API?

The API is available at `http://localhost:3001/api/v1`

```bash
# Health check
curl http://localhost:3001/health

# List missions
curl http://localhost:3001/api/v1/flightline/missions

# Create mission
curl -X POST http://localhost:3001/api/v1/flightline/missions \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Mission"}'
```

### How do I authenticate with the API?

Currently, FleetTools does not require authentication. Future versions will support:
- API keys
- JWT tokens
- OAuth integration

### Is there an SDK?

SDK examples are available in JavaScript/TypeScript and Python in the [API Reference](./api-reference.md#sdk-examples).

### What is the rate limit?

Currently, there is no rate limit. Future versions will implement per-IP and per-agent rate limiting.

---

## Troubleshooting

### Port already in use error

```bash
# Find process using port
lsof -i :3001

# Kill process
lsof -ti :3001 | xargs kill -9

# Or change port
fleet config set api.port 8080
```

### Database locked error

```bash
# Remove lock files
rm ~/.fleet/state.db-wal
rm ~/.fleet/state.db-shm

# Or rebuild database
fleet db rebuild
```

### Services not starting

```bash
# Check logs
tail -f ~/.fleet/logs/fleet.log

# Verify ports
lsof -i :3001
lsof -i :3002

# Check configuration
fleet config validate

# Restart services
fleet stop
fleet start
```

### Plugin not connecting

1. Verify Squawk is running: `curl http://localhost:3002/health`
2. Check plugin configuration: `fleet config get plugins`
3. Restart plugin
4. Check editor console for errors

### Migration issues

See [Migration Guide](./migration.md#common-migration-issues) for detailed troubleshooting.

---

## Performance

### How many concurrent agents can I run?

Default is 5 concurrent agents. Increase if needed:

```bash
fleet config set agents.max_concurrent 10
```

### How do I improve performance?

1. Use Bun runtime instead of Node.js
2. Enable prepared database statements (default)
3. Increase database cache size
4. Use connection pooling for API calls
5. Enable compression for API responses

### What is the maximum number of work orders?

Default is 10 work orders per mission. Configure:

```bash
fleet config set --project rules.max_work_orders_per_mission 20
```

### How do I monitor performance?

```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health

# View logs
tail -f ~/.fleet/logs/fleet.log

# Monitor database size
ls -lh ~/.fleet/state.db
```

---

## Security

### Is FleetTools secure?

FleetTools implements:
- Input validation on all endpoints
- CORS headers for cross-origin requests
- SQLite database with file permissions
- No secret embedding in code

Future versions will add:
- Authentication and authorization
- Message encryption
- Rate limiting
- Audit logging

### Can I run FleetTools in production?

Yes, with these considerations:
1. Use proper authentication (when available)
2. Enable HTTPS for API endpoints
3. Configure appropriate logging
4. Implement backup strategy
5. Monitor system resources

### How do I secure my database?

```bash
# Set appropriate file permissions
chmod 600 ~/.fleet/state.db

# Store in secure location
fleet config set database.path /secure/path/state.db

# Enable encryption (future)
# Coming soon!
```

---

## Development

### How do I contribute to FleetTools?

See [Development Guide](./development.md) for contribution guidelines.

1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### What is the code style?

- **Files**: kebab-case (`work-orders.ts`)
- **Functions**: camelCase (`getUserById`)
- **Classes**: PascalCase (`DatabaseAdapter`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY`)
- **Imports**: `.js` extensions for local imports

### How do I run tests?

```bash
# Run all tests
bun test

# Run specific workspace tests
cd server/api && bun test

# Run with coverage
bun test --coverage
```

### How do I build FleetTools?

```bash
# Build all workspaces
bun run build

# Build specific workspace
cd packages/fleet-cli && bun run build
```

---

## Comparison

### FleetTools vs. Other Tools

| Feature | FleetTools | Other Tools |
|---------|------------|-------------|
| Runtime | Bun + Node.js | Node.js only |
| Database | SQLite (bun:sqlite) | Various |
| Architecture | Event-driven | Varies |
| Plugins | Extensible | Limited |
| Editor Support | Claude Code, OpenCode | VS Code only |
| API | RESTful | Varies |
| Cost | Open-source | Paid |

### Why use Bun instead of Node.js?

- **Faster execution**: Bun is significantly faster than Node.js
- **Smaller bundle size**: Bun produces smaller binaries
- **Built-in utilities**: Bun includes file system, HTTP, SQLite
- **Native TypeScript**: No transpilation needed

---

## Architecture

### What is Squawk?

Squawk is the coordination service that provides:
- **Mailbox API**: Message passing between agents
- **Cursor API**: Shared state management
- **Lock API**: Distributed locking

### What is Flightline?

Flightline is the work management system that handles:
- **Missions**: High-level project objectives
- **Work Orders**: Individual development tasks
- **Checkpoints**: Verification and validation points

### How does event-driven architecture work?

```
1. User creates mission
2. Event stored in database
3. Notification sent via Squawk
4. Agents receive message
5. Agents process and respond
6. State updated
7. Real-time update sent
```

---

## Integration

### Can I integrate FleetTools with CI/CD?

Yes! Use the API to trigger work orders:

```bash
# GitHub Actions example
- name: Trigger work order
  run: |
    curl -X POST http://localhost:3001/api/v1/flightline/work-orders \
      -H "Content-Type: application/json" \
      -d '{
        "mission_id": "msn-abc123",
        "title": "Run tests for PR #123"
      }'
```

### Can I use FleetTools with GitHub Actions?

Yes. Use the API or CLI in your workflows:

```yaml
# .github/workflows/fleettools.yml
name: FleetTools Integration
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install FleetTools
        run: bun install
      - name: Create work order
        run: fleet work-order create msn-abc123 "Test PR"
```

### Can I use FleetTools with Docker?

Yes. Create a Dockerfile:

```dockerfile
FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 3001 3002
CMD ["fleet", "start"]
```

---

## Support

### Where can I get help?

- **Documentation**: [FleetTools Documentation](./README.md)
- **GitHub Issues**: https://github.com/v1truvius/fleettools/issues
- **Discussions**: https://github.com/v1truvius/fleettools/discussions
- **Email**: support@fleettools.dev

### How do I report a bug?

1. Search existing issues
2. Create new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details
   - Logs/screenshots

### How do I request a feature?

1. Search existing feature requests
2. Create issue with "enhancement" label
3. Describe use case and benefits
4. Provide examples if possible

---

## Future Roadmap

### What's coming next?

- **Authentication**: API keys, JWT tokens, OAuth
- **WebSocket API**: Real-time bidirectional communication
- **More Plugins**: Additional editor integrations
- **Performance**: Enhanced caching and optimization
- **Monitoring**: Built-in metrics and dashboards
- **Security**: Message encryption and audit logging

### How can I influence the roadmap?

1. Vote on existing feature requests
2. Create new feature requests
3. Contribute code via pull requests
4. Provide feedback on GitHub Discussions

---

## License

### What is the license?

[Add license information here]

### Can I use FleetTools commercially?

Yes, FleetTools is open-source and can be used commercially.

### Can I modify FleetTools?

Yes, you can modify and redistribute FleetTools under the terms of the license.

---

## Additional Resources

- [Getting Started](./getting-started.md)
- [Architecture](./architecture.md)
- [CLI Reference](./cli-reference.md)
- [API Reference](./api-reference.md)
- [Plugin Development](./plugin-development.md)
- [Configuration](./configuration.md)
- [Development](./development.md)
- [Migration](./migration.md)
- [GitHub Repository](https://github.com/v1truvius/fleettools)

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
