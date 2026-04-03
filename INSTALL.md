# Kimi Review Plugin - Installation & Setup

## ✅ Plugin Discovery - How It Works

Claude Code discovers plugins through:

1. **`.claude-plugin/plugin.json` manifest** - Required file that defines plugin metadata
2. **Skills directory** - Each skill in `skills/<name>/SKILL.md` with YAML frontmatter
3. **Plugin loading methods:**
   - **Development:** `--plugin-dir` flag (loads directly, no installation)
   - **User install:** Copy to `~/.claude/plugins/cache/`
   - **Project install:** Copy to `.claude/plugins/cache/` in your project

## Plugin Structure (Validated ✅)

```
kimi-review-plugin/
├── .claude-plugin/
│   └── plugin.json              ✅ Required manifest
├── skills/
│   ├── review/SKILL.md          ✅ Standard code review
│   ├── adversarial-review/SKILL.md  ✅ Challenge-focused review
│   ├── status/SKILL.md          ✅ Job progress tracking
│   ├── result/SKILL.md          ✅ Retrieve results
│   └── cancel/SKILL.md          ✅ Stop running jobs
├── scripts/
│   ├── kimi-companion.mjs       ✅ Command orchestrator
│   ├── job-manager.mjs          ✅ Job lifecycle
│   ├── review-worker.mjs        ✅ Background worker
│   └── session-lifecycle.mjs    ✅ Hooks
├── lib/
│   ├── git-diff.mjs
│   ├── scope-estimator.mjs
│   ├── kimi-cli-wrapper.mjs
│   ├── output-parser.mjs
│   └── job-store.mjs
├── prompts/
│   ├── kimi-review.md
│   └── kimi-adversarial-review.md
├── hooks.json                    ✅ Session lifecycle hooks
├── package.json
└── README.md
```

## Installation Methods

### Method 1: Development Mode (Recommended for Testing)

**No installation needed** - load directly from source:

```bash
# From any git repository:
claude --plugin-dir ~/Projects/kimi-review-plugin

# Then use the skills:
/kimi-review:review
/kimi-review:adversarial-review
```

**Pros:**
- Instant updates (just edit files)
- No cache clearing needed
- Perfect for development

**Cons:**
- Must specify `--plugin-dir` every time
- Not persistent across sessions

---

### Method 2: User-Level Install (Persistent)

Install to `~/.claude/plugins/cache/` for always-on access:

```bash
# Create plugin directory
mkdir -p ~/.claude/plugins/cache/local/kimi-review/1.0.0

# Copy plugin files
cp -r ~/Projects/kimi-review-plugin/* ~/.claude/plugins/cache/local/kimi-review/1.0.0/

# Restart Claude Code or reload plugins
claude  # Skills auto-discovered on next session
```

**Pros:**
- Available in all sessions automatically
- No `--plugin-dir` flag needed

**Cons:**
- Must manually update when you change files
- Must clear cache when testing changes

---

### Method 3: Project-Level Install (Team-Shared)

Install to project's `.claude/plugins/` for team sharing:

```bash
cd ~/Projects/your-project

# Create project plugins directory
mkdir -p .claude/plugins/cache/local/kimi-review/1.0.0

# Copy plugin files
cp -r ~/Projects/kimi-review-plugin/* .claude/plugins/cache/local/kimi-review/1.0.0/

# Add to .gitignore if needed
echo ".claude/plugins/cache/" >> .gitignore

# Commit the plugin
git add .claude/plugins/cache/local/kimi-review/1.0.0/.claude-plugin/plugin.json
git add .claude/plugins/cache/local/kimi-review/1.0.0/skills/
git commit -m "Add Kimi review plugin"
```

**Pros:**
- Shared across team via git
- Project-specific plugin versioning

**Cons:**
- Increases repo size
- Must update in each project separately

---

## Verification

### 1. Validate Plugin Manifest

```bash
claude plugins validate ~/Projects/kimi-review-plugin
```

**Expected output:**
```
Validating plugin manifest: /Users/.../kimi-review-plugin/.claude-plugin/plugin.json
✔ Validation passed
```

---

### 2. Test Plugin Loading

```bash
cd /tmp/test-repo  # Any git repo
claude --plugin-dir ~/Projects/kimi-review-plugin -p "list the kimi-review plugin skills"
```

**Expected output:**
```
The kimi-review plugin has 5 skills:

| Skill | Description |
|-------|-------------|
| kimi-review:review | Run code review on uncommitted changes |
| kimi-review:adversarial-review | Challenge-focused review |
| kimi-review:status | Check background job status |
| kimi-review:result | Retrieve completed job results |
| kimi-review:cancel | Stop running jobs |
```

