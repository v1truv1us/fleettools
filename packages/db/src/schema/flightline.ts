import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const missionsTable = sqliteTable(
  'missions',
  {
    id: text('id').primaryKey(),
    project_key: text('project_key').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'),
    priority: integer('priority').notNull().default(1),
    created_at: integer('created_at').notNull(),
    started_at: integer('started_at'),
    completed_at: integer('completed_at'),
    created_by: text('created_by'),
  },
  (table) => ({
    projectIdx: index('idx_missions_project').on(table.project_key),
    statusIdx: index('idx_missions_status').on(table.status),
  })
);

export const sortiesTable = sqliteTable(
  'sorties',
  {
    id: text('id').primaryKey(),
    project_key: text('project_key').notNull(),
    mission_id: text('mission_id'),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('open'),
    priority: integer('priority').notNull().default(1),
    assigned_to: text('assigned_to'),
    files: text('files'),
    created_at: integer('created_at').notNull(),
    started_at: integer('started_at'),
    completed_at: integer('completed_at'),
    blocked_reason: text('blocked_reason'),
  },
  (table) => ({
    projectIdx: index('idx_sorties_project').on(table.project_key),
    missionIdx: index('idx_sorties_mission').on(table.mission_id),
    statusIdx: index('idx_sorties_status').on(table.status),
    assignedIdx: index('idx_sorties_assigned').on(table.assigned_to),
  })
);

export const workOrdersTable = sqliteTable(
  'work_orders',
  {
    id: text('id').primaryKey(),
    project_key: text('project_key').notNull(),
    sortie_id: text('sortie_id'),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'),
    assigned_to: text('assigned_to'),
    created_at: integer('created_at').notNull(),
    completed_at: integer('completed_at'),
  },
  (table) => ({
    sortieIdx: index('idx_work_orders_sortie').on(table.sortie_id),
    statusIdx: index('idx_work_orders_status').on(table.status),
  })
);

export const checkpointsTable = sqliteTable(
  'checkpoints',
  {
    id: text('id').primaryKey(),
    project_key: text('project_key').notNull(),
    mission_id: text('mission_id'),
    sortie_id: text('sortie_id'),
    callsign: text('callsign').notNull(),
    trigger: text('trigger').notNull(),
    progress_percent: integer('progress_percent'),
    summary: text('summary'),
    context_data: text('context_data'),
    created_at: integer('created_at').notNull(),
  },
  (table) => ({
    missionIdx: index('idx_checkpoints_mission').on(table.mission_id),
    callsignIdx: index('idx_checkpoints_callsign').on(table.callsign),
  })
);
