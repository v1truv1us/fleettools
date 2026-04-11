# Installing Harnesses

FleetTools routes tasks to coding harness CLIs. Each one needs to be installed and visible on PATH.

---

## Check what you have

```bash
fleet harnesses status
```

This probes for all three harnesses and reports which are available.

---

## Claude Code

The Claude Code CLI from Anthropic.

### Install

```bash
npm install -g @anthropic-ai/claude-code
```

### Verify

```bash
claude --version
```

### Notes

Requires an Anthropic API key or Claude Pro/Max subscription. The adapter uses `--print --output-format json` for non-interactive execution.

### Override binary

```bash
export FLEET_CLAUDE_COMMAND=/path/to/claude
```

---

## OpenCode

The OpenCode CLI for terminal-based AI coding.

### Install

```bash
# Installs to ~/.opencode/bin/opencode
curl -fsSL https://opencode.ai/install | bash
```

### Verify

```bash
opencode --version
```

### Notes

If `opencode` is not on PATH after install, symlink it:

```bash
ln -s ~/.opencode/bin/opencode ~/.local/bin/opencode
```

The adapter uses `run --format json` for non-interactive execution.

### Override binary

```bash
export FLEET_OPENCODE_COMMAND=/path/to/opencode
```

---

## Codex

The OpenAI Codex CLI.

### Install

```bash
npm install -g @openai/codex
```

### Verify

```bash
codex --version
```

### Notes

Requires an OpenAI API key. The adapter uses `exec --full-auto --sandbox workspace-write` for non-interactive execution.

### Override binary

```bash
export FLEET_CODEX_COMMAND=/path/to/codex
```

---

## Install Solo

FleetTools uses Solo as its task ledger. Required for orchestration to work.

### From source

```bash
git clone https://github.com/v1truv1us/Solo.git ~/repos/Solo
cd ~/repos/Solo
cargo build --release
```

### Verify

```bash
solo --version
```

### Add to PATH

```bash
ln -s ~/repos/Solo/target/release/solo ~/.local/bin/solo
```

---

## Common PATH issues

If `fleet harnesses status` shows a harness as `unavailable` but you know it's installed:

1. Check where the binary lives:

```bash
which claude opencode codex
```

2. Make sure `~/.local/bin` is on your PATH:

```bash
echo $PATH | tr ':' '\n' | grep local/bin
```

3. Add it if missing (add to `~/.zshrc` or `~/.bashrc`):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

4. Or set the env var for the specific harness:

```bash
export FLEET_CLAUDE_COMMAND=/full/path/to/claude
export FLEET_OPENCODE_COMMAND=/full/path/to/opencode
export FLEET_CODEX_COMMAND=/full/path/to/codex
```

---

## Minimum requirements

You only need **one** harness installed to use orchestration. FleetTools routes to whatever is available based on your `fleet.routing.yaml` rules.
