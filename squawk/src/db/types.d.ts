/**
 * FleetTools Shared Database Interfaces
 *
 * This file defines the contract between Phase 2 (SQLite Persistence) and Phase 3 (Context Survival).
 * Both phases implement these interfaces to enable parallel development.
 *
 * @since 1.0.0 - Initial interface definitions
 * @last-updated 2026-01-04
 *
 * Architecture:
 * Phase 2: SQLite-backed operations (real implementation)
 * Phase 3: Mock implementations (for parallel development)
 * Contract tests ensure both implementations behave identically
 *
 */
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type SortOrder = 'asc' | 'desc';
export interface Mission {
    /** Unique identifier (format: msn-<uuid8>) */
    id: string;
    /** Mission title */
    title: string;
    /** Optional description */
    description?: string;
    /** Current status */
    status: MissionStatus;
    /** Priority level */
    priority: Priority;
    /** Creation timestamp (ISO 8601) */
    created_at: string;
    /** Start timestamp (when status changes to in_progress) */
    started_at?: string;
    /** Completion timestamp (when status changes to completed) */
    completed_at?: string;
    /** Total number of sorties */
    total_sorties: number;
    /** Number of completed sorties */
    completed_sorties: number;
    /** Optional result/summary */
    result?: MissionResult;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
export type MissionStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export interface MissionResult {
    success: boolean;
    summary?: string;
    artifacts?: string[];
    metrics?: Record<string, number>;
    errors?: string[];
}
export interface MissionStats {
    total_sorties: number;
    completed_sorties: number;
    failed_sorties: number;
    blocked_sorties: number;
    in_progress_sorties: number;
    pending_sorties: number;
    duration_ms?: number;
    average_sortie_duration_ms?: number;
}
export interface CreateMissionInput {
    title: string;
    description?: string;
    priority?: Priority;
    metadata?: Record<string, unknown>;
}
export interface UpdateMissionInput {
    title?: string;
    description?: string;
    priority?: Priority;
    metadata?: Record<string, unknown>;
}
export interface MissionFilter {
    status?: MissionStatus | MissionStatus[];
    created_after?: string;
    created_before?: string;
    priority?: Priority | Priority[];
    limit?: number;
    offset?: number;
}
export interface Sortie {
    /** Unique identifier (format: srt-<uuid8>) */
    id: string;
    /** Parent mission ID */
    mission_id?: string;
    /** Sortie title */
    title: string;
    /** Optional description */
    description?: string;
    /** Current status */
    status: SortieStatus;
    /** Priority level */
    priority: Priority;
    /** Assigned specialist ID */
    assigned_to?: string;
    /** Files being worked on */
    files?: string[];
    /** Progress percentage (0-100) */
    progress: number;
    /** Latest progress notes */
    progress_notes?: string;
    /** When sortie was started */
    started_at?: string;
    /** When sortie was completed */
    completed_at?: string;
    /** Optional blocking information */
    blocked_by?: string;
    blocked_reason?: string;
    /** Optional result data */
    result?: SortieResult;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
export type SortieStatus = 'pending' | 'assigned' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'failed' | 'cancelled';
export interface SortieResult {
    success: boolean;
    summary?: string;
    artifacts?: string[];
    metrics?: Record<string, number>;
    errors?: string[];
}
export interface CreateSortieInput {
    title: string;
    description?: string;
    mission_id?: string;
    priority?: Priority;
    assigned_to?: string;
    files?: string[];
    metadata?: Record<string, unknown>;
}
export interface UpdateSortieInput {
    title?: string;
    description?: string;
    priority?: Priority;
    assigned_to?: string;
    files?: string[];
    metadata?: Record<string, unknown>;
}
export interface SortieFilter {
    mission_id?: string;
    status?: SortieStatus | SortieStatus[];
    assigned_to?: string;
    priority?: Priority | Priority[];
    created_after?: string;
    created_before?: string;
    limit?: number;
    offset?: number;
}
export interface SortieSnapshot {
    id: string;
    status: SortieStatus;
    assigned_to?: string;
    files?: string[];
    started_at?: string;
    progress?: number;
    progress_notes?: string;
}
export interface Lock {
    /** Unique identifier (format: lock-<uuid8>) */
    id: string;
    /** File path as provided */
    file: string;
    /** Normalized absolute path */
    normalized_path: string;
    /** Specialist ID holding the lock */
    reserved_by: string;
    /** When lock was acquired */
    reserved_at: string;
    /** When lock was released */
    released_at?: string;
    /** When lock expires */
    expires_at: string;
    /** Lock purpose */
    purpose: LockPurpose;
    /** File checksum at lock time */
    checksum?: string;
    /** Current lock status */
    status: LockStatus;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
export type LockStatus = 'active' | 'released' | 'expired' | 'force_released';
export type LockPurpose = 'edit' | 'read' | 'delete';
export interface AcquireLockInput {
    file: string;
    specialist_id: string;
    timeout_ms: number;
    purpose?: LockPurpose;
    checksum?: string;
    metadata?: Record<string, unknown>;
}
export interface LockResult {
    conflict: boolean;
    lock?: Lock;
    existing_lock?: Lock;
}
export interface LockSnapshot {
    id: string;
    file: string;
    held_by: string;
    acquired_at: string;
    purpose: string;
    timeout_ms: number;
}
export interface LockReacquireResult {
    original_lock_id: string;
    success: boolean;
    new_lock?: Lock;
    conflict?: Lock;
    error?: string;
}
export interface Event {
    /** Monotonically increasing sequence number */
    sequence_number: number;
    /** Unique event identifier */
    event_id: string;
    /** Event type (e.g., 'mission_created', 'sortie_started') */
    event_type: string;
    /** Stream type for partitioning */
    stream_type: StreamType;
    /** Stream identifier */
    stream_id: string;
    /** Event payload (JSON) */
    data: Record<string, unknown>;
    /** Event that caused this event */
    causation_id?: string;
    /** Root event in causation chain */
    correlation_id?: string;
    /** Event metadata */
    metadata?: EventMetadata;
    /** When event occurred (ISO 8601) */
    occurred_at: string;
    /** When event was recorded */
    recorded_at: string;
    /** Schema version for migrations */
    schema_version: number;
}
export type StreamType = 'specialist' | 'squawk' | 'ctk' | 'sortie' | 'mission' | 'checkpoint' | 'fleet' | 'system';
export interface EventMetadata {
    source?: string;
    version?: string;
    user_agent?: string;
    [key: string]: unknown;
}
export interface AppendEventInput {
    event_type: string;
    stream_type: StreamType;
    stream_id: string;
    data: Record<string, unknown>;
    causation_id?: string;
    correlation_id?: string;
    metadata?: EventMetadata;
    occurred_at?: string;
    recorded_at?: string;
    schema_version?: number;
}
export interface EventQueryOptions {
    after?: string;
    before?: string;
    limit?: number;
    offset?: number;
}
export interface EventFilter {
    event_type?: string | string[];
    stream_type?: StreamType | StreamType[];
    stream_id?: string;
    after_sequence?: number;
    before_sequence?: number;
    after?: string;
    before?: string;
}
export interface Checkpoint {
    /** Unique identifier (format: chk-<uuid8>) */
    id: string;
    /** Parent mission ID */
    mission_id: string;
    /** Checkpoint creation timestamp (ISO 8601) */
    timestamp: string;
    /** What triggered this checkpoint */
    trigger: CheckpointTrigger;
    /** Additional trigger context */
    trigger_details?: string;
    /** Mission progress at checkpoint time (0-100) */
    progress_percent: number;
    /** Snapshot of all sorties */
    sorties: SortieSnapshot[];
    /** Snapshot of all active locks */
    active_locks: LockSnapshot[];
    /** Snapshot of pending messages */
    pending_messages: MessageSnapshot[];
    /** Recovery context for LLM */
    recovery_context: RecoveryContext;
    /** Agent that created checkpoint */
    created_by: string;
    /** Optional checkpoint expiration */
    expires_at?: string;
    /** When checkpoint was used for recovery */
    consumed_at?: string;
    /** Schema version */
    version: string;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
export type CheckpointTrigger = 'progress' | 'error' | 'manual' | 'compaction';
export interface CreateCheckpointInput {
    mission_id: string;
    trigger: CheckpointTrigger;
    trigger_details?: string;
    progress_percent?: number;
    created_by: string;
    expires_at?: string;
    ttl_hours?: number;
    sorties?: SortieSnapshot[];
    active_locks?: LockSnapshot[];
    pending_messages?: MessageSnapshot[];
    recovery_context?: RecoveryContext;
    metadata?: Record<string, unknown>;
}
export interface CheckpointDeleteFilter {
    mission_id?: string;
    older_than?: string;
    trigger?: CheckpointTrigger | CheckpointTrigger[];
    consumed?: boolean;
}
export interface PruneOptions {
    older_than_days: number;
    keep_per_mission: number;
    include_completed_missions?: boolean;
}
export interface RecoveryContext {
    /** What was happening when checkpoint was created */
    last_action: string;
    /** Recommended next steps */
    next_steps: string[];
    /** Current blockers preventing progress */
    blockers: string[];
    /** Files modified in this session */
    files_modified: string[];
    /** Mission-level summary */
    mission_summary: string;
    /** Time since mission start (ms) */
    elapsed_time_ms: number;
    /** Last activity timestamp */
    last_activity_at: string;
}
export interface MessageSnapshot {
    id: string;
    from: string;
    to: string[];
    subject: string;
    sent_at: string;
    delivered: boolean;
}
export interface Specialist {
    /** Unique identifier */
    id: string;
    /** Specialist name/type */
    name: string;
    /** Current status */
    status: SpecialistStatus;
    /** Capabilities array */
    capabilities?: string[];
    /** Registration timestamp */
    registered_at: string;
    /** Last heartbeat timestamp */
    last_seen: string;
    /** Current sortie being worked on */
    current_sortie?: string;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
export type SpecialistStatus = 'active' | 'busy' | 'idle' | 'inactive' | 'completed';
export interface RegisterSpecialistInput {
    id?: string;
    name: string;
    capabilities?: string[];
    metadata?: Record<string, unknown>;
}
export interface Message {
    /** Unique identifier */
    id: string;
    /** Target mailbox ID */
    mailbox_id: string;
    /** Sender ID */
    sender_id?: string;
    /** Optional thread ID for grouping */
    thread_id?: string;
    /** Message type */
    message_type: string;
    /** Message content (JSON) */
    content: Record<string, unknown>;
    /** Message priority */
    priority: MessagePriority;
    /** Message status */
    status: MessageStatus;
    /** Sent timestamp */
    sent_at: string;
    /** When message was read */
    read_at?: string;
    /** When message was acknowledged */
    acked_at?: string;
    /** Causation ID */
    causation_id?: string;
    /** Correlation ID */
    correlation_id?: string;
    /** Custom metadata */
    metadata?: MessageMetadata;
}
export type MessageStatus = 'pending' | 'read' | 'acked';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export interface MessageMetadata {
    [key: string]: unknown;
}
export interface SendMessageInput {
    mailbox_id: string;
    sender_id?: string;
    thread_id?: string;
    message_type: string;
    content: Record<string, unknown>;
    priority?: MessagePriority;
    causation_id?: string;
    correlation_id?: string;
    metadata?: MessageMetadata;
}
export interface Cursor {
    /** Unique identifier */
    id: string;
    /** Stream type */
    stream_type: StreamType;
    /** Stream identifier */
    stream_id: string;
    /** Current position (last processed sequence number) */
    position: number;
    /** Optional consumer ID (who owns this cursor) */
    consumer_id?: string;
    /** Creation timestamp */
    created_at: string;
    /** Last update timestamp */
    updated_at: string;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
export interface CreateCursorInput {
    id?: string;
    stream_type: StreamType;
    stream_id: string;
    position: number;
    consumer_id?: string;
    metadata?: Record<string, unknown>;
}
/**
 * DatabaseAdapter - Root interface for all database operations
 *
 * Phase 2 implementations implement this with SQLite backend
 * Phase 3 implementations use mock versions
 */
export interface DatabaseAdapter extends VersionedInterface {
    version: '1.0.0';
    /** Mission operations */
    missions: MissionOps;
    /** Sortie operations */
    sorties: SortieOps;
    /** Lock operations */
    locks: LockOps;
    /** Event operations */
    events: EventOps;
    /** Message operations */
    messages: MessageOps;
    /** Checkpoint operations */
    checkpoints: CheckpointOps;
    /** Specialist operations */
    specialists: SpecialistOps;
    /** Cursor operations */
    cursors: CursorOps;
    /** Initialize database connection */
    initialize(): Promise<void>;
    /** Close database connection */
    close(): Promise<void>;
    /** Check if database is healthy */
    isHealthy(): Promise<boolean>;
    /** Get database statistics */
    getStats(): Promise<DatabaseStats>;
    /** Run database maintenance */
    maintenance(): Promise<void>;
}
export interface DatabaseStats {
    /** Total events in event log */
    total_events: number;
    /** Total missions */
    total_missions: number;
    /** Active missions (in_progress) */
    active_missions: number;
    /** Active locks */
    active_locks: number;
    /** Total checkpoints */
    total_checkpoints: number;
    /** Database file size in bytes */
    database_size_bytes: number;
    /** WAL file size in bytes */
    wal_size_bytes: number;
    /** Last vacuum timestamp */
    last_vacuum_at?: string;
}
/**
 * All interfaces include versioning for backward compatibility
 * Use @since tags to document breaking changes
 */
export interface VersionedInterface {
    version: string;
    since?: string;
}
export interface MissionOps extends VersionedInterface {
    version: '1.0.0';
    create(input: CreateMissionInput): Promise<Mission>;
    getById(id: string): Promise<Mission | null>;
    getAll(filter?: MissionFilter): Promise<Mission[]>;
    update(id: string, data: UpdateMissionInput): Promise<Mission | null>;
    delete(id: string): Promise<boolean>;
    getByStatus(status: MissionStatus): Promise<Mission[]>;
}
export interface SortieOps extends VersionedInterface {
    version: '1.0.0';
    create(input: CreateSortieInput): Promise<Sortie>;
    getById(id: string): Promise<Sortie | null>;
    getAll(filter?: SortieFilter): Promise<Sortie[]>;
    update(id: string, data: UpdateSortieInput): Promise<Sortie | null>;
    delete(id: string): Promise<boolean>;
    getByStatus(status: SortieStatus): Promise<Sortie[]>;
    getByMission(missionId: string): Promise<Sortie[]>;
}
export interface LockOps extends VersionedInterface {
    version: '1.0.0';
    acquire(input: AcquireLockInput): Promise<LockResult>;
    release(id: string): Promise<boolean>;
    getById(id: string): Promise<Lock | null>;
    getByFile(file: string): Promise<Lock | null>;
    getActive(): Promise<Lock[]>;
    getAll(): Promise<Lock[]>;
    forceRelease(id: string): Promise<boolean>;
}
export interface EventOps extends VersionedInterface {
    version: '1.0.0';
    append(input: AppendEventInput): Promise<Event>;
    queryByStream(streamType: string, streamId: string, afterSequence?: number): Promise<Event[]>;
    queryByType(eventType: string): Promise<Event[]>;
    getEvents(filter: EventFilter): Promise<Event[]>;
    getLatestByStream(streamType: string, streamId: string): Promise<Event | null>;
}
export interface CheckpointOps extends VersionedInterface {
    version: '1.0.0';
    save(input: CreateCheckpointInput): Promise<Checkpoint>;
    getById(id: string): Promise<Checkpoint | null>;
    getLatestByMission(missionId: string): Promise<Checkpoint | null>;
    list(filter?: CheckpointDeleteFilter & {
        limit?: number;
    }): Promise<Checkpoint[]>;
    delete(id: string): Promise<boolean>;
    markConsumed(id: string): Promise<void>;
    findPruneCandidates(options: PruneOptions & {
        mission_id?: string;
    }): Promise<Checkpoint[]>;
}
export interface SpecialistOps extends VersionedInterface {
    version: '1.0.0';
    register(input: RegisterSpecialistInput): Promise<Specialist>;
    getById(id: string): Promise<Specialist | null>;
    getAll(filter?: {
        status?: SpecialistStatus;
    }): Promise<Specialist[]>;
    updateStatus(id: string, status: SpecialistStatus): Promise<boolean>;
    heartbeat(id: string): Promise<boolean>;
}
export interface MessageOps extends VersionedInterface {
    version: '1.0.0';
    send(input: SendMessageInput): Promise<Message>;
    getById(id: string): Promise<Message | null>;
    getByMailbox(mailboxId: string, filter?: {
        status?: MessageStatus;
        limit?: number;
    }): Promise<Message[]>;
    markRead(id: string): Promise<boolean>;
    markAcked(id: string): Promise<boolean>;
    requeue(id: string): Promise<boolean>;
}
export interface CursorOps extends VersionedInterface {
    version: '1.0.0';
    create(input: CreateCursorInput): Promise<Cursor>;
    getById(id: string): Promise<Cursor | null>;
    getByStream(streamId: string): Promise<Cursor | null>;
    advance(streamId: string, position: number): Promise<Cursor>;
    update(id: string, data: Partial<Cursor>): Promise<Cursor>;
    getAll(filter?: {
        stream_type?: StreamType;
    }): Promise<Cursor[]>;
}
export interface Mailbox {
    id: string;
    created_at: string;
    updated_at: string;
}
export interface LegacyEvent {
    id: string;
    mailbox_id: string;
    type: string;
    stream_id: string;
    data: string;
    occurred_at: string;
    causation_id: string | null;
    metadata: string | null;
}
export interface LegacyCursor {
    id: string;
    stream_id: string;
    position: number;
    updated_at: string;
}
export interface LegacyLock {
    id: string;
    file: string;
    reserved_by: string;
    reserved_at: string;
    released_at: string | null;
    purpose: string;
    checksum: string | null;
    timeout_ms: number;
    metadata: string | null;
}
/**
 * @see [MissionOps](#) for mission operation details
 * @see [SortieOps](#) for sortie operation details
 * @see [LockOps](#) for lock operation details
 * @see [EventOps](#) for event operation details
 * @see [MessageOps](#) for message operation details
 * @see [CursorOps](#) for cursor operation details
 * @see [CheckpointOps](#) for checkpoint operation details
 * @see [SpecialistOps](#) for specialist operation details
 * @see [DatabaseAdapter](#) for database adapter details
 * @see [DatabaseStats](#) for database statistics details
 * @since [1.0.0](https://) for versioning information
 */ 
//# sourceMappingURL=types.d.ts.map