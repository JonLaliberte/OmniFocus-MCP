---
name: managing-omnifocus
description: "ALWAYS activate this skill before calling any OmniFocus MCP tools. Provides the decision tree, workflow patterns, and coaching behaviour required for effective OmniFocus tool use. Covers: viewing, adding, editing, moving, or deleting tasks and projects; processing inbox; performing reviews; querying by status, due date, tags, or project; batch operations; perspectives; task hierarchies; creating projects from documents or transcripts; GTD workflows. Triggers: OmniFocus, tasks, projects, inbox, GTD, to-do, review, flagged, due, defer, planned date, action items, next actions."
---

# OmniFocus

Proactive task management through OmniFocus MCP tools — not just executing commands, but actively helping the user stay on top of their commitments.

On activation: read [user-context.md](references/user-context.md) for cached preferences and structure. If empty, see [setup guide](references/setup-guide.md). For coaching behaviour, see [coaching](references/coaching.md).

## Decision Tree

```
User request about tasks/projects?
├─ QUERY (view/find/show/list/count)
│   ├─ Overview/structure? → OmniFocus:database_overview
│   ├─ Specific criteria? → OmniFocus:query_omnifocus with filters
│   └─ Perspective view? → OmniFocus:get_perspective_view
│
├─ CREATE (add/create/make)
│   ├─ Single task → OmniFocus:add_task
│   ├─ Single project → OmniFocus:add_project
│   ├─ Folder → OmniFocus:add_folder
│   └─ Multiple items → OmniFocus:batch_add_items (10x faster)
│
├─ MODIFY (edit/update/change/complete/flag)
│   ├─ Single item → OmniFocus:edit_item
│   └─ Multiple items → OmniFocus:batch_edit_items (10-45x faster)
│
├─ MOVE (move/reorganise/make subtask)
│   ├─ Single task → OmniFocus:move_task
│   └─ Multiple tasks → OmniFocus:batch_move_tasks (10x faster)
│
├─ DELETE (remove/delete)
│   ├─ Task/project → OmniFocus:remove_item
│   ├─ Folder → OmniFocus:remove_folder
│   └─ Multiple → OmniFocus:batch_remove_items
│
├─ PERSPECTIVES
│   ├─ List available → OmniFocus:list_perspectives
│   └─ View contents → OmniFocus:get_perspective_view
│
└─ WORKFLOWS (MCP Prompts — if client supports them)
    ├─ Daily planning → daily-plan prompt
    ├─ Weekly review → weekly-review prompt
    ├─ Process inbox → inbox-zero prompt
    ├─ Project audit → project-health prompt
    └─ Find tasks → available-tasks prompt (with time/context params)
```

## Core Patterns

### Querying
```json
{"entity": "tasks", "filters": {"flagged": true, "dueWithin": 7}, "sortBy": "dueDate"}
{"entity": "tasks", "filters": {"projectName": "inbox"}}
{"entity": "tasks", "filters": {"status": ["Overdue"]}, "summary": true}
```

Key filters: `status`, `dueWithin`, `plannedWithin`, `flagged`, `tags`, `projectName`

### Batch Operations
```json
{"items": [
  {"type": "task", "name": "Parent", "projectName": "My Project", "tempId": "p1"},
  {"type": "task", "name": "Subtask", "parentTempId": "p1"}
]}
```

### Status Values
- Tasks: `Next`, `Available`, `Blocked`, `DueSoon`, `Overdue`, `Completed`, `Dropped`
- Projects: `Active`, `OnHold`, `Done`, `Dropped`

### Tags
```json
{"addTags": ["urgent"]}
{"removeTags": ["someday"]}
{"replaceTags": ["new", "tags"]}
```

### Dates
- ISO format: `"2025-03-15T09:00:00Z"`
- Clear a date: `"newDueDate": ""`

### Moving Tasks
- To project: `{"toProjectName": "Project"}`
- To inbox: `{"toInbox": true}`
- As subtask: `{"toTaskName": "Parent Task"}`

## Verification

After create/edit/move/delete operations, verify the result:
- Use `OmniFocus:query_omnifocus` with filters to confirm items exist with expected properties
- For batch operations, check the result count matches expected — if not, review error details
- After structural changes (new folders/projects), use `OmniFocus:database_overview` to confirm hierarchy

## Performance Tips

1. **Start with context** — read [user-context.md](references/user-context.md) (zero API calls)
2. **OmniFocus:database_overview for stats** — when real-time counts are needed
3. **OmniFocus:query_omnifocus for details** — always use `fields` + `limit`
4. **Use `summary: true`** — for counts only
5. **Batch operations** — 10-45x faster than sequential
6. **Read tools return TOON** — compact, schema-aware format (~40% fewer tokens than JSON). Parse fields directly from indentation-based structure. Uniform arrays use CSV-style tabular rows.
7. **Annotations** — read tool results include two content blocks: a user-facing summary (`audience: ["user"]`) and the full TOON data (`audience: ["assistant"]`). Process the assistant-targeted block for data; the user block is a display hint.

## References

- [Query Reference](references/query-reference.md) - Complete filter and field documentation
- [Workflow Examples](references/workflow-examples.md) - GTD workflow patterns
- [Coaching](references/coaching.md) - Proactive coaching and observation behaviour
- [Setup Guide](references/setup-guide.md) - MCP server setup and first-use onboarding
- [User Context](references/user-context.md) - Persistent user preferences and structure
