export type FeatureStatus = 'idea' | 'scoped' | 'current' | 'done';

// Database uses 'ready' but UI shows 'current'
// 'archived' is used for soft-deleted features (not shown in UI)
export type FeatureStatusDb = 'idea' | 'scoped' | 'ready' | 'done' | 'archived';

// SubTask type for checklist items within features
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  priority: number;
  sortOrder: number;
  requestCount: number;
  summary: string | null;
  subtasks: SubTask[];
  messageCount?: number;
}

export interface FeaturesByStatus {
  idea: Feature[];
  scoped: Feature[];
  current: Feature[];
  done: Feature[];
}

export const STATUS_LABELS: Record<FeatureStatus, string> = {
  idea: 'Idea',
  scoped: 'Defined',
  current: 'In Progress',
  done: 'Done',
};

export const STATUS_ORDER: FeatureStatus[] = ['idea', 'scoped', 'current', 'done'];

// Sidebar groups: most active first
export const SIDEBAR_STATUS_ORDER: FeatureStatus[] = ['current', 'scoped', 'idea', 'done'];

// Map database status to UI status
export function mapDbStatusToUi(dbStatus: FeatureStatusDb): FeatureStatus {
  if (dbStatus === 'ready') return 'current';
  return dbStatus as FeatureStatus;
}

// Map UI status to database status
export function mapUiStatusToDb(uiStatus: FeatureStatus): FeatureStatusDb {
  if (uiStatus === 'current') return 'ready';
  return uiStatus as FeatureStatusDb;
}
