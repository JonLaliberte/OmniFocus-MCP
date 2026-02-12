# Query Reference

## Task Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier |
| `name` | Task name |
| `note` | Notes/description |
| `flagged` | Boolean flag status |
| `taskStatus` | "Next", "Available", "Blocked", "DueSoon", "Overdue" |
| `dueDate` | Due date (ISO format) |
| `deferDate` | Defer/start date |
| `plannedDate` | Planned date (OF 4.7+) |
| `effectiveDueDate` | Inherited or set due date |
| `effectiveDeferDate` | Inherited or set defer date |
| `completionDate` | When completed |
| `estimatedMinutes` | Time estimate |
| `tagNames` | Array of tag names |
| `projectName` | Containing project name |
| `projectId` | Containing project ID |
| `parentId` | Parent task ID (subtasks) |
| `childIds` | Child task IDs |
| `hasChildren` | Has subtasks |
| `inInbox` | In inbox |
| `modificationDate` | Last modified |
| `creationDate` | Created date |

## Project Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier |
| `name` | Project name |
| `status` | "Active", "OnHold", "Done", "Dropped" |
| `note` | Project notes |
| `folderName` | Containing folder |
| `sequential` | Tasks in order |
| `dueDate` | Project due date |
| `deferDate` | Project defer date |
| `taskCount` | Number of tasks |
| `tasks` | Array of task IDs |

## Folder Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier |
| `name` | Folder name |
| `path` | Full path |
| `status` | "Active", "Dropped" |
| `projectCount` | Number of projects |
| `projects` | Array of project IDs |
| `subfolders` | Array of subfolder IDs |

## Filter Logic

**Between filters**: AND logic (all must match)
**Within array filters**: OR logic (any can match)

```json
{
  "filters": {
    "flagged": true,              // AND
    "status": ["Next", "Available"], // Next OR Available
    "tags": ["work", "urgent"]    // has work OR urgent
  }
}
```

## Filter Behaviours

| Filter | Behaviour |
|--------|-----------|
| `projectName` | Case-insensitive partial match. Use "inbox" for inbox |
| `tags` | Exact match, case-sensitive. OR logic between tags |
| `status` | Exact match. OR logic between statuses |
| `dueWithin` | Tasks due from now to N days ahead |
| `plannedWithin` | Tasks planned from now to N days ahead |
| `deferredUntil` | Tasks becoming available within N days |
| `hasNote` | true = has note, false = no note |
| `flagged` | true/false |

## Sort Options

Sort by any field:
- `name` - Alphabetical
- `dueDate` - By due date (nulls last)
- `deferDate` - By defer date
- `plannedDate` - By planned date
- `modificationDate` - By last modified
- `creationDate` - By creation time
- `estimatedMinutes` - By estimate
- `taskStatus` - Groups by status

Use `sortOrder`: "asc" or "desc"

## Response Format

All read tools (`query_omnifocus`, `database_overview`, `get_perspective_view`, `list_perspectives`) return TOON (Token-Oriented Object Notation) — a compact, schema-aware format that uses ~40% fewer tokens than JSON. Write tools return text confirmations.

Example `query_omnifocus` response (uniform fields → tabular):
```
count: 2
items[2]{id,name,flagged,projectName}:
  abc,Buy milk,true,Errands
  def,Review report,false,Work
```

Example with non-uniform fields (some items have extra fields → indented list):
```
count: 2
items[2]:
  - id: abc
    name: Buy milk
    flagged: true
    dueDate: "2025-03-15T00:00:00Z"
    projectName: Errands
  - id: def
    name: Review report
    projectName: Work
```

Null, undefined, and empty values are stripped from items to save tokens.
