# Workflow Examples

## Getting Oriented

### Database Overview
```json
// Get stats and folder/project structure (no individual tasks)
// Tool: OmniFocus:database_overview
{"includeStats": true, "includeTree": true}
```

### Quick Counts
```json
// Tool: OmniFocus:query_omnifocus
{"entity": "tasks", "filters": {"status": ["Overdue"]}, "summary": true}
```

## Daily Review & Planning

GTD daily engagement: check calendar, process inbox, review actions, choose work based on context/time/energy/priority.

Checklist — copy and track progress:
```
MORNING
- [ ] Check calendar — what's on today? Any hard-landscape commitments?
- [ ] Process inbox to zero — clarify and organise anything that landed overnight
- [ ] Review overdue & due-today — handle or consciously reschedule
- [ ] Scan flagged / planned-for-today — confirm today's intentions
- [ ] Glance at upcoming calendar (next 2-3 days) — anything to prepare for?

DURING THE DAY
- [ ] Choose actions by context, time available, energy, and priority
- [ ] Capture anything new into inbox immediately — don't hold it in your head

END OF DAY
- [ ] Quick inbox sweep — process any items that accumulated
- [ ] Check tomorrow's calendar — anything to prepare tonight?
- [ ] Capture any loose ends before closing out
```

### Morning: Calendar & Hard Landscape
```json
// Overdue + due today + flagged — your non-negotiables
{"entity": "tasks", "filters": {"status": ["DueSoon", "Overdue"]}, "sortBy": "dueDate", "fields": ["name", "dueDate", "projectName", "estimatedMinutes", "flagged"], "limit": 25}
```

### Morning: Planned for Today
```json
// Tasks you've intentionally planned for today
{"entity": "tasks", "filters": {"plannedWithin": 0, "status": ["Next", "Available"]}, "sortBy": "plannedDate", "fields": ["name", "plannedDate", "projectName", "estimatedMinutes"]}
```

### Morning: Process Inbox
```json
// View inbox items
{"entity": "tasks", "filters": {"projectName": "inbox"}, "fields": ["id", "name", "flagged", "dueDate", "tagNames"]}

// Then move to projects via OmniFocus:batch_move_tasks
```

### Morning: Upcoming Calendar Check
```json
// What's due in the next 3 days? Anything to prepare for?
{"entity": "tasks", "filters": {"dueWithin": 3, "status": ["Next", "Available", "DueSoon"]}, "sortBy": "dueDate", "fields": ["name", "dueDate", "projectName"]}
```

### During Day: Choose by Context
```json
// Available actions for a given context (adjust tag to match your system)
{"entity": "tasks", "filters": {"tags": ["calls"], "status": ["Next", "Available"]}, "fields": ["name", "projectName", "estimatedMinutes"], "sortBy": "dueDate"}
```

### End of Day: Quick Sweep
```json
// Anything left in inbox?
{"entity": "tasks", "filters": {"projectName": "inbox"}, "summary": true}

// Tomorrow's due items
{"entity": "tasks", "filters": {"dueWithin": 1}, "sortBy": "dueDate", "fields": ["name", "dueDate", "projectName"]}
```

## Weekly Review

Follows the GTD Weekly Review: Get Clear, Get Current, Get Creative.

Checklist — copy and track progress:
```
GET CLEAR
- [ ] Process inbox to zero
- [ ] Empty your head — capture any uncaptured projects, actions, waiting-for's, someday/maybe's

GET CURRENT
- [ ] Review action lists — mark off completed, add new next actions
- [ ] Review past calendar — capture any remaining actions or reference
- [ ] Review upcoming calendar — capture actions triggered by upcoming events
- [ ] Review Waiting For list — follow up where needed, check off received
- [ ] Review projects — ensure each has at least one next action
- [ ] Review stale/stuck tasks
- [ ] Mark projects reviewed

GET CREATIVE
- [ ] Review Someday/Maybe — activate any that are now ready, delete dead ones
- [ ] Capture any new ideas, projects, or wild possibilities
```

### GET CLEAR: Process Inbox
```json
// View inbox items
{"entity": "tasks", "filters": {"projectName": "inbox"}, "fields": ["id", "name", "flagged", "dueDate", "tagNames"]}

// Then move to projects via OmniFocus:batch_move_tasks
```

### GET CURRENT: Review Action Lists
```json
// Completed tasks to mark off
{"entity": "tasks", "filters": {"status": ["Completed"]}, "includeCompleted": true, "sortBy": "completionDate", "sortOrder": "desc", "limit": 20, "fields": ["name", "projectName", "completionDate"]}
```

### GET CURRENT: Review Waiting For
```json
// Tasks tagged as waiting-for (adjust tag name to match your conventions)
{"entity": "tasks", "filters": {"tags": ["waiting-for"], "status": ["Available", "Blocked"]}, "fields": ["name", "projectName", "dueDate", "modificationDate"]}
```

