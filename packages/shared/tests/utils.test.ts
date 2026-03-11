import { describe, it, expect, beforeEach } from 'bun:test';
import {
  colors,
  colorize,
  commandExists,
  sleep,
  formatBytes,
  formatDuration,
  generateId,
  deepClone,
  isPromise,
  FleetEventEmitter
} from '../src/utils.js';

describe('General Utilities', () => {
  describe('colors', () => {
    it('should have all color codes', () => {
      expect(colors.reset).toBe('\x1b[0m');
      expect(colors.bright).toBe('\x1b[1m');
      expect(colors.red).toBe('\x1b[31m');
      expect(colors.green).toBe('\x1b[32m');
      expect(colors.yellow).toBe('\x1b[33m');
      expect(colors.blue).toBe('\x1b[34m');
      expect(colors.magenta).toBe('\x1b[35m');
      expect(colors.cyan).toBe('\x1b[36m');
      expect(colors.white).toBe('\x1b[37m');
      expect(colors.gray).toBe('\x1b[90m');
    });
  });

  describe('colorize', () => {
    it('should colorize text with reset', () => {
      const colored = colorize('test', 'red');
      expect(colored).toBe('\x1b[31mtest\x1b[0m');
    });

    it('should work with basic colors', () => {
      const text = 'test';
      expect(colorize(text, 'red')).toContain(colors.red);
      expect(colorize(text, 'green')).toContain(colors.green);
      expect(colorize(text, 'blue')).toContain(colors.blue);
    });
  });

  describe('commandExists', () => {
    it('should return true for existing commands', () => {
      expect(commandExists('node')).toBe(true);
      expect(commandExists('bun')).toBe(true);
    });

    it('should return false for non-existing commands', () => {
      expect(commandExists('nonexistent-command-12345')).toBe(false);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified time', async () => {
      const start = Date.now();
      await sleep(50); // Reduced time for faster tests
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(40); // Allow some tolerance
    });
  });

  describe('formatBytes', () => {
    it('should format basic byte sizes', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(1500)).toBe('1s');
      expect(formatDuration(59000)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(61000)).toBe('1m 1s');
      expect(formatDuration(3599000)).toBe('59m 59s');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(3660000)).toBe('1h 1m');
    });

    it('should format days and hours', () => {
      expect(formatDuration(86400000)).toBe('1d 0h');
      expect(formatDuration(90000000)).toBe('1d 1h');
      expect(formatDuration(172800000)).toBe('2d 0h');
    });
  });

  describe('generateId', () => {
    it('should generate ID with default length', () => {
      const id = generateId();
      expect(id).toHaveLength(8);
      expect(/^[a-z0-9]+$/.test(id)).toBe(true);
    });

    it('should generate ID with custom length', () => {
      const id = generateId(12);
      expect(id).toHaveLength(12);
      expect(/^[a-z0-9]+$/.test(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('deepClone', () => {
    it('should clone primitives', () => {
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
      expect(deepClone(42)).toBe(42);
      expect(deepClone('test')).toBe('test');
      expect(deepClone(true)).toBe(true);
    });

    it('should clone dates', () => {
      const date = new Date();
      const cloned = deepClone(date);
      
      expect(cloned).not.toBe(date);
      expect(cloned.getTime()).toBe(date.getTime());
    });

    it('should clone arrays', () => {
      const arr = [1, 2, { nested: 'value' }];
      const cloned = deepClone(arr);
      
      expect(cloned).not.toBe(arr);
      expect(cloned).toEqual(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone objects', () => {
      const obj = {
        str: 'test',
        num: 42,
        nested: { value: 'nested' },
        arr: [1, 2, 3]
      };
      const cloned = deepClone(obj);
      
      expect(cloned).not.toBe(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.nested).not.toBe(obj.nested);
      expect(cloned.arr).not.toBe(obj.arr);
    });
  });

  describe('isPromise', () => {
    it('should identify promises', () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
      expect(isPromise({ then: () => {} })).toBe(true);
    });

    it('should identify non-promises', () => {
      expect(isPromise(null)).toBe(false);
      expect(isPromise(undefined)).toBe(false);
      expect(isPromise(42)).toBe(false);
      expect(isPromise('test')).toBe(false);
      expect(isPromise({})).toBe(false);
      expect(isPromise([])).toBe(false);
      expect(isPromise({ then: 'not a function' })).toBe(false);
    });
  });

  describe('FleetEventEmitter', () => {
    let emitter: FleetEventEmitter;

    beforeEach(() => {
      emitter = new FleetEventEmitter();
    });

    it('should add and emit events', () => {
      let callCount = 0;
      let receivedArgs: any[] = [];
      
      const listener = (...args: any[]) => {
        callCount++;
        receivedArgs = args;
      };
      
      emitter.on('test', listener);
      emitter.emit('test', 'arg1', 'arg2');
      
      expect(callCount).toBe(1);
      expect(receivedArgs).toEqual(['arg1', 'arg2']);
    });

    it('should handle multiple listeners', () => {
      let callCount1 = 0;
      let callCount2 = 0;
      
      const listener1 = () => { callCount1++; };
      const listener2 = () => { callCount2++; };
      
      emitter.on('test', listener1);
      emitter.on('test', listener2);
      emitter.emit('test', 'data');
      
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
    });

    it('should remove listeners', () => {
      let callCount = 0;
      const listener = () => { callCount++; };
      
      emitter.on('test', listener);
      emitter.off('test', listener);
      emitter.emit('test', 'data');
      
      expect(callCount).toBe(0);
    });

    it('should remove all listeners', () => {
      let callCount1 = 0;
      let callCount2 = 0;
      const listener1 = () => { callCount1++; };
      const listener2 = () => { callCount2++; };
      
      emitter.on('event1', listener1);
      emitter.on('event2', listener2);
      emitter.removeAllListeners();
      emitter.emit('event1');
      emitter.emit('event2');
      
      expect(callCount1).toBe(0);
      expect(callCount2).toBe(0);
    });

    it('should handle emitting events with no listeners', () => {
      expect(() => emitter.emit('nonexistent')).not.toThrow();
    });
  });
});