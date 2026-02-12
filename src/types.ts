// ── Status types (used by edit and batch-edit primitives) ──

export type TaskStatus = 'incomplete' | 'completed' | 'dropped';
export type ProjectStatus = 'active' | 'completed' | 'dropped' | 'onHold';

// ── Batch operation result types ──

export interface ItemResult {
  success: boolean;
  id?: string;
  name?: string;
  error?: string;
}

export interface BatchResult {
  success: boolean;
  results: ItemResult[];
  error?: string;
}

// ── Database overview types ──

export interface OverviewStats {
  activeTasks: number;
  activeProjects: number;
  activeFolders: number;
  activeTags: number;
  overdue: number;
  dueSoon: number;
  flagged: number;
  inbox: number;
  next: number;
  available: number;
  blocked: number;
}

export interface OverviewFolder {
  id: string;
  name: string;
  parentId: string | null;
  status: string;
}

export interface OverviewProject {
  id: string;
  name: string;
  folderId: string | null;
  status: string;
  taskCount: number;
  flagged: boolean;
  dueDate: string | null;
  sequential: boolean;
}

export interface OverviewTag {
  id: string;
  name: string;
  parentId: string | null;
}

export interface DatabaseOverviewResult {
  stats: OverviewStats | null;
  folders: OverviewFolder[];
  projects: OverviewProject[];
  tags: OverviewTag[];
  error: string | null;
}

// ── Query result types ──

export interface QueryResult {
  success: boolean;
  items?: any[];
  count?: number;
  error?: string;
}

// ── Full entity types (for detailed representations) ──

export interface OmnifocusTask {
  id: string;
  name: string;
  note: string;
  flagged: boolean;

  // Status
  completed: boolean;
  completionDate: string | null;
  dropDate: string | null;
  taskStatus: string;
  active: boolean;

  // Dates
  dueDate: string | null;
  deferDate: string | null;
  estimatedMinutes: number | null;

  // Organization
  tags: string[];
  tagNames: string[];
  parentId: string | null;
  containingProjectId: string | null;
  projectId: string | null;

  // Task relationships
  childIds: string[];
  hasChildren: boolean;
  sequential: boolean;
  completedByChildren: boolean;

  // Recurring task information
  repetitionRule: string | null;
  isRepeating: boolean;
  repetitionMethod: string | null;

  // Attachments
  attachments: unknown[];
  linkedFileURLs: string[];

  // Notifications
  notifications: unknown[];

  // Settings
  shouldUseFloatingTimeZone: boolean;
}

export interface OmnifocusDatabase {
  exportDate: string;
  tasks: OmnifocusTask[];
  projects: Record<string, OmnifocusProject>;
  folders: Record<string, OmnifocusFolder>;
  tags: Record<string, OmnifocusTag>;
}

export interface OmnifocusProject {
  id: string;
  name: string;
  status: string;
  folderId: string | null;
  sequential: boolean;
  effectiveDueDate: string | null;
  effectiveDeferDate: string | null;
  dueDate: string | null;
  deferDate: string | null;
  completedByChildren: boolean;
  containsSingletonActions: boolean;
  note: string;
  tasks: string[];
  flagged?: boolean;
  estimatedMinutes?: number | null;
}

export interface OmnifocusFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  status: string;
  projects: string[];
  subfolders: string[];
}

export interface OmnifocusTag {
  id: string;
  name: string;
  parentTagId: string | null;
  active: boolean;
  allowsNextAction: boolean;
  tasks: string[];
}

export interface OmnifocusPerspective {
  id: string;
  name: string;
  type: 'builtin' | 'custom';
  isBuiltIn: boolean;
  canModify: boolean;
  filterRules?: {
    availability?: string[];
    tags?: string[];
    projects?: string[];
    flagged?: boolean;
    dueWithin?: number;
  };
}
