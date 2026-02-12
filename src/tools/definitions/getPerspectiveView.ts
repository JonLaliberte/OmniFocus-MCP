import { z } from 'zod';
import { getPerspectiveView } from '../primitives/getPerspectiveView.js';
import { toToon } from '../../utils/toonFormat.js';

export const schema = z.object({
  perspectiveName: z.string().describe("Name of the perspective to view (e.g., 'Inbox', 'Projects', 'Flagged', or custom perspective name)"),

  limit: z.number().optional().describe("Maximum number of items to return. Default: 100"),

  includeMetadata: z.boolean().optional().describe("Include additional metadata like project names, tags, dates. Default: true"),

  fields: z.array(z.string()).optional().describe("Specific fields to include in the response. Reduces response size. Available fields: id, name, note, flagged, dueDate, deferDate, completionDate, taskStatus, projectName, tagNames, estimatedMinutes")
});

export async function handler(args: z.infer<typeof schema>, extra: Record<string, unknown>) {
  try {
    const result = await getPerspectiveView({
      perspectiveName: args.perspectiveName,
      limit: args.limit ?? 100,
      includeMetadata: args.includeMetadata ?? true,
      fields: args.fields
    });

    if (result.success) {
      const items = result.items || [];

      const toonData = toToon({
        perspectiveName: args.perspectiveName,
        count: items.length,
        items,
        ...(items.length === args.limit ? { truncated: true } : {})
      });

      let summary = `Perspective "${args.perspectiveName}": ${items.length} items`;
      if (items.length === args.limit) {
        summary += ` (truncated at ${args.limit})`;
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
          text: `Failed to get perspective view: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Error getting perspective view: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error getting perspective view: ${error.message}`
      }],
      isError: true
    };
  }
}
