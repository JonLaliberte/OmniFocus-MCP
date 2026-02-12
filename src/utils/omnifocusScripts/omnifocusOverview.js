  // OmniJS script to get a lightweight overview of the OmniFocus database
  // Returns stats and folder/project tree with task counts — NO individual tasks
  (() => {
    try {
      // Status mappings
      const projectStatusMap = {
        [Project.Status.Active]: "Active",
        [Project.Status.Done]: "Done",
        [Project.Status.Dropped]: "Dropped",
        [Project.Status.OnHold]: "OnHold"
      };

      const folderStatusMap = {
        [Folder.Status.Active]: "Active",
        [Folder.Status.Dropped]: "Dropped"
      };

      // Gather active projects, folders, tags
      const activeProjects = flattenedProjects.filter(p =>
        p.status !== Project.Status.Done &&
        p.status !== Project.Status.Dropped
      );
      const activeFolders = flattenedFolders.filter(f =>
        f.status !== Folder.Status.Dropped
      );
      const activeTags = flattenedTags.filter(t => t.active);

      // Single pass over ALL tasks: filter + stats + per-project counts
      // Each property access is a cross-process bridge call, so reading
      // taskStatus once per task (instead of twice) is a significant win.
      const taskCountByProject = {};
      let activeTaskCount = 0;
      let overdue = 0, dueSoon = 0, flagged = 0, inbox = 0, next = 0, available = 0, blocked = 0;
      const allTasks = flattenedTasks;
      for (let i = 0; i < allTasks.length; i++) {
        const t = allTasks[i];
        const st = t.taskStatus;
        if (st === Task.Status.Completed || st === Task.Status.Dropped) continue;
        activeTaskCount++;
        if (st === Task.Status.Overdue) overdue++;
        else if (st === Task.Status.DueSoon) dueSoon++;
        else if (st === Task.Status.Next) next++;
        else if (st === Task.Status.Available) available++;
        else if (st === Task.Status.Blocked) blocked++;
        if (t.flagged) flagged++;
        if (t.inInbox) inbox++;
        const cp = t.containingProject;
        if (cp) {
          const pk = cp.id.primaryKey;
          taskCountByProject[pk] = (taskCountByProject[pk] || 0) + 1;
        }
      }

      const stats = {
        activeTasks: activeTaskCount,
        activeProjects: activeProjects.length,
        activeFolders: activeFolders.length,
        activeTags: activeTags.length,
        overdue: overdue,
        dueSoon: dueSoon,
        flagged: flagged,
        inbox: inbox,
        next: next,
        available: available,
        blocked: blocked
      };

      // Build folder/project tree (no individual tasks)
      const folders = activeFolders.map(f => ({
        id: f.id.primaryKey,
        name: f.name,
        parentId: f.parent ? f.parent.id.primaryKey : null,
        status: folderStatusMap[f.status] || "Unknown"
      }));

      const projects = activeProjects.map(p => {
        const pk = p.id.primaryKey;
        return {
          id: pk,
          name: p.name,
          folderId: p.parentFolder ? p.parentFolder.id.primaryKey : null,
          status: projectStatusMap[p.status] || "Unknown",
          taskCount: taskCountByProject[pk] || 0,
          flagged: p.flagged || false,
          dueDate: p.dueDate ? p.dueDate.toISOString() : null,
          sequential: p.task ? (p.task.sequential || false) : false
        };
      });

      // Top-level tags (for context)
      const tags = activeTags.map(t => ({
        id: t.id.primaryKey,
        name: t.name,
        parentId: t.parent ? t.parent.id.primaryKey : null
      }));

      return JSON.stringify({
        stats: stats,
        folders: folders,
        projects: projects,
        tags: tags,
        error: null
      });

    } catch (error) {
      return JSON.stringify({
        error: "Error getting database overview: " + error.toString(),
        stats: null,
        folders: [],
        projects: [],
        tags: []
      });
    }
  })();
