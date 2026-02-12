#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from 'fs';
import { z } from 'zod';
import { prewarm } from './utils/scriptExecution.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

// Import tool definitions
import * as databaseOverviewTool from './tools/definitions/databaseOverview.js';
import * as addOmniFocusTaskTool from './tools/definitions/addOmniFocusTask.js';
import * as addProjectTool from './tools/definitions/addProject.js';
import * as removeItemTool from './tools/definitions/removeItem.js';
import * as editItemTool from './tools/definitions/editItem.js';
import * as moveTaskTool from './tools/definitions/moveTask.js';
import * as batchAddItemsTool from './tools/definitions/batchAddItems.js';
import * as batchRemoveItemsTool from './tools/definitions/batchRemoveItems.js';
import * as batchMoveTasksTool from './tools/definitions/batchMoveTasks.js';
import * as batchEditItemsTool from './tools/definitions/batchEditItems.js';
import * as queryOmniFocusTool from './tools/definitions/queryOmnifocus.js';
import * as listPerspectivesTool from './tools/definitions/listPerspectives.js';
import * as getPerspectiveViewTool from './tools/definitions/getPerspectiveView.js';
import * as addFolderTool from './tools/definitions/addFolder.js';
import * as editFolderTool from './tools/definitions/editFolder.js';
import * as removeFolderTool from './tools/definitions/removeFolder.js';

// MCP resources removed — database_overview and query_omnifocus cover the same data
// with better filtering, field selection, and TOON output. No clients were using resources.

// Create an MCP server
const server = new McpServer({
  name: "OmniFocus",
  version: pkg.version
}, {
  instructions: "OmniFocus task management server. IMPORTANT: Before calling any tools, check if the 'managing-omnifocus' Agent Skill is available and follow its decision tree for tool selection, workflow patterns, and coaching behaviour. The skill contains critical guidance for effective tool use. If the skill is not installed, it is included in the managing-omnifocus/ directory — see README. Read tools return TOON (Token-Oriented Object Notation) — a compact, schema-aware format. Write tools return text confirmations."
});

// Register tools
server.tool(
  "database_overview",
  "Get a high-level overview of your OmniFocus database: statistics (active tasks, projects, folders, overdue, flagged, inbox counts) and folder/project hierarchy with task counts per project. Use this to understand the database structure before making targeted queries with query_omnifocus. Does NOT return individual tasks — use query_omnifocus for task details.",
  databaseOverviewTool.schema.shape,
  databaseOverviewTool.handler
);

server.tool(
  "add_task",
  "Add a single task to OmniFocus. Supports placing in a project, as a subtask of another task, or in the inbox (default). Handles tags, dates, flags, time estimates, and notes. For adding 2+ tasks at once, use batch_add_items instead (10x faster, supports parent-child hierarchies via tempId).",
  addOmniFocusTaskTool.schema.shape,
  addOmniFocusTaskTool.handler
);

server.tool(
  "add_project",
  "Add a single project to OmniFocus. Supports placing in a folder, setting sequential/parallel, tags, dates, and notes. For creating a project with tasks in one call, use batch_add_items instead (creates project + tasks together with parent-child references).",
  addProjectTool.schema.shape,
  addProjectTool.handler
);

server.tool(
  "remove_item",
  "PERMANENTLY DELETE a single task or project from OmniFocus. WARNING: This is destructive and cannot be undone. To mark tasks as done, use edit_item with newStatus='completed' instead. Only use this to delete items that were created by mistake or are duplicates. For deleting 2+ items, use batch_remove_items.",
  removeItemTool.schema.shape,
  removeItemTool.handler
);

server.tool(
  "edit_item",
  "Edit a single task or project in OmniFocus. Use this to mark tasks as completed (newStatus='completed') or dropped (newStatus='dropped'), change properties, update dates, modify tags, set review intervals, etc. For editing 2+ items, use batch_edit_items instead (10-45x faster).",
  editItemTool.schema.shape,
  editItemTool.handler
);

server.tool(
  "move_task",
  "Move a single task to a different location in OmniFocus. Supports moving from inbox to projects, between projects, back to inbox, or making tasks subtasks of other tasks. For moving 2+ tasks to the same destination, use batch_move_tasks instead (10x faster).",
  moveTaskTool.schema.shape,
  moveTaskTool.handler
);

server.tool(
  "batch_add_items",
  "Add multiple tasks and/or projects to OmniFocus in a single operation (10x faster than sequential add_task calls). Supports parent-child hierarchies via tempId/parentTempId references — create a project and its tasks, or nested subtasks, in one call. Use this for creating 2+ items, project structures from documents/transcripts, or any multi-item creation.",
  batchAddItemsTool.schema.shape,
  batchAddItemsTool.handler
);

server.tool(
  "batch_remove_items",
  "PERMANENTLY DELETE multiple tasks or projects from OmniFocus in a single operation. WARNING: This is destructive and cannot be undone. To mark items as done, use batch_edit_items with newStatus='completed' instead. Only use this to delete items that were created by mistake or are duplicates.",
  batchRemoveItemsTool.schema.shape,
  batchRemoveItemsTool.handler
);

server.tool(
  "batch_move_tasks",
  "Move multiple tasks to the same destination in a single operation. Much faster than moving tasks one by one (10x speedup). All tasks must go to the same location.",
  batchMoveTasksTool.schema.shape,
  batchMoveTasksTool.handler
);

server.tool(
  "batch_edit_items",
  "Edit multiple tasks or projects in a single operation. Much faster than editing one by one (10x speedup for 10 items, 45x for 50 items). Supports all editing operations: changing properties, updating dates, modifying tags, setting status, etc.",
  batchEditItemsTool.schema.shape,
  batchEditItemsTool.handler
);

