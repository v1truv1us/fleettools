import { describe, it, expect, beforeEach } from 'bun:test';
import type {
  MissionOps,
  SortieOps,
  LockOps,
  EventOps,
  CheckpointOps,
  SpecialistOps,
  MessageOps,
  CursorOps,
  MissionFilter,
  SortieFilter,
  EventFilter,
  LockResult
} from '../../squawk/src/db/types';

/**
 * Contract test suite for MissionOps
 * Both SQLite and Mock implementations must pass these tests
 */
export function testMissionOpsContract(
  createOps: () => MissionOps,
  cleanup?: () => Promise<void>
): void {
  describe('MissionOps Contract', () => {
    let ops: MissionOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('create()', () => {
      it('returns Mission with required fields', async () => {
        const mission = await ops.create({ title: 'Test Mission' });
        
        expect(mission.id).toMatch(/^msn-[a-z0-9]+$/);
        expect(mission.title).toBe('Test Mission');
        expect(mission.status).toBe('pending');
        expect(mission.priority).toBe('medium');
        expect(mission.created_at).toBeDefined();
        expect(mission.total_sorties).toBe(0);
        expect(mission.completed_sorties).toBe(0);
      });

      it('accepts optional fields', async () => {
        const mission = await ops.create({
          title: 'Test',
          description: 'Description',
          priority: 'high',
          metadata: { key: 'value' }
        });
        
        expect(mission.description).toBe('Description');
        expect(mission.priority).toBe('high');
        expect(mission.metadata).toEqual({ key: 'value' });
      });

      it('generates unique IDs', async () => {
        const m1 = await ops.create({ title: 'Mission 1' });
        const m2 = await ops.create({ title: 'Mission 2' });
        
        expect(m1.id).not.toBe(m2.id);
      });
    });

    describe('getById()', () => {
      it('returns Mission when exists', async () => {
        const created = await ops.create({ title: 'Test' });
        const retrieved = await ops.getById(created.id);
        
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null when not exists', async () => {
        const result = await ops.getById('msn-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('getAll()', () => {
      it('returns all missions', async () => {
        await ops.create({ title: 'Mission 1' });
        await ops.create({ title: 'Mission 2' });
        
        const missions = await ops.getAll();
        expect(missions.length).toBeGreaterThanOrEqual(2);
      });

      it('filters by status', async () => {
        const m1 = await ops.create({ title: 'Mission 1' });
        await ops.create({ title: 'Mission 2' });
        
        // This test assumes getAll accepts status filter based on MissionFilter
        const pending = await ops.getAll({ status: 'pending' });
        expect(pending.every(m => m.status === 'pending')).toBe(true);
      });
    });

    describe('update()', () => {
      it('updates mission fields', async () => {
        const mission = await ops.create({ title: 'Original' });
        const updated = await ops.update(mission.id, { 
          title: 'Updated',
          description: 'New description'
        });
        
        expect(updated).not.toBeNull();
        expect(updated!.title).toBe('Updated');
        expect(updated!.description).toBe('New description');
      });

      it('returns null for non-existent mission', async () => {
        const result = await ops.update('msn-nonexistent', { title: 'Updated' });
        expect(result).toBeNull();
      });
    });

    describe('delete()', () => {
      it('deletes existing mission', async () => {
        const mission = await ops.create({ title: 'To Delete' });
        const deleted = await ops.delete(mission.id);
        
        expect(deleted).toBe(true);
        
        const retrieved = await ops.getById(mission.id);
        expect(retrieved).toBeNull();
      });

      it('returns false for non-existent mission', async () => {
        const deleted = await ops.delete('msn-nonexistent');
        expect(deleted).toBe(false);
      });
    });
  });
}

/**
 * Contract test suite for SortieOps
 */
export function testSortieOpsContract(
  createOps: () => SortieOps,
  cleanup?: () => Promise<void>
): void {
  describe('SortieOps Contract', () => {
    let ops: SortieOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('create()', () => {
      it('returns Sortie with required fields', async () => {
        const sortie = await ops.create({ title: 'Test Sortie' });
        
        expect(sortie.id).toMatch(/^srt-[a-z0-9]+$/);
        expect(sortie.title).toBe('Test Sortie');
        expect(sortie.status).toBe('pending');
        expect(sortie.progress).toBe(0);
      });
    });

    describe('getById()', () => {
      it('returns Sortie when exists', async () => {
        const created = await ops.create({ title: 'Test' });
        const retrieved = await ops.getById(created.id);
        
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null when not exists', async () => {
        const result = await ops.getById('srt-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('getByMission()', () => {
      it('returns sorties for mission', async () => {
        const missionId = 'msn-test';
        await ops.create({ title: 'Sortie 1', mission_id: missionId });
        await ops.create({ title: 'Sortie 2', mission_id: missionId });
        await ops.create({ title: 'Sortie 3', mission_id: 'other' });
        
        const missionSorties = await ops.getByMission(missionId);
        expect(missionSorties.length).toBe(2);
        expect(missionSorties.every(s => s.mission_id === missionId)).toBe(true);
      });
    });

    describe('update()', () => {
      it('updates sortie fields', async () => {
        const sortie = await ops.create({ title: 'Original' });
        const updated = await ops.update(sortie.id, { 
          title: 'Updated',
          description: 'New description'
        });
        
        expect(updated).not.toBeNull();
        expect(updated!.title).toBe('Updated');
        expect(updated!.description).toBe('New description');
      });
    });

    describe('delete()', () => {
      it('deletes existing sortie', async () => {
        const sortie = await ops.create({ title: 'To Delete' });
        const deleted = await ops.delete(sortie.id);
        
        expect(deleted).toBe(true);
        
        const retrieved = await ops.getById(sortie.id);
        expect(retrieved).toBeNull();
      });
    });
  });
}

/**
 * Contract test suite for LockOps
 */
export function testLockOpsContract(
  createOps: () => LockOps,
  cleanup?: () => Promise<void>
): void {
  describe('LockOps Contract', () => {
    let ops: LockOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('acquire()', () => {
      it('returns Lock when file is available', async () => {
        const result = await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-1',
          timeout_ms: 30000
        });
        
        expect(result.conflict).toBe(false);
        expect(result.lock).toBeDefined();
        expect(result.lock!.file).toBe('/test/file.ts');
        expect(result.lock!.status).toBe('active');
      });

      it('returns conflict when file is locked', async () => {
        await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-1',
          timeout_ms: 30000
        });
        
        const result = await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-2',
          timeout_ms: 30000
        });
        
        expect(result.conflict).toBe(true);
        expect(result.existing_lock).toBeDefined();
        expect(result.existing_lock!.reserved_by).toBe('spec-1');
      });
    });

    describe('getById()', () => {
      it('returns lock when exists', async () => {
        const { lock } = await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-1',
          timeout_ms: 30000
        });
        
        const retrieved = await ops.getById(lock!.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(lock!.id);
      });

      it('returns null when not exists', async () => {
        const result = await ops.getById('lock-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('getAll()', () => {
      it('returns all locks', async () => {
        await ops.acquire({ file: '/test/file1.ts', specialist_id: 'spec-1', timeout_ms: 30000 });
        await ops.acquire({ file: '/test/file2.ts', specialist_id: 'spec-2', timeout_ms: 30000 });
        
        const locks = await ops.getAll();
        expect(locks.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('forceRelease()', () => {
      it('releases lock when forced', async () => {
        const { lock } = await ops.acquire({
          file: '/test/file.ts',
          specialist_id: 'spec-1',
          timeout_ms: 30000
        });
        
        const released = await ops.forceRelease(lock!.id);
        expect(released).toBe(true);
      });
    });
  });
}

/**
 * Contract test suite for EventOps
 */
export function testEventOpsContract(
  createOps: () => EventOps,
  cleanup?: () => Promise<void>
): void {
  describe('EventOps Contract', () => {
    let ops: EventOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('append()', () => {
      it('appends event with sequence number', async () => {
        const event = await ops.append({
          event_type: 'test_event',
          stream_type: 'mission',
          stream_id: 'msn-test',
          data: { test: true }
        });
        
        expect(event.event_id).toMatch(/^evt-[a-z0-9]+$/);
        expect(event.event_type).toBe('test_event');
        expect(event.stream_type).toBe('mission');
        expect(event.stream_id).toBe('msn-test');
        expect(event.sequence_number).toBeGreaterThan(0);
        expect(event.occurred_at).toBeDefined();
        expect(event.recorded_at).toBeDefined();
      });
    });

    describe('queryByStream()', () => {
      it('returns events for stream', async () => {
        await ops.append({ event_type: 'event1', stream_type: 'mission', stream_id: 'msn-test', data: {} });
        await ops.append({ event_type: 'event2', stream_type: 'mission', stream_id: 'msn-test', data: {} });
        await ops.append({ event_type: 'event3', stream_type: 'mission', stream_id: 'other', data: {} });
        
        const events = await ops.queryByStream('mission', 'msn-test');
        expect(events.length).toBe(2);
        expect(events.every(e => e.stream_id === 'msn-test')).toBe(true);
      });
    });

    describe('getLatestByStream()', () => {
      it('returns latest event for stream', async () => {
        const event1 = await ops.append({ 
          event_type: 'event1', stream_type: 'mission', stream_id: 'msn-test', data: {},
          occurred_at: '2025-01-01T00:00:00.000Z'
        });
        const event2 = await ops.append({ 
          event_type: 'event2', stream_type: 'mission', stream_id: 'msn-test', data: {},
          occurred_at: '2025-01-01T01:00:00.000Z'
        });
        
        const latest = await ops.getLatestByStream('mission', 'msn-test');
        expect(latest).not.toBeNull();
        expect(latest!.event_id).toBe(event2.event_id);
      });
    });
  });
}

/**
 * Contract test suite for CheckpointOps
 */
export function testCheckpointOpsContract(
  createOps: () => CheckpointOps,
  cleanup?: () => Promise<void>
): void {
  describe('CheckpointOps Contract', () => {
    let ops: CheckpointOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('save()', () => {
      it('creates checkpoint with required fields', async () => {
        const checkpoint = await ops.save({
          mission_id: 'msn-test',
          trigger: 'manual',
          created_by: 'test'
        });
        
        expect(checkpoint.id).toMatch(/^chk-[a-z0-9]+$/);
        expect(checkpoint.mission_id).toBe('msn-test');
        expect(checkpoint.trigger).toBe('manual');
        expect(checkpoint.version).toBe('1.0.0');
      });
    });

    describe('getById()', () => {
      it('returns checkpoint when exists', async () => {
        const created = await ops.save({
          mission_id: 'msn-test',
          trigger: 'manual',
          created_by: 'test'
        });
        
        const retrieved = await ops.getById(created.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null when not exists', async () => {
        const result = await ops.getById('chk-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('getLatestByMission()', () => {
      it('returns most recent checkpoint', async () => {
        await ops.save({
          mission_id: 'msn-test',
          trigger: 'progress',
          created_by: 'test'
        });
        
        const latest = await ops.save({
          mission_id: 'msn-test',
          trigger: 'manual',
          created_by: 'test'
        });
        
        const retrieved = await ops.getLatestByMission('msn-test');
        expect(retrieved?.id).toBe(latest.id);
      });

      it('returns null when no checkpoints', async () => {
        const result = await ops.getLatestByMission('msn-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('delete()', () => {
      it('deletes existing checkpoint', async () => {
        const checkpoint = await ops.save({
          mission_id: 'msn-test',
          trigger: 'manual',
          created_by: 'test'
        });
        
        const deleted = await ops.delete(checkpoint.id);
        expect(deleted).toBe(true);
        
        const retrieved = await ops.getById(checkpoint.id);
        expect(retrieved).toBeNull();
      });
    });
  });
}

/**
 * Contract test suite for SpecialistOps
 */
export function testSpecialistOpsContract(
  createOps: () => SpecialistOps,
  cleanup?: () => Promise<void>
): void {
  describe('SpecialistOps Contract', () => {
    let ops: SpecialistOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('register()', () => {
      it('registers specialist with required fields', async () => {
        const specialist = await ops.register({ name: 'Test Specialist' });
        
        expect(specialist.id).toMatch(/^spec-[a-z0-9]+$/);
        expect(specialist.name).toBe('Test Specialist');
        expect(specialist.status).toBe('active');
        expect(specialist.registered_at).toBeDefined();
      });
    });

    describe('getById()', () => {
      it('returns specialist when exists', async () => {
        const created = await ops.register({ name: 'Test' });
        const retrieved = await ops.getById(created.id);
        
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null when not exists', async () => {
        const result = await ops.getById('spec-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('updateStatus()', () => {
      it('updates specialist status', async () => {
        const specialist = await ops.register({ name: 'Test' });
        const success = await ops.updateStatus(specialist.id, 'busy');
        
        expect(success).toBe(true);
      });
    });

    describe('heartbeat()', () => {
      it('updates last seen timestamp', async () => {
        const specialist = await ops.register({ name: 'Test' });
        const success = await ops.heartbeat(specialist.id);
        
        expect(success).toBe(true);
      });
    });
  });
}

/**
 * Contract test suite for MessageOps
 */
export function testMessageOpsContract(
  createOps: () => MessageOps,
  cleanup?: () => Promise<void>
): void {
  describe('MessageOps Contract', () => {
    let ops: MessageOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('send()', () => {
      it('sends message with required fields', async () => {
        const message = await ops.send({
          mailbox_id: 'mbx-test',
          message_type: 'test_message',
          content: { test: true }
        });
        
        expect(message.id).toMatch(/^msg-[a-z0-9]+$/);
        expect(message.mailbox_id).toBe('mbx-test');
        expect(message.message_type).toBe('test_message');
        expect(message.status).toBe('pending');
        expect(message.sent_at).toBeDefined();
      });
    });

    describe('getById()', () => {
      it('returns message when exists', async () => {
        const created = await ops.send({
          mailbox_id: 'mbx-test',
          message_type: 'test_message',
          content: { test: true }
        });
        
        const retrieved = await ops.getById(created.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null when not exists', async () => {
        const result = await ops.getById('msg-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('getByMailbox()', () => {
      it('returns messages for mailbox', async () => {
        await ops.send({ mailbox_id: 'mbx-test', message_type: 'msg1', content: {} });
        await ops.send({ mailbox_id: 'mbx-test', message_type: 'msg2', content: {} });
        await ops.send({ mailbox_id: 'other', message_type: 'msg3', content: {} });
        
        const messages = await ops.getByMailbox('mbx-test');
        expect(messages.length).toBe(2);
        expect(messages.every(m => m.mailbox_id === 'mbx-test')).toBe(true);
      });
    });
  });
}

/**
 * Contract test suite for CursorOps
 */
export function testCursorOpsContract(
  createOps: () => CursorOps,
  cleanup?: () => Promise<void>
): void {
  describe('CursorOps Contract', () => {
    let ops: CursorOps;

    beforeEach(async () => {
      ops = createOps();
      if (cleanup) await cleanup();
    });

    describe('create()', () => {
      it('creates cursor with required fields', async () => {
        const cursor = await ops.create({
          stream_type: 'mission',
          stream_id: 'msn-test',
          position: 0
        });
        
        expect(cursor.id).toBeDefined();
        expect(cursor.stream_type).toBe('mission');
        expect(cursor.stream_id).toBe('msn-test');
        expect(cursor.position).toBe(0);
        expect(cursor.created_at).toBeDefined();
      });
    });

    describe('getById()', () => {
      it('returns cursor when exists', async () => {
        const created = await ops.create({
          stream_type: 'mission',
          stream_id: 'msn-test',
          position: 0
        });
        
        const retrieved = await ops.getById(created.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null when not exists', async () => {
        const result = await ops.getById('cursor-nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('getByStream()', () => {
      it('returns cursor for stream', async () => {
        await ops.create({
          stream_type: 'mission',
          stream_id: 'msn-test',
          position: 5
        });
        
        const cursor = await ops.getByStream('msn-test');
        expect(cursor).not.toBeNull();
        expect(cursor!.position).toBe(5);
      });
    });
  });
}