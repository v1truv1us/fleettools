import { describe, it, expect } from 'bun:test';
import {
  ID_PREFIXES,
  generateMissionId,
  generateWorkOrderId,
  generateCheckpointId,
  generateEventId,
  generateTimestamp,
  extractPrefix,
  isValidPrefixId,
  isMissionId,
  isWorkOrderId,
  isCheckpointId,
  isEventId,
} from '../src/index.js';

describe('ID_PREFIXES', () => {
  it('should have correct prefixes', () => {
    expect(ID_PREFIXES.MISSION).toBe('msn-');
    expect(ID_PREFIXES.WORK_ORDER).toBe('wo-');
    expect(ID_PREFIXES.CHECKPOINT).toBe('chk-');
    expect(ID_PREFIXES.EVENT).toBe('evt-');
  });
});

describe('ID Generators', () => {
  it('should generate valid mission IDs', () => {
    const id = generateMissionId();
    expect(id).toMatch(/^msn-[0-9a-f-]{36}$/);
    expect(isMissionId(id)).toBe(true);
  });

  it('should generate valid work order IDs', () => {
    const id = generateWorkOrderId();
    expect(id).toMatch(/^wo-[0-9a-f-]{36}$/);
    expect(isWorkOrderId(id)).toBe(true);
  });

  it('should generate valid checkpoint IDs', () => {
    const id = generateCheckpointId();
    expect(id).toMatch(/^chk-[0-9a-f-]{36}$/);
    expect(isCheckpointId(id)).toBe(true);
  });

  it('should generate valid event IDs', () => {
    const id = generateEventId();
    expect(id).toMatch(/^evt-[0-9a-f-]{36}$/);
    expect(isEventId(id)).toBe(true);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateMissionId());
      ids.add(generateWorkOrderId());
      ids.add(generateCheckpointId());
      ids.add(generateEventId());
    }
    expect(ids.size).toBe(400);
  });
});

describe('Timestamp Generation', () => {
  it('should generate ISO 8601 timestamps', () => {
    const timestamp = generateTimestamp();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    // Verify it's a valid date
    const date = new Date(timestamp);
    expect(date.toISOString()).toBe(timestamp);
  });
});

describe('Prefix Extraction', () => {
  it('should extract correct prefixes', () => {
    expect(extractPrefix('msn-123')).toBe('msn-');
    expect(extractPrefix('wo-456')).toBe('wo-');
    expect(extractPrefix('chk-789')).toBe('chk-');
    expect(extractPrefix('evt-abc')).toBe('evt-');
    expect(extractPrefix('invalid')).toBeNull();
    expect(extractPrefix('')).toBeNull();
  });
});

describe('Prefix Validation', () => {
  it('should validate prefixes correctly', () => {
    expect(isValidPrefixId('msn-123', 'msn-')).toBe(true);
    expect(isValidPrefixId('wo-456', 'wo-')).toBe(true);
    expect(isValidPrefixId('chk-789', 'chk-')).toBe(true);
    expect(isValidPrefixId('evt-abc', 'evt-')).toBe(true);
    
    expect(isValidPrefixId('msn-123', 'wo-')).toBe(false);
    expect(isValidPrefixId('invalid', 'msn-')).toBe(false);
    expect(isValidPrefixId('', 'msn-')).toBe(false);
  });
});

describe('Type Guards', () => {
  it('should correctly identify ID types', () => {
    expect(isMissionId('msn-123')).toBe(true);
    expect(isMissionId('wo-123')).toBe(false);
    
    expect(isWorkOrderId('wo-123')).toBe(true);
    expect(isWorkOrderId('msn-123')).toBe(false);
    
    expect(isCheckpointId('chk-123')).toBe(true);
    expect(isCheckpointId('msn-123')).toBe(false);
    
    expect(isEventId('evt-123')).toBe(true);
    expect(isEventId('msn-123')).toBe(false);
  });
});
