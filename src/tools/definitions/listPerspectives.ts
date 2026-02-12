import { z } from 'zod';
import { listPerspectives } from '../primitives/listPerspectives.js';
import { toToon } from '../../utils/toonFormat.js';

export const schema = z.object({
  includeBuiltIn: z.boolean().optional().describe("Include built-in perspectives (Inbox, Projects, Tags, etc.). Default: true"),
  includeCustom: z.boolean().optional().describe("Include custom perspectives (Pro feature). Default: true")
});

export async function handler(args: z.infer<typeof schema>, extra: Record<string, unknown>) {
  try {
    const result = await listPerspectives({
      includeBuiltIn: args.includeBuiltIn ?? true,
      includeCustom: args.includeCustom ?? true
    });

    if (result.success) {
      const perspectives = result.perspectives || [];

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${perspectives.length} perspectives.`,
            annotations: { audience: ["user" as const], priority: 1 }
          },
          {
            type: "text" as const,
            text: toToon({ count: perspectives.length, perspectives }),
            annotations: { audience: ["assistant" as const], priority: 0.5 }
          }
        ]
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to list perspectives: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Error listing perspectives: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error listing perspectives: ${error.message}`
      }],
      isError: true
    };
  }
}
