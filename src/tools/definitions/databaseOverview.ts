import { z } from 'zod';
import { getDatabaseOverview } from '../primitives/databaseOverview.js';
import { toToon } from '../../utils/toonFormat.js';

export const schema = z.object({
  includeStats: z.boolean().optional().describe("Include database statistics (counts, overdue, flagged, etc.). Default: true"),
  includeTree: z.boolean().optional().describe("Include folder/project hierarchy with task counts. Default: true"),
  includeTags: z.boolean().optional().describe("Include tag list. Default: false")
});

export async function handler(args: z.infer<typeof schema>, extra: Record<string, unknown>) {
  try {
    const overview = await getDatabaseOverview();

    if (overview.error) {
      return {
        content: [{
          type: "text" as const,
          text: `Error getting database overview: ${overview.error}`
        }],
        isError: true
      };
    }

    const includeStats = args.includeStats !== false;
    const includeTree = args.includeTree !== false;
    const includeTags = args.includeTags === true;

    const result: any = {};

    if (includeStats && overview.stats) {
      result.stats = overview.stats;
    }

    if (includeTree) {
      result.folders = overview.folders;
      result.projects = overview.projects;
    }

    if (includeTags && overview.tags.length > 0) {
      result.tags = overview.tags;
    }

    const stats = overview.stats;
    const summaryParts: string[] = [];
    if (stats) {
      summaryParts.push(`${stats.activeTasks} active tasks`);
      if (stats.overdue > 0) summaryParts.push(`${stats.overdue} overdue`);
      if (stats.flagged > 0) summaryParts.push(`${stats.flagged} flagged`);
      if (stats.inbox > 0) summaryParts.push(`${stats.inbox} in inbox`);
      summaryParts.push(`${stats.activeProjects} projects`);
      summaryParts.push(`${stats.activeFolders} folders`);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: summaryParts.length > 0 ? `Overview: ${summaryParts.join(', ')}.` : 'Database overview retrieved.',
          annotations: { audience: ["user" as const], priority: 1 }
        },
        {
          type: "text" as const,
          text: toToon(result),
          annotations: { audience: ["assistant" as const], priority: 0.5 }
        }
      ]
    };
  } catch (err: unknown) {
    return {
      content: [{
        type: "text" as const,
        text: `Error getting overview. Please ensure OmniFocus is running and try again.`
      }],
      isError: true
    };
  }
}