### GET CURRENT: Review Projects
```json
// All active projects with task counts — look for any with 0 tasks (stalled)
{"entity": "projects", "filters": {"status": ["Active"]}, "fields": ["name", "taskCount", "folderName", "dueDate", "nextReviewDate"], "sortBy": "dueDate"}
```

### GET CURRENT: Stale Tasks
```json
// Tasks untouched the longest — still relevant?
{"entity": "tasks", "filters": {"status": ["Available", "Blocked"]}, "sortBy": "modificationDate", "sortOrder": "asc", "limit": 30, "fields": ["name", "projectName", "modificationDate"]}
```

### GET CURRENT: Mark Projects Reviewed
```json
// After reviewing each project, mark as reviewed
{"items": [
  {"name": "Project 1", "itemType": "project", "markReviewed": true},
  {"name": "Project 2", "itemType": "project", "markReviewed": true}
]}
```

### GET CREATIVE: Review Someday/Maybe
```json
// Projects on hold — any ready to activate or drop?
{"entity": "projects", "filters": {"status": ["OnHold"]}, "fields": ["name", "note", "folderName", "taskCount"]}
```

## Context-Based Work

GTD's four criteria for choosing actions: context, time available, energy available, priority.

### By Time Available
```json
// Short window — quick wins under 15 minutes
{"entity": "tasks", "filters": {"status": ["Next", "Available"]}, "sortBy": "estimatedMinutes", "sortOrder": "asc", "fields": ["name", "projectName", "estimatedMinutes"], "limit": 15}
```

### By Energy Level
```json
// Low energy — easy tasks sorted by shortest first
{"entity": "tasks", "filters": {"tags": ["low-energy"], "status": ["Available"]}, "sortBy": "estimatedMinutes", "sortOrder": "asc", "fields": ["name", "projectName", "estimatedMinutes"]}
```

### By Priority
```json
// Flagged items across all projects — your highest priority actions
{"entity": "tasks", "filters": {"flagged": true, "status": ["Next", "Available"]}, "sortBy": "dueDate", "fields": ["name", "dueDate", "projectName", "estimatedMinutes"]}
```

## Project Creation from Documents

### Meeting Transcript Pattern
```json
{
  "items": [
    {
      "type": "project",
      "name": "Meeting: Client Discussion",
      "folderName": "Clients",
      "note": "Follow-up actions from client meeting"
    },
    {
      "type": "task",
      "name": "Send proposal document",
      "projectName": "Meeting: Client Discussion",
      "dueDate": "2025-03-20",
      "tempId": "t1"
    },
    {
      "type": "task",
      "name": "Schedule follow-up call",
      "projectName": "Meeting: Client Discussion",
      "tags": ["calls"],
      "deferDate": "2025-03-18"
    }
  ]
}
```

### Syllabus/Course Pattern
```json
{
  "items": [
    {"type": "project", "name": "Course: Module 1", "folderName": "Learning", "sequential": true},
    {"type": "task", "name": "Week 1: Introduction", "projectName": "Course: Module 1", "tempId": "w1"},
    {"type": "task", "name": "Read chapter 1", "parentTempId": "w1"},
    {"type": "task", "name": "Complete exercises", "parentTempId": "w1"},
    {"type": "task", "name": "Week 2: Core Concepts", "projectName": "Course: Module 1", "tempId": "w2"},
    {"type": "task", "name": "Read chapter 2", "parentTempId": "w2"}
  ]
}
```

## Bulk Operations

### Add Tags to Multiple Tasks
```json
{
  "items": [
    {"id": "task1", "itemType": "task", "addTags": ["urgent"]},
    {"id": "task2", "itemType": "task", "addTags": ["urgent"]},
    {"id": "task3", "itemType": "task", "addTags": ["urgent"]}
  ]
}
```

### Complete All Tasks in a Set
```json
{
  "items": [
    {"id": "task1", "itemType": "task", "newStatus": "completed"},
    {"id": "task2", "itemType": "task", "newStatus": "completed"}
  ]
}
```

### Reschedule Overdue Tasks
```json
// First query overdue
{"entity": "tasks", "filters": {"status": ["Overdue"]}}

// Then batch edit
{
  "items": [
    {"id": "task1", "itemType": "task", "newDueDate": "2025-03-20"},
    {"id": "task2", "itemType": "task", "newDueDate": "2025-03-21"}
  ]
}
```

## Perspective Integration

### List Custom Perspectives
```json
{"includeBuiltIn": false, "includeCustom": true}
```

### View Perspective Contents
```json
{
  "perspectiveName": "Work",
  "limit": 50,
  "fields": ["name", "dueDate", "projectName", "tagNames"]
}
```