---

### 3. Test a Real Review

```bash
cd ~/Projects/your-project  # Git repo with changes

# Standard review (foreground)
claude --plugin-dir ~/Projects/kimi-review-plugin
> /kimi-review:review --wait

# Adversarial review (background for large diffs)
> /kimi-review:adversarial-review

# Check status
> /kimi-review:status

# Get results
> /kimi-review:result <job-id>
```

---

## Prerequisites

### 1. Kimi CLI (Required)

```bash
# Check if installed
kimi --version

# Install if missing
npm install -g @moonshot-ai/kimi-cli
# or
curl -sSL https://moonshot.cn/install.sh | sh
```

### 2. Node.js (Required)

```bash
# Check version (must be 18.18+)
node --version

# Install if missing
brew install node  # macOS
```

### 3. Git Repository (Required)

Plugin only works in git repositories:

```bash
cd your-project
git init  # If not already a git repo
```

---

## Usage After Installation

### If Using `--plugin-dir`:

```bash
claude --plugin-dir ~/Projects/kimi-review-plugin
> /kimi-review:review
```

### If Installed to User Cache:

```bash
claude  # No flag needed
> /kimi-review:review
```

### Available Commands:

| Command | Description |
|---------|-------------|
| `/kimi-review:review [--wait\|--background] [--staged] [--branch X]` | Standard review |
| `/kimi-review:adversarial-review [options]` | Challenge-focused review |
| `/kimi-review:status [job-id]` | Check job progress |
| `/kimi-review:result <job-id>` | Get findings |
| `/kimi-review:cancel <job-id>` | Stop job |

---

## Updating the Plugin

### Development Mode:
Just edit files - changes apply immediately on next invocation.

### User/Project Install:
```bash
# Re-copy files to cache directory
cp -r ~/Projects/kimi-review-plugin/* ~/.claude/plugins/cache/local/kimi-review/1.0.0/

# Bump version in .claude-plugin/plugin.json if needed
```

---

## Troubleshooting

### Plugin Not Detected

```bash
# Validate manifest
claude plugins validate ~/Projects/kimi-review-plugin

# Check for .claude-plugin/plugin.json
ls -la ~/Projects/kimi-review-plugin/.claude-plugin/
```

**Solution:** Ensure `.claude-plugin/plugin.json` exists with correct structure.

---

### Skills Not Found

```bash
# Check skills directory structure
ls -la ~/Projects/kimi-review-plugin/skills/
```

**Expected:**
```
skills/
  review/SKILL.md
  adversarial-review/SKILL.md
  status/SKILL.md
  result/SKILL.md
  cancel/SKILL.md
```

**Solution:** Each skill needs its own directory with `SKILL.md` file.

---

### "Kimi CLI not found"

```bash
# Check Kimi installation
which kimi
kimi --version

# Install if missing
npm install -g @moonshot-ai/kimi-cli
```

---

### "Not a git repository"

```bash
# Initialize git
cd your-project
git init
git add .
git commit -m "Initial commit"

# Then try review again
/kimi-review:review
```

---

## Plugin Metadata

**Current structure:**

```json
{
  "name": "kimi-review",
  "version": "1.0.0",
  "description": "Kimi code review integration for Claude Code",
  "keywords": ["code-review", "kimi", "review", "adversarial-review", "moonshot"],
  "author": { "name": "Andrew Kershaw" }
}
```

**Skills namespace:** `/kimi-review:<skill-name>`

**Job storage:** `~/.kimi-review/jobs/<repo-hash>/<job-id>/`

---

## Next Steps

1. **Test in development mode:**
   ```bash
   claude --plugin-dir ~/Projects/kimi-review-plugin
   ```

2. **Run a real review:**
   ```bash
   cd ~/Projects/mlb-edge
   /kimi-review:review
   ```

3. **Install permanently** (optional):
   ```bash
   cp -r ~/Projects/kimi-review-plugin ~/.claude/plugins/cache/local/kimi-review/1.0.0/
   ```

4. **Share with team** (optional):
   - Commit to project's `.claude/plugins/cache/`
   - Or publish to a plugin marketplace

---

## Status: ✅ Ready for Use

- ✅ Manifest validated
- ✅ Skills discovered (5 total)
- ✅ Plugin loads correctly with `--plugin-dir`
- ✅ Scripts executable
- ✅ Dependencies installed

The plugin is production-ready. Use `--plugin-dir` for development or install to cache for permanent access.
