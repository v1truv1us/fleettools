THIRD_PARTY NOTICES for FleetTools

This project includes code from SwarmTools (https://github.com/joelhooks/swarm-tools)
which is licensed under the MIT License.

---

## SwarmTools Packages Included

### swarming/swarm-mail
License: MIT
Repository: https://github.com/joelhooks/swarm-tools/tree/main/packages/swarm-mail
Copyright (c) Joel Hooks

The MIT License applies to the following components (derived from swarm-mail):

- Durable Mailbox implementation
- Event streaming primitives
- Cursor management
- Lock primitives
- Deferred coordination primitives

### opencode-swarm-plugin
License: MIT
Repository: https://github.com/joelhooks/swarm-tools/tree/main/packages/opencode-swarm-plugin
Copyright (c) Joel Hooks

The MIT License applies to the following components (derived from opencode-swarm-plugin):

- Swarm orchestration and coordination
- Hive (.hive/) work tracking
- Agent/worker management
- Plugin interface for OpenCode

---

## FleetTools Modifications

FleetTools has forked and renamed the SwarmTools architecture:

| SwarmTools | FleetTools | Notes |
|-----------|------------|-------|
| `.hive/` | `.flightline/` | Git-backed work tracking |
| `swarm-mail` | `Squawk` | Agent coordination and messaging |
| Coordinator | Dispatch | Fleet orchestration |
| Workers | Specialists | Agent workers with specialized capabilities |
| File Reservations | CTK | Consolidated Tool Kit (file locks) |
| Patterns | Tech Orders | Learned patterns and anti-patterns |
| `/swarm` command | `/fleet` command | Command namespace |

---

## Full MIT License Text

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
