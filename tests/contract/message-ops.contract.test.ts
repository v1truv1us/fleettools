import { describe } from 'bun:test';
import { testMessageOpsContract } from '../helpers/contract-tests';
import { mockDatabase, resetMockStorage } from '../helpers/mock-database';

describe('MessageOps Contract Tests', () => {
  // Test Mock Implementation
  describe('Mock Implementation', () => {
    testMessageOpsContract(
      () => mockDatabase.messages,
      async () => resetMockStorage()
    );
  });
});