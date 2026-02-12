/**
 * Type declarations for OmniJS globals available inside OmniFocus.
 * These scripts run via `evaluateJavascript()` in the OmniFocus process,
 * NOT in Node — so these types exist purely for IDE checking.
 */

// --- Enums / status constants ---

interface TaskStatusEnum {
  Available: number;
  Blocked: number;
  Completed: number;
  Dropped: number;
  DueSoon: number;
  Next: number;
  Overdue: number;
}

interface ProjectStatusEnum {
  Active: number;
  Done: number;
  Dropped: number;
  OnHold: number;
}

interface FolderStatusEnum {
  Active: number;
  Dropped: number;
}

// --- Entity types ---

interface OFIdentifier {
  primaryKey: string;
}

interface OFTag {
  id: OFIdentifier;
  name: string;
  active: boolean;
  parent: OFTag | null;
  remainingTasks: OFTask[];
}

interface OFTask {
  id: OFIdentifier;
  name: string;
  note: string;
  completed: boolean;
  flagged: boolean;
  inInbox: boolean;
  taskStatus: number;
  dueDate: Date | null;
  deferDate: Date | null;
  completionDate: Date | null;
  estimatedMinutes: number | null;
  containingProject: OFProject | null;
  sequential: boolean;
  tags: OFTag[];
}

interface OFProject {
  id: OFIdentifier;
  name: string;
  note: string;
  status: number;
  flagged: boolean;
  dueDate: Date | null;
  deferDate: Date | null;
  parentFolder: OFFolder | null;
  task: OFTask | null;
}

interface OFFolder {
  id: OFIdentifier;
  name: string;
  status: number;
  parent: OFFolder | null;
}

// --- Perspective types ---

interface OFPerspective {
  name: string;
  identifier?: string;
}

interface OFBuiltInPerspectives {
  Inbox: OFPerspective;
  Projects: OFPerspective;
  Tags: OFPerspective;
  Forecast: OFPerspective;
  Flagged: OFPerspective;
  Review: OFPerspective;
}

interface OFCustomPerspectives {
  all: OFPerspective[];
}

// --- Window / Document types ---

interface OFSelection {
  tasks: OFTask[];
  projects: OFProject[];
}

interface OFWindow {
  perspective: OFPerspective | null;
  selection: OFSelection;
}

interface OFDocument {
  windows: OFWindow[];
}

// --- Static namespaces ---

declare const Task: {
  Status: TaskStatusEnum;
};

declare const Project: {
  Status: ProjectStatusEnum;
};

declare const Folder: {
  Status: FolderStatusEnum;
};

declare const Perspective: {
  BuiltIn: OFBuiltInPerspectives;
  Custom: OFCustomPerspectives;
};

// --- Global collections ---

declare const flattenedTasks: OFTask[];
declare const flattenedProjects: OFProject[];
declare const flattenedFolders: OFFolder[];
declare const flattenedTags: OFTag[];
declare const inbox: OFTask[];
declare const document: OFDocument;
