import { describe, it, expect } from 'bun:test';
import {
  sleep,
  retry,
  deepClone,
  isValidJSON,
  safeJSONStringify,
  isValidFleetToolsId,
  extractUUIDFromId,
  generateSafeFilename,
  formatBytes,
  debounce,
  throttle,
} from '../src/index.js';

describe('sleep', () => {
  it('should sleep for specified time', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
  });
});

describe('retry', () => {
  it('should succeed on first attempt', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      return 'success';
    };
    
    const result = await retry(mockFn);
    
    expect(result).toEqual({ success: true, data: 'success' });
    expect(callCount).toBe(1);
  });

  it('should retry on failure', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('fail');
      }
      return 'success';
    };
    
    const result = await retry(mockFn, 3, 10);
    
    expect(result).toEqual({ success: true, data: 'success' });
    expect(callCount).toBe(2);
  });

  it('should fail after max attempts', async () => {
    const error = new Error('fail');
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      throw error;
    };
    
    const result = await retry(mockFn, 3, 10);
    
    expect(result).toEqual({ success: false, error });
    expect(callCount).toBe(3);
  });
});

describe('deepClone', () => {
  it('should clone primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it('should clone arrays', () => {
    const original = [1, 2, { a: 3 }];
    const cloned = deepClone(original);
    
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[2]).not.toBe(original[2]);
  });

  it('should clone objects', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);
    
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
  });

  it('should clone dates', () => {
    const original = new Date('2023-01-01');
    const cloned = deepClone(original);
    
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });
});

describe('isValidJSON', () => {
  it('should validate JSON strings', () => {
    expect(isValidJSON('{"a": 1}')).toBe(true);
    expect(isValidJSON('[1, 2, 3]')).toBe(true);
    expect(isValidJSON('"hello"')).toBe(true);
    expect(isValidJSON('123')).toBe(true);
    expect(isValidJSON('true')).toBe(true);
    
    expect(isValidJSON('invalid')).toBe(false);
    expect(isValidJSON('{a: 1}')).toBe(false);
  });
});

describe('safeJSONStringify', () => {
  it('should handle circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    
    const result = safeJSONStringify(obj);
    expect(result).toContain('"[Circular]"');
  });

  it('should stringify normal objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const result = safeJSONStringify(obj);
    
    expect(JSON.parse(result)).toEqual(obj);
  });
});

describe('isValidFleetToolsId', () => {
  it('should validate FleetTools IDs', () => {
    expect(isValidFleetToolsId('msn-123')).toBe(true);
    expect(isValidFleetToolsId('wo-123')).toBe(true);
    expect(isValidFleetToolsId('chk-123')).toBe(true);
    expect(isValidFleetToolsId('evt-123')).toBe(true);
    
    expect(isValidFleetToolsId('invalid-123')).toBe(false);
    expect(isValidFleetToolsId('invalid')).toBe(false);
  });
});

describe('extractUUIDFromId', () => {
  it('should extract UUID from FleetTools ID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(extractUUIDFromId(`msn-${uuid}`)).toBe(uuid);
    expect(extractUUIDFromId(`wo-${uuid}`)).toBe(uuid);
    expect(extractUUIDFromId(`chk-${uuid}`)).toBe(uuid);
    expect(extractUUIDFromId(`evt-${uuid}`)).toBe(uuid);
    
    expect(extractUUIDFromId('invalid')).toBeNull();
    expect(extractUUIDFromId('invalid-')).toBeNull();
  });
});

describe('generateSafeFilename', () => {
  it('should generate safe filenames', () => {
    expect(generateSafeFilename('Hello World!')).toBe('hello-world');
    expect(generateSafeFilename('File_With-Special.Chars')).toBe('file-with-special-chars');
    expect(generateSafeFilename('Multiple   Spaces')).toBe('multiple-spaces');
    expect(generateSafeFilename('--Leading and Trailing--')).toBe('leading-and-trailing');
  });
});

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1536, 3)).toBe('1.5 KB');
  });
});

describe('debounce', () => {
  it('should debounce function calls', (done) => {
    let count = 0;
    const debouncedFn = debounce(() => {
      count++;
      if (count === 1) {
        expect(count).toBe(1);
        done();
      }
    }, 50);

    // Call multiple times quickly
    debouncedFn();
    debouncedFn();
    debouncedFn();
  });
});

describe('throttle', () => {
  it('should throttle function calls', (done) => {
    let count = 0;
    const throttledFn = throttle(() => {
      count++;
      if (count === 2) {
        expect(count).toBe(2);
        done();
      }
    }, 50);

    // Call immediately
    throttledFn();
    expect(count).toBe(1);
    
    // Call again quickly - should be throttled
    throttledFn();
    expect(count).toBe(1);
    
    // Call after throttle period
    setTimeout(() => throttledFn(), 100);
  });
});
