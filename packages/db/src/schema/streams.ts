import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const eventsTable = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull(),
    project_key: text('project_key').notNull(),
    timestamp: integer('timestamp').notNull(),
    sequence: integer('sequence').generatedAlwaysAs(sql`id`),
    data: text('data').notNull(),
  },
  (table) => ({
    projectKeyIdx: index('idx_events_project_key').on(table.project_key),
    typeIdx: index('idx_events_type').on(table.type),
    timestampIdx: index('idx_events_timestamp').on(table.timestamp),
    projectTypeIdx: index('idx_events_project_type').on(table.project_key, table.type),
  })
);

export const pilotsTable = sqliteTable(
  'pilots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    callsign: text('callsign').notNull(),
    program: text('program').default('opencode'),
    model: text('model').default('unknown'),
    task_description: text('task_description'),
    registered_at: integer('registered_at').notNull(),
    last_active_at: integer('last_active_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_pilots_project').on(table.project_key),
    callsignIdx: index('idx_pilots_callsign').on(table.callsign),
  })
);

export const messagesTable = sqliteTable(
  'messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    from_callsign: text('from_callsign').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    thread_id: text('thread_id'),
    importance: text('importance').default('normal'),
    ack_required: integer('ack_required', { mode: 'boolean' }).default(false),
    created_at: integer('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_messages_project').on(table.project_key),
    threadIdx: index('idx_messages_thread').on(table.thread_id),
    createdIdx: index('idx_messages_created').on(table.created_at),
  })
);

export const messageRecipientsTable = sqliteTable(
  'message_recipients',
  {
    message_id: integer('message_id').notNull(),
    callsign: text('callsign').notNull(),
    read_at: integer('read_at'),
    acked_at: integer('acked_at'),
  },
  (table) => ({
    callsignIdx: index('idx_recipients_callsign').on(table.callsign),
  })
);

export const reservationsTable = sqliteTable(
  'reservations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    callsign: text('callsign').notNull(),
    path_pattern: text('path_pattern').notNull(),
    exclusive: integer('exclusive', { mode: 'boolean' }).default(true),
    reason: text('reason'),
    created_at: integer('created_at').notNull(),
    expires_at: integer('expires_at').notNull(),
    released_at: integer('released_at'),
  },
  (table) => ({
    projectIdx: index('idx_reservations_project').on(table.project_key),
    callsignIdx: index('idx_reservations_callsign').on(table.callsign),
    expiresIdx: index('idx_reservations_expires').on(table.expires_at),
  })
);

export const cursorsTable = sqliteTable(
  'cursors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    consumer_id: text('consumer_id').notNull(),
    position: integer('position').notNull().default(0),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => ({
    consumerIdx: index('idx_cursors_consumer').on(table.project_key, table.consumer_id),
  })
);

export const locksTable = sqliteTable(
  'locks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    project_key: text('project_key').notNull(),
    lock_key: text('lock_key').notNull(),
    holder_id: text('holder_id').notNull(),
    acquired_at: integer('acquired_at').notNull(),
    expires_at: integer('expires_at').notNull(),
    released_at: integer('released_at'),
  },
  (table) => ({
    lockKeyIdx: index('idx_locks_key').on(table.project_key, table.lock_key),
  })
);