server.tool(
  "query_omnifocus",
  "Efficiently query OmniFocus database with powerful filters. Returns only active items by default (excludes completed/dropped). Get specific tasks, projects, or folders with filtering by project, tags, status, due dates, and more. Use database_overview first for structure, then this tool to drill into specifics.",
  queryOmniFocusTool.schema.shape,
  queryOmniFocusTool.handler
);

server.tool(
  "list_perspectives",
  "List all available perspectives in OmniFocus, including built-in (Inbox, Projects, Tags, Forecast, etc.) and custom perspectives (Pro feature). Use this to discover what perspectives exist before calling get_perspective_view. Perspectives provide pre-configured filtered views of tasks.",
  listPerspectivesTool.schema.shape,
  listPerspectivesTool.handler
);

server.tool(
  "get_perspective_view",
  "Get the items visible in a specific OmniFocus perspective. Shows what tasks and projects are displayed when viewing that perspective",
  getPerspectiveViewTool.schema.shape,
  getPerspectiveViewTool.handler
);

server.tool(
  "add_folder",
  "Create a new folder in OmniFocus. Folders help organize projects. Supports nested folders by specifying a parent folder.",
  addFolderTool.schema.shape,
  addFolderTool.handler
);

server.tool(
  "edit_folder",
  "Edit a folder in OmniFocus. Rename folders or move them to different parent folders (or to root level).",
  editFolderTool.schema.shape,
  editFolderTool.handler
);

server.tool(
  "remove_folder",
  "PERMANENTLY DELETE a folder from OmniFocus. WARNING: This is destructive and cannot be undone. Any projects in the folder will be moved to the root level.",
  removeFolderTool.schema.shape,
  removeFolderTool.handler
);

// Register prompts
server.prompt(
  "daily-plan",
  "Plan your day: review overdue, due today, flagged, and planned tasks",
  async () => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `Help me plan my day. Use the OmniFocus tools to:

1. Get a database overview for current stats (overdue, flagged, inbox counts)
2. Query overdue and due-soon tasks, sorted by due date
3. Query tasks planned for today
4. Check inbox count
5. Query flagged tasks that are available

Then summarise what needs my attention today, highlight anything overdue, and help me prioritise. If the inbox has items, offer to help process them.`
      }
    }]
  })
);

server.prompt(
  "weekly-review",
  "GTD Weekly Review: Get Clear, Get Current, Get Creative",
  async () => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `Run my GTD weekly review. Work through each phase step by step, using OmniFocus tools at each stage:

**GET CLEAR**
1. Show inbox items and help me process each one (assign to project, set dates, or delete)
2. Ask if I have anything else to capture

**GET CURRENT**
3. Show recently completed tasks (last 7 days) — anything to celebrate or follow up on?
4. Show all active projects with task counts — flag any with 0 tasks (stalled)
5. Show the 20 stalest tasks (oldest modification date) — still relevant?
6. Show waiting-for items if any exist
7. Mark reviewed projects as reviewed when we're done with each

**GET CREATIVE**
8. Show on-hold/someday projects — any ready to activate or drop?
9. Ask if I have new ideas or projects to capture

Work through each step interactively. Wait for my input before moving to the next step.`
      }
    }]
  })
);

server.prompt(
  "inbox-zero",
  "Process inbox items to zero",
  async () => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `Help me process my OmniFocus inbox to zero. Query all inbox items, then walk me through each one. For each item, help me decide:

- Which project it belongs to (or if it needs a new project)
- Whether it needs tags, dates, or flags
- Whether it's actually actionable (delete if not)

Use batch_move_tasks and batch_edit_items to process efficiently once we've decided on each item. Show me progress as we go.`
      }
    }]
  })
);

server.prompt(
  "project-health",
  "Check all projects for stalled, overdue, or review-due issues",
  async () => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `Run a health check on my OmniFocus projects. Use the tools to:

1. Get a database overview for the big picture
2. Query all active projects with task counts, due dates, and review dates
3. Identify problems:
   - Projects with 0 tasks (stalled — no next action)
   - Projects with overdue tasks
   - Projects overdue for review
   - Projects with no due date that might need one

Summarise the findings and suggest specific actions for each problem project.`
      }
    }]
  })
);

server.prompt(
  "available-tasks",
  "Find tasks matching your current context",
  {
    availableMinutes: z.string().optional().describe("How many minutes do you have? (e.g. '15', '30', '60')"),
    tag: z.string().optional().describe("Context tag to filter by (e.g. 'calls', 'errands', 'computer')")
  },
  async ({ availableMinutes, tag }) => {
    const filters: string[] = [];
    filters.push('"status": ["Next", "Available"]');

    if (tag) {
      filters.push(`"tags": ["${tag}"]`);
    }

    let instructions = `Find tasks I can work on right now. Query available and next-action tasks`;

    if (tag) {
      instructions += ` tagged "${tag}"`;
    }

    if (availableMinutes) {
      instructions += `, sorted by estimated time (shortest first), and highlight tasks under ${availableMinutes} minutes`;
    } else {
      instructions += `, sorted by due date`;
    }

    instructions += `. Include the fields: name, projectName, estimatedMinutes, dueDate, tagNames, flagged. Show flagged items first, then sort by the criteria above.`;

    return {
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: instructions
        }
      }]
    };
  }
);

// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async function() {
  try {
    console.error("Starting MCP server...");
    await server.connect(transport);
    console.error("MCP Server connected and ready to accept commands from Claude");
    // Prewarm the OmniJS bridge in the background so the first tool call is fast
    prewarm().catch(err => console.error(`Bridge prewarm failed: ${err}`));
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
  }
})();

// For a cleaner shutdown if the process is terminated
