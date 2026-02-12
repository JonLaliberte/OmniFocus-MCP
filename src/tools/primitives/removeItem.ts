import { executeOmniJS } from '../../utils/scriptExecution.js';

// Interface for item removal parameters
export interface RemoveItemParams {
  id?: string;          // ID of the task or project to remove
  name?: string;        // Name of the task or project to remove (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to remove
}

/**
 * Generate OmniJS script for item removal
 */
function generateJXAScript(params: RemoveItemParams): string {
  const { id, name, itemType } = params;

  // Verify we have at least one identifier
  if (!id && !name) {
    return `JSON.stringify({success: false, error: "Either id or name must be provided"})`;
  }

  return `(() => {
  try {
    let foundItem = null;
    const searchId = ${id ? `"${id.replace(/"/g, '\\"')}"` : 'null'};
    const searchName = ${name ? `"${name.replace(/"/g, '\\"')}"` : 'null'};

    ${itemType === 'task' ? `
    // Search for task
    if (searchId) {
      foundItem = flattenedTasks.find(t => t.id.primaryKey === searchId);

      if (!foundItem) {
        foundItem = inbox.find(t => t.id.primaryKey === searchId);
      }
    }

    if (!foundItem && searchName) {
      foundItem = flattenedTasks.find(t => t.name === searchName);

      if (!foundItem) {
        foundItem = inbox.find(t => t.name === searchName);
      }
    }
    ` : `
    // Search for project
    if (searchId) {
      foundItem = flattenedProjects.find(p => p.id.primaryKey === searchId);
    }

    if (!foundItem && searchName) {
      foundItem = flattenedProjects.find(p => p.name === searchName);
    }
    `}

    if (!foundItem) {
      return JSON.stringify({success: false, error: "Item not found"});
    }

    const itemId = foundItem.id.primaryKey;
    const itemName = foundItem.name;

    // Delete the item
    deleteObject(foundItem);

    return JSON.stringify({
      success: true,
      id: itemId,
      name: itemName
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;
}

/**
 * Remove a task or project from OmniFocus using OmniJS
 */
export async function removeItem(params: RemoveItemParams): Promise<{success: boolean, id?: string, name?: string, error?: string}> {
  try {
    const script = generateJXAScript(params);
    const result = await executeOmniJS(script);

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Return the result
    return {
      success: result.success,
      id: result.id,
      name: result.name,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in removeItem execution:", error);

    return {
      success: false,
      error: error?.message || "Unknown error in removeItem"
    };
  }
} 