# Claude Code Infrastructure Audit & Token Optimization

Use this prompt in a fresh Claude Code session. It will analyze the current setup, identify waste, test all hooks/MCP integrations, and produce a concrete optimization plan.

---

## Prompt (copy everything below this line)

---

You are auditing this project's Claude Code infrastructure for token efficiency and correctness. Your goal: maximize output quality per token spent. Do NOT make changes — only analyze and report. Be ruthless about waste.

## Phase 1: Inventory (read-only, ~5 tool calls)

Read these files and note their byte sizes:

1. `~/.claude/settings.json` — global settings (hooks, permissions, deny lists)
2. `.claude/settings.local.json` — project-local permissions
3. `~/.claude/CLAUDE.md` — global instructions
4. `CLAUDE.md` — project instructions (references PRODUCT.md, ARCHITECTURE.md, AGENTS.md via @-includes)
5. `PRODUCT.md` — product vision
6. `ARCHITECTURE.md` — codebase map
7. `AGENTS.md` — Next.js gotchas

Then run: `claude mcp list` to verify MCP server status.
Then run: `npx agnix --target claude-code .` to get config lint results.

## Phase 2: Token Cost Analysis

Every session loads these into context automatically. Calculate the cost:

| File | Bytes | Est. Tokens (÷4) | Loaded when? | Avoidable? |
|------|-------|-------------------|--------------|------------|

For reference, the current file sizes are approximately:
- `CLAUDE.md`: ~12KB (~3000 tokens)
- `PRODUCT.md`: ~10KB (~2500 tokens)
- `ARCHITECTURE.md`: ~10KB (~2500 tokens)
- `AGENTS.md`: ~1.6KB (~400 tokens)
- `~/.claude/CLAUDE.md`: ~6.6KB (~1650 tokens)
- Total @-included context: ~40KB (~10,000 tokens per session start)

agnix recommends max 1500 tokens for CLAUDE.md. The current file is 2x over.

