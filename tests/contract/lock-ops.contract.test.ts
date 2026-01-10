import { describe } from 'bun:test';
import { testLockOpsContract } from '../helpers/contract-tests';
import { mockDatabase, resetMockStorage } from '../helpers/mock-database';

describe('LockOps Contract Tests', () => {
  // Test Mock Implementation
  describe('Mock Implementation', () => {
    testLockOpsContract(
      () => mockDatabase.locks,
      async () => resetMockStorage()
    );
  });
});