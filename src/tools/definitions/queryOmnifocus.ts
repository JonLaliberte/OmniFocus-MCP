import { z } from 'zod';
import { queryOmnifocus, QueryOmnifocusParams } from '../primitives/queryOmnifocus.js';
import { toToon } from '../../utils/toonFormat.js';

export const schema = z.object({
  entity: z.enum(['tasks', 'projects', 'folders']).describe("Type of entity to query. Choose 'tasks' for individual tasks, 'projects' for projects, or 'folders' for folder organization"),

  filters: z.object({
    projectId: z.string().optional().describe("Filter tasks by exact project ID (use when you know the specific project ID)"),
    projectName: z.string().optional().describe("Filter tasks by project name. CASE-INSENSITIVE PARTIAL MATCHING - 'review' matches 'Weekly Review', 'Review Documents', etc. Special value: 'inbox' returns inbox tasks"),
    folderId: z.string().optional().describe("Filter by exact folder ID. For projects: direct parent folder. For tasks: filters by the folder containing the task's project"),
    tags: z.array(z.string()).optional().describe("Filter tasks or projects by tag names. EXACT MATCH, CASE-SENSITIVE. OR logic - items must have at least ONE of the specified tags. Example: ['Work'] and ['work'] are different"),
    status: z.array(z.string()).optional().describe("Filter by status (OR logic - matches any). TASKS: 'Next' (next action), 'Available' (ready to work), 'Blocked' (waiting), 'DueSoon' (due <24h), 'Overdue' (past due), 'Completed', 'Dropped'. PROJECTS: 'Active', 'OnHold', 'Done', 'Dropped'"),
    flagged: z.boolean().optional().describe("Filter tasks or projects by flagged status. true = only flagged items, false = only unflagged items"),
    dueWithin: z.number().optional().describe("Returns tasks or projects due from TODAY through N days in future. Example: 7 = items due within next week (today + 6 days)"),
    deferredUntil: z.number().optional().describe("Returns items CURRENTLY DEFERRED that will become available within N days. Example: 3 = items becoming available in next 3 days"),
    plannedWithin: z.number().optional().describe("Returns tasks planned from TODAY through N days in future. Example: 7 = tasks planned within next week (today + 6 days)"),
    hasNote: z.boolean().optional().describe("Filter by note presence. true = items with non-empty notes (whitespace ignored), false = items with no notes or only whitespace"),
    reviewDue: z.enum(['overdue', 'today', 'this_week', 'this_month']).optional().describe("Filter projects by review status. 'overdue' = past due for review, 'today' = due today, 'this_week' = due within 7 days, 'this_month' = due this month")
  }).optional().describe("Optional filters to narrow results. ALL filters combine with AND logic (must match all). Within array filters (tags, status) OR logic applies"),

  fields: z.array(z.string()).optional().describe("Specific fields to return (reduces response size). TASK FIELDS: id, name, note, flagged, taskStatus, dueDate, deferDate, plannedDate, effectiveDueDate, effectiveDeferDate, effectivePlannedDate, completionDate, estimatedMinutes, tagNames, tags, projectName, projectId, parentId, childIds, hasChildren, sequential, completedByChildren, inInbox, modificationDate (or modified), creationDate (or added). PROJECT FIELDS: id, name, status, note, folderName, folderID, sequential, dueDate, deferDate, effectiveDueDate, effectiveDeferDate, completedByChildren, containsSingletonActions, taskCount, tasks, reviewInterval, reviewIntervalSteps, reviewIntervalUnit, nextReviewDate, lastReviewDate, modificationDate, creationDate. FOLDER FIELDS: id, name, path, parentFolderID, status, projectCount, projects, subfolders. NOTE: Date fields use 'added' and 'modified' in OmniFocus API"),

  limit: z.number().optional().describe("Maximum number of items to return. Useful for large result sets. Default: no limit"),

  sortBy: z.string().optional().describe("Field to sort by. OPTIONS: name (alphabetical), dueDate (earliest first, null last), deferDate (earliest first, null last), plannedDate (earliest first, null last), nextReviewDate (earliest first, null last), modificationDate (most recent first), creationDate (oldest first), estimatedMinutes (shortest first), taskStatus (groups by status)"),

  sortOrder: z.enum(['asc', 'desc']).optional().describe("Sort order. 'asc' = ascending (A-Z, old-new, small-large), 'desc' = descending (Z-A, new-old, large-small). Default: 'asc'"),

  includeCompleted: z.boolean().optional().describe("Include completed/dropped items in results. Default: false (excludes: completed/dropped tasks, done/dropped projects, dropped folders). Set to true to see all items regardless of status."),

  summary: z.boolean().optional().describe("Return only count of matches, not full details. Efficient for statistics. Default: false")
});

export async function handler(args: z.infer<typeof schema>, extra: Record<string, unknown>) {
  try {
    const result = await queryOmnifocus(args as QueryOmnifocusParams);

    if (result.success) {
      if (args.summary) {
        return {
          content: [{
            type: "text" as const,
            text: `Found ${result.count} ${args.entity} matching your criteria.`
          }]
        };
      }

      const items = (result.items || []).map(stripNulls);
      const toonData = toToon({ count: items.length, items });

      let summary = `Found ${items.length} ${args.entity}`;
      if (items.length === args.limit) {
        summary += ` (limited to ${args.limit} — more may be available)`;
      }
      summary += '.';

      return {
        content: [
          {
            type: "text" as const,
            text: summary,
            annotations: { audience: ["user" as const], priority: 1 }
          },
          {
            type: "text" as const,
            text: toonData,
            annotations: { audience: ["assistant" as const], priority: 0.5 }
          }
        ]
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `Query failed: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Query execution error: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error executing query: ${error.message}`
      }],
      isError: true
    };
  }
}

function stripNulls(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length === 0) continue;
      result[key] = value;
    }
  }
  return result;
}
