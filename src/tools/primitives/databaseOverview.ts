import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { DatabaseOverviewResult } from '../../types.js';
import { cache, cacheKey } from '../../utils/cache.js';

const CACHE_TOOL = 'database_overview';

export async function getDatabaseOverview(): Promise<DatabaseOverviewResult> {
  const key = cacheKey(CACHE_TOOL, {});
  const cached = cache.get<DatabaseOverviewResult>(key);
  if (cached) return cached;

  try {
    const result = await executeOmniFocusScript('@omnifocusOverview.js') as DatabaseOverviewResult;

    if (result.error) {
      return {
        stats: null,
        folders: [],
        projects: [],
        tags: [],
        error: result.error
      };
    }

    cache.set(key, result);
    return result;
  } catch (error) {
    console.error('Error getting database overview:', error);
    return {
      stats: null,
      folders: [],
      projects: [],
      tags: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
