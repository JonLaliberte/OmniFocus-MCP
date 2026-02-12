# OmniFocus MCP Server

A Model Context Protocol (MCP) server that gives AI assistants full access to your OmniFocus task management system — querying, creating, editing, moving, and deleting tasks and projects through natural language.

Originally forked from [themotionmachine/OmniFocus-MCP](https://github.com/themotionmachine/OmniFocus-MCP). This is a ground-up rewrite with a new execution engine, token-optimised output, batch operations, an agent skill, and 16 tools.

![OmniFocus MCP](assets/omnifocus-mcp-logo.png)

## What's Changed from the Original

| Area | Original Fork | This Version |
|------|--------------|--------------|
| **Automation engine** | AppleScript, temp files, new process per call | OmniJS via persistent `osascript` PTY bridge — 200-800ms per call after warmup |
| **Database access** | `dump_database` (entire DB as text blob) | `database_overview` (stats + tree) + `query_omnifocus` (filtered, field-selected) |
| **Output format** | Unstructured text | [TOON](https://github.com/toon-format/toon) — ~40% fewer tokens than JSON, better LLM parsing accuracy |
| **Tools** | 5 basic tools | 16 tools including batch operations (10-45x faster), folder management, perspectives, reviews |
| **Agent skill** | None | Full [Agent Skill](https://agentskills.io/) with decision tree, GTD coaching, workflow patterns |
| **MCP prompts** | None | 5 predefined workflows: daily plan, weekly review, inbox zero, project health, available tasks |
| **Annotations** | None | Tool results split user-facing summaries from model-facing data |
| **Error handling** | Basic | JSON sanitization (UTF-16 surrogates), 30s execution timeouts, graceful bridge recovery |

## What You Can Do With It

- Turn a PDF syllabus into a fully specified project with tasks, tags, defer dates, and due dates
- Process a meeting transcript into action items assigned to projects
- Run a GTD weekly review — inbox processing, stale task triage, project health checks
- Bulk-edit dozens of tasks in a single operation (flags, dates, tags, status)
- Query your database with complex filters: overdue + flagged + tagged "work" + due within 7 days
- Visualise your task landscape with charts and summaries

## Quick Start

### Prerequisites
- macOS with OmniFocus installed

### Installation

Add to your Claude configuration:
```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "github:mattsmallman/omnifocus-mcp"]
    }
  }
}
```

### Agent Skill (Recommended)

The agent skill teaches Claude *how* to use the tools effectively — decision trees, GTD coaching, workflow patterns, and query optimisation. Without it, Claude will use the tools but won't have the context to choose the right tool or structure efficient queries.

**Claude Desktop / claude.ai:**
```bash
npm run build  # produces managing-omnifocus.skill
```
Upload `managing-omnifocus.skill` in Settings > Features > Agent Skills.

**Claude Code:**
```bash
# Global (available in all projects)
mkdir -p ~/.claude/skills
ln -s /path/to/OmniFocus-MCP/managing-omnifocus ~/.claude/skills/managing-omnifocus
```

## Architecture

### Persistent OmniJS Bridge

Unlike the original fork (which spawned a new `osascript` process per call with temp files), this server maintains a persistent `osascript -l JavaScript -i` process via a Python PTY wrapper. The first call warms up the bridge (~5s), then subsequent calls complete in 200-800ms. Scripts are piped directly to stdin — no temp files written.

### TOON Output Format

Read tools return results in [TOON (Token-Oriented Object Notation)](https://github.com/toon-format/toon) instead of JSON. TOON uses ~40% fewer tokens while improving LLM parsing accuracy. Uniform arrays of tasks/projects compress into CSV-style tabular rows with the schema declared once:

```
count: 3
items[3]{id,name,flagged,dueDate,projectName}:
  abc,Buy groceries,false,2026-02-15,Errands
  def,Call dentist,true,2026-02-13,Health
  ghi,Review report,false,,Work
```

Write tools return plain text confirmations.

### Annotations

All read tool results include [MCP annotations](https://modelcontextprotocol.io/specification/2025-11-05/server/utilities/annotations) that split the response into two content blocks:

- **User-facing summary** (`audience: ["user"]`, `priority: 1`) — e.g. "Found 12 tasks."
- **Model-facing data** (`audience: ["assistant"]`, `priority: 0.5`) — full TOON-encoded results

Clients that support annotations can display the clean summary to the user while the model processes the full dataset. Clients that don't support annotations show both (current default behaviour).

### Batch Operations

All batch tools (`batch_add_items`, `batch_edit_items`, `batch_move_tasks`, `batch_remove_items`) execute as a single OmniJS script rather than sequential calls. This gives 10-45x speedups depending on item count. `batch_add_items` supports parent-child hierarchies via `tempId`/`parentTempId` references.

## Tools

### Reading

| Tool | Purpose |
|------|---------|
| `database_overview` | Stats (overdue, flagged, inbox counts) + folder/project tree. No individual tasks. |
| `query_omnifocus` | Filtered queries with field selection, sorting, limits. Supports tasks, projects, folders. |
| `list_perspectives` | List built-in and custom perspectives. |
| `get_perspective_view` | Get items visible in a specific perspective. |

### Writing

| Tool | Purpose |
|------|---------|
| `add_task` | Add a single task with project, dates, tags, parent task. |
| `add_project` | Add a project with folder, dates, sequential/parallel. |
| `add_folder` | Create a folder, optionally nested. |
| `edit_item` | Edit any property of a task or project. |
| `edit_folder` | Rename or move a folder. |
| `move_task` | Move a task between projects, to inbox, or as subtask. |
| `remove_item` | Permanently delete a task or project. |
| `remove_folder` | Permanently delete a folder. |

### Batch Operations

| Tool | Purpose | Speedup |
|------|---------|---------|
| `batch_add_items` | Add multiple tasks/projects with hierarchy support. | 10x |
| `batch_edit_items` | Edit multiple items at once. | 10-45x |
| `batch_move_tasks` | Move multiple tasks to the same destination. | 10x |
| `batch_remove_items` | Remove multiple items. | 10x |

## MCP Prompts

Predefined workflow templates that clients can surface as selectable actions. No need to remember tool names or query syntax — pick a prompt and the workflow runs.

| Prompt | Description |
|--------|-------------|
| `daily-plan` | Morning planning: overdue, due today, flagged, planned tasks, inbox check |
| `weekly-review` | Full GTD weekly review: Get Clear, Get Current, Get Creative |
| `inbox-zero` | Walk through inbox items one by one, process to projects |
| `project-health` | Audit all projects for stalled, overdue, or review-due issues |
| `available-tasks` | Find tasks matching your current context (optional: time available, tag filter) |

## Agent Skill

The `managing-omnifocus/` directory is a standalone [Agent Skill](https://agentskills.io/) that provides:

- **Decision tree** — routes requests to the right tool
- **GTD coaching** — proactive task management, health signals, capture prompts
- **Workflow patterns** — daily planning, inbox processing, weekly review
- **Query reference** — complete filter, field, and sort documentation
- **Setup guide** — first-use onboarding
- **Persistent user context** — cached preferences and structure

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

This project was originally based on [themotionmachine/OmniFocus-MCP](https://github.com/themotionmachine/OmniFocus-MCP). Thanks to the original authors for the foundation that this project built upon.
