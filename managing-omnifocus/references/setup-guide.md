# Setup & First Use

## MCP Server Not Available

If OmniFocus MCP tools (OmniFocus:database_overview, OmniFocus:query_omnifocus, etc.) are not available when the user asks about tasks:

1. Tell the user: "The OmniFocus MCP server isn't connected yet. Let me help you set it up."
2. Guide them through installation:
   - Add to Claude MCP settings:
     ```json
     {"mcpServers": {"omnifocus": {"command": "npx", "args": ["-y", "github:mattsmallman/omnifocus-mcp"]}}}
     ```
   - Ensure OmniFocus is running on macOS
   - Restart Claude to pick up the new MCP server
3. After setup, verify by calling OmniFocus:database_overview

## First Use (MCP available, no user context)

If [user-context.md](user-context.md) is empty/missing or has only the template placeholders (copy `user-context.template.md` → `user-context.md` on first use):

1. **Always complete the user's immediate request first** — never block their workflow for setup
2. After completing their task, mention: "I don't have your OmniFocus preferences saved yet. Want to do a quick setup so I can help you more effectively?"
3. If they agree:
   - Run OmniFocus:database_overview to get current structure
   - Ask about their workflow:
     - How do you plan your day? (morning review, perspectives, flags?)
     - What are your tag conventions? (contexts, energy, waiting-for?)
     - How do you use dates? (due = hard deadline, defer = start date, planned = intention?)
     - How often do you review? (weekly, daily, ad-hoc?)
   - Write answers + structure snapshot to [user-context.md](user-context.md)
4. If they decline or are busy, keep working without context — learn from observation instead
5. Build context gradually over time from how they actually use the tools

## Context Maintenance

On each activation:
1. Read [user-context.md](user-context.md) for cached structure + preferences
2. Only call OmniFocus:database_overview when real-time stats are needed (overdue counts, inbox size, etc.)
3. Use OmniFocus:query_omnifocus for specific task data — always with filters and field limits
4. Offer to refresh the context snapshot after structural changes (new projects, folder reorgs, tag changes)
