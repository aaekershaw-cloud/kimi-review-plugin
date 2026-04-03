# How Claude Code Discovers Plugins

## Discovery Mechanism

Claude Code discovers plugins through a **manifest-based system**:

```
1. Reads .claude-plugin/plugin.json (required manifest)
   ↓
2. Discovers skills in skills/<name>/SKILL.md
   ↓
3. Loads hooks from hooks/hooks.json
   ↓
4. Registers skills as /<plugin-name>:<skill-name>
   ↓
5. Makes them available via slash commands
```

## Required Files

### 1. Plugin Manifest (`.claude-plugin/plugin.json`)

**Location:** `/Users/andrewkershaw/Projects/kimi-review-plugin/.claude-plugin/plugin.json`

**Content:**
```json
{
  "name": "kimi-review",
  "version": "1.0.0",
  "description": "Kimi code review integration for Claude Code",
  "keywords": ["code-review", "kimi", "review", "adversarial-review", "moonshot"],
  "author": { "name": "Andrew Kershaw" }
}
```

**Purpose:**
- Defines plugin identity (`name` becomes skill namespace)
- Version for cache invalidation
- Metadata for plugin marketplace

**Validation:**
```bash
claude plugins validate ~/Projects/kimi-review-plugin
# ✔ Validation passed
```

---

### 2. Skills (Auto-Discovered)

**Location:** `skills/<skill-name>/SKILL.md`

**Structure:**
```
skills/
├── review/SKILL.md                    → /kimi-review:review
├── adversarial-review/SKILL.md       → /kimi-review:adversarial-review
├── status/SKILL.md                    → /kimi-review:status
├── result/SKILL.md                    → /kimi-review:result
└── cancel/SKILL.md                    → /kimi-review:cancel
```

**SKILL.md Format:**
```markdown
---
name: review
description: Run code review using Kimi CLI
user-invocable: true
allowed-tools:
  - Bash(*)
---

# Skill Documentation

Instructions for Claude on how to execute the skill...
```

**Key Fields:**
- `name`: Skill identifier (becomes `/<plugin-name>:<name>`)
- `description`: Shown in skill listings
- `user-invocable: true`: User can invoke with `/command`
- `allowed-tools`: Tools the skill can use

---

### 3. Hooks (Optional)

**Location:** `hooks/hooks.json`

**Note:** Our plugin currently has `hooks.json` at root, not in `hooks/` directory. This works but should be moved for consistency:

```bash
mkdir -p hooks
mv hooks.json hooks/hooks.json
```

Then update `.claude-plugin/plugin.json`:
```json
{
  "name": "kimi-review",
  "version": "1.0.0",
  "description": "...",
  "hooks": "./hooks/hooks.json"
}
```

---

## Plugin Loading Methods

### Method 1: Development (`--plugin-dir`)

**How it works:**
- Claude reads plugin directly from source directory
- No installation or copying needed
- Changes apply immediately

**Command:**
```bash
claude --plugin-dir ~/Projects/kimi-review-plugin
```

**Discovery process:**
1. Claude looks for `.claude-plugin/plugin.json`
2. Validates manifest
3. Discovers skills in `skills/`
4. Registers hooks from `hooks.json`
5. Makes skills available as `/kimi-review:<name>`

**Testing:**
```bash
cd /tmp/test-repo
claude --plugin-dir ~/Projects/kimi-review-plugin -p "list kimi-review skills"
```

**Output:**
```
The kimi-review plugin has 5 skills:
- kimi-review:review
- kimi-review:adversarial-review
- kimi-review:status
- kimi-review:result
- kimi-review:cancel
```

---

### Method 2: User Install (Cache)

**How it works:**
- Plugin copied to `~/.claude/plugins/cache/`
- Auto-discovered on every Claude session
- No `--plugin-dir` flag needed

**Installation:**
```bash
mkdir -p ~/.claude/plugins/cache/local/kimi-review/1.0.0
cp -r ~/Projects/kimi-review-plugin/* ~/.claude/plugins/cache/local/kimi-review/1.0.0/
```

**Discovery process:**
1. Claude scans `~/.claude/plugins/cache/*/` on startup
2. Reads each plugin's `.claude-plugin/plugin.json`
3. Loads enabled plugins (from `installed_plugins.json`)
4. Registers skills automatically

**Usage:**
```bash
claude  # No flag needed
> /kimi-review:review
```

---

### Method 3: Project Install (Team-Shared)

**How it works:**
- Plugin in project's `.claude/plugins/cache/`
- Team shares via git
- Auto-discovered when working in that project

**Installation:**
```bash
cd ~/Projects/your-project
mkdir -p .claude/plugins/cache/local/kimi-review/1.0.0
cp -r ~/Projects/kimi-review-plugin/* .claude/plugins/cache/local/kimi-review/1.0.0/
git add .claude/plugins/
git commit -m "Add Kimi review plugin"
```

---

## Skill Registration

### From Plugin Name to Slash Command

**Plugin manifest:**
```json
{ "name": "kimi-review" }
```

**Skill file:**
```
skills/review/SKILL.md
```

**Registered as:**
```
/kimi-review:review
```

**Pattern:** `/<plugin-name>:<skill-name>`

---

## How Skills Execute

### 1. User Invokes Skill

```bash
/kimi-review:review --staged
```

### 2. Claude Reads SKILL.md

```markdown
---
name: review
allowed-tools:
  - Bash(*)
---

Arguments passed: $ARGUMENTS

Execute:
bash
node ~/Projects/kimi-review-plugin/scripts/kimi-companion.mjs review $ARGUMENTS
```

### 3. Claude Executes Script

Claude runs the Bash command with the user's arguments:
```bash
node ~/Projects/kimi-review-plugin/scripts/kimi-companion.mjs review --staged
```

### 4. Script Returns Output

Script handles all logic:
- Git diff extraction
- Kimi CLI invocation
- Output parsing
- Result presentation

### 5. Claude Presents Results

Claude presents the script output **verbatim** (no paraphrasing per skill instructions).

---

## Plugin Metadata Storage

### Installed Plugins Registry

**Location:** `~/.claude/plugins/installed_plugins.json`

**Format:**
```json
{
  "version": 2,
  "plugins": {
    "kimi-review@local": [
      {
        "scope": "user",
        "installPath": "~/.claude/plugins/cache/local/kimi-review/1.0.0",
        "version": "1.0.0",
        "installedAt": "2026-04-03T...",
        "lastUpdated": "2026-04-03T..."
      }
    ]
  }
}
```

**Purpose:**
- Tracks which plugins are enabled
- Stores install paths and versions
- Used for plugin updates

---

## Comparison: Old vs New Structure

### Old (Custom, Not Recognized)

```
kimi-review-plugin/
├── package.json
│   └── claudeCode.skills: {
│         "kimi:review": { handler: "scripts/kimi-companion.mjs" }
│       }
├── hooks.json (at root)
└── skills/
    └── kimi-result-handling.md (single file)
```

**Problems:**
- `claudeCode.skills` in `package.json` not recognized
- No `.claude-plugin/plugin.json` manifest
- Skills not in `<name>/SKILL.md` format
- Validation fails

---

### New (Standard, Validated ✅)

```
kimi-review-plugin/
├── .claude-plugin/
│   └── plugin.json              ✅ Required manifest
├── skills/
│   ├── review/SKILL.md          ✅ Standard format
│   ├── adversarial-review/SKILL.md
│   ├── status/SKILL.md
│   ├── result/SKILL.md
│   └── cancel/SKILL.md
└── hooks.json (should move to hooks/)
```

**Benefits:**
- Validated by `claude plugins validate`
- Auto-discovered with `--plugin-dir`
- Skills appear in `/skill-name` listings
- Compatible with plugin marketplace

---

## Testing Plugin Discovery

### 1. Validate Manifest

```bash
claude plugins validate ~/Projects/kimi-review-plugin
```

**Expected:**
```
✔ Validation passed
```

---

### 2. List Skills

```bash
claude --plugin-dir ~/Projects/kimi-review-plugin -p "list kimi-review skills"
```

**Expected:**
```
5 skills:
- kimi-review:review
- kimi-review:adversarial-review
- kimi-review:status
- kimi-review:result
- kimi-review:cancel
```

---

### 3. Invoke Skill

```bash
cd /tmp/test-repo  # Git repo with changes
claude --plugin-dir ~/Projects/kimi-review-plugin
> /kimi-review:review --wait
```

**Expected:**
- Git diff extracted
- Kimi CLI invoked
- Structured findings returned
- Results presented

---

## Key Insights

### 1. Manifest is Required
Without `.claude-plugin/plugin.json`, the plugin **will not be discovered**.

### 2. Skills Must Use Directory Structure
- ❌ `skills/review.md` (wrong)
- ✅ `skills/review/SKILL.md` (correct)

### 3. Skill Naming Convention
- Plugin name: `kimi-review`
- Skill name: `review`
- Slash command: `/kimi-review:review`

### 4. Development vs Production
- **Development:** `--plugin-dir` for instant updates
- **Production:** Install to cache for persistent access

### 5. Validation Before Distribution
Always run before sharing:
```bash
claude plugins validate <plugin-dir>
```

---

## Current Plugin Status

✅ **Manifest validated**
✅ **5 skills discovered**
✅ **Plugin loads with `--plugin-dir`**
✅ **Ready for testing**

**Next action:** Test a real review in a project with changes.

---

## References

- **Plugin validation:** `claude plugins validate <path>`
- **List installed:** `claude plugins list`
- **Development mode:** `claude --plugin-dir <path>`
- **Installed plugins:** `~/.claude/plugins/installed_plugins.json`
- **Cache location:** `~/.claude/plugins/cache/`

---

## Summary

Claude Code discovers plugins through:
1. **Manifest** (`.claude-plugin/plugin.json`) - Required
2. **Skills** (`skills/<name>/SKILL.md`) - Auto-discovered
3. **Hooks** (`hooks/hooks.json`) - Optional

Load methods:
- **Dev:** `--plugin-dir` (instant, no install)
- **User:** `~/.claude/plugins/cache/` (persistent)
- **Project:** `.claude/plugins/cache/` (team-shared)

**Kimi review plugin is fully configured and ready to use.**