Evaluate each file against these questions:
- What percentage of this file is relevant to the AVERAGE task? (Most tasks don't touch economics, council protocol, or payout math)
- What content is duplicated between files?
- What content could be moved to on-demand loading (hooks that inject when touching specific files)?
- What content is stale or no longer true?
- Are critical instructions placed in the "lost in the middle" zone (40-60% of document)?

## Phase 3: Hook Efficiency Analysis

The global settings.json has these hook chains:

**SessionStart (1 hook):** Reads git status + memory files, injects session context.
- Evaluate: Is the output useful? Is it too long? Does it actually get read?

**PreToolUse — Bash matcher (2 hooks):**
- rm -rf blocker (regex-based)
- git push to main/master blocker
- Evaluate: Do these fire on EVERY Bash call? What's the overhead per invocation?

**PreToolUse — Edit|Write matcher (1 hook):**
- File classification: economics → council, API → council, actions → high-risk, migrations → safety, AI → fallback reminder, landing → read INTELLIGENCE.md, UI → read DESIGN.md
- Evaluate: This fires on EVERY edit. Is the cascade of grep checks efficient? Could it be simplified?

**PostToolUse — no matcher (1 hook):**
- Tool counter (increments /tmp file, warns at 40/60/80)
- Evaluate: Fires on EVERY tool use. Is file I/O per tool call the right approach?

**PostToolUse — Edit|Write matcher (2 hooks):**
- ESLint on .ts/.tsx files (15s timeout)
- Edit counter (warns at 8 edits to run tests)
- Evaluate: ESLint runs `npx eslint` which has cold-start cost. Is 15s timeout enough? Is linting every edit worth the latency?

**PreCompact / PostCompact (1 each):**
- Handoff reminder / re-orientation instructions
- Evaluate: These are critical safety nets. Are the instructions clear enough?

**Permission deny list (25 rules):**
- Destructive commands, credential file reads, shell config edits
- Evaluate: Are any rules redundant with each other or with the PreToolUse hooks?

For each hook, answer:
1. How often does it fire per session? (estimate)
2. What latency does it add? (shell overhead + command execution)
3. Does it produce useful output, or noise that gets ignored?
4. Could it be combined with another hook to reduce total invocations?

## Phase 4: MCP Server Analysis

Three MCP servers are configured:
1. **Exa** (HTTP, hosted) — web search, code search, crawling. Connected.
2. **Supabase** (HTTP, hosted, read-only) — DB operations. Needs auth.
3. **Basic Memory** (stdio, local) — durable markdown knowledge graph. Connected.

For each:
- What tools does it expose? (run `/mcp` if available, or estimate from docs)
- How many tokens does each tool's schema add to the system prompt?
- When would each tool actually get used in a typical VLDTA session?
- Is the token cost of having it loaded justified by how often it's used?

Key question: **MCP tool schemas are loaded into context at session start.** If a server exposes 20 tools, that's 20 tool definitions eating context even if you never use them. Is Basic Memory's ~20 tools worth the context cost for a project that already has a manual memory system?

## Phase 5: Redundancy & Conflict Detection

Check for:
1. **Duplicate permissions** — `settings.json` allows Edit/Write globally AND `settings.local.json` also allows Edit/Write. Is this redundant?
2. **Conflicting rules** — `settings.local.json` allows `Bash(rm:*)` but `settings.json` denies `Bash(rm -rf *)`. Does deny take precedence? Test this.
3. **Instruction duplication** — Content repeated between global CLAUDE.md and project CLAUDE.md
4. **Hook overlap** — The rm -rf deny rule AND the rm -rf PreToolUse hook both exist. Is the hook redundant with the deny rule?
5. **Stale references** — Do any hooks reference files or paths that don't exist?

## Phase 6: Functional Tests

Run these tests to verify hooks and integrations actually work:

### Test 1: rm -rf blocker
```bash
# Should be blocked by deny rule OR PreToolUse hook
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /tmp/test-dir"}}' | bash -c "$(jq -r '.hooks.PreToolUse[0].hooks[0].command' ~/.claude/settings.json)"
```
Expected: BLOCKED message.

### Test 2: git push main blocker
```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git push origin main"}}' | bash -c "$(jq -r '.hooks.PreToolUse[0].hooks[1].command' ~/.claude/settings.json)"
```
Expected: BLOCKED message.

### Test 3: Edit file classification
```bash
# Test economics file detection
CLAUDE_FILE_PATH="src/lib/defaults.ts" bash -c "$(jq -r '.hooks.PreToolUse[1].hooks[0].command' ~/.claude/settings.json)" < /dev/null
```
Expected: COUNCIL REQUIRED message.

```bash
# Test UI file detection
CLAUDE_FILE_PATH="src/components/dashboard/Sidebar.tsx" bash -c "$(jq -r '.hooks.PreToolUse[1].hooks[0].command' ~/.claude/settings.json)" < /dev/null
```
Expected: UI EDIT message.

```bash
# Test non-special file (should suppress)
CLAUDE_FILE_PATH="src/lib/utils.ts" bash -c "$(jq -r '.hooks.PreToolUse[1].hooks[0].command' ~/.claude/settings.json)" < /dev/null
```
Expected: suppressOutput.

### Test 4: Tool counter
```bash
echo 0 > /tmp/claude-tool-count.txt
for i in $(seq 1 41); do
  bash -c "$(jq -r '.hooks.PostToolUse[0].hooks[0].command' ~/.claude/settings.json)" < /dev/null 2>/dev/null
done
```
Expected: Warning message at iteration 40.

### Test 5: MCP server connectivity
```bash
claude mcp list
```
Expected: Exa ✓, Supabase ! (needs auth), Basic Memory ✓.

### Test 6: agnix validation
```bash
npx agnix --target claude-code .
```
Note total errors and warnings.

## Phase 7: Optimization Recommendations

Based on all findings, produce a ranked list of changes:

### Format for each recommendation:

```
## [Priority: HIGH/MEDIUM/LOW] — [Title]

**Token savings:** ~X tokens per session
**Risk:** [none/low/medium]
**Implementation:** [1-sentence description]

**Why:** [Evidence from your analysis]
```

### Categories to consider:

1. **CLAUDE.md surgery** — What to cut, what to move to on-demand hooks, what to restructure for "lost in the middle" avoidance
2. **Hook consolidation** — Can any hooks be merged? Can any be removed because deny rules handle the same case?
3. **MCP tool pruning** — Should any servers be scoped to fewer tools? Should any be removed?
4. **Permission cleanup** — Remove redundant allows/denies
5. **On-demand loading** — Content currently loaded every session that could be loaded only when relevant files are touched
6. **@-include optimization** — Should PRODUCT.md and ARCHITECTURE.md really be @-included (loaded every session) or should they be on-demand?

### Constraints:
- Safety hooks (rm -rf, push-to-main, credential blocking) are non-negotiable. Don't recommend removing them.
- The council protocol, context warnings, and handoff system are critical. Optimize their token footprint, don't remove them.
- MCP servers were deliberately chosen — recommend scoping/pruning, not wholesale removal unless truly wasteful.

## Deliverable

End with a single summary table:

| Change | Tokens saved/session | Implementation effort | Risk |
|--------|---------------------|----------------------|------|
| ... | ... | ... | ... |
| **Total** | **~X tokens** | | |

And a final verdict: "Current setup is [X]% token-efficient. With these changes, it would be [Y]%."
