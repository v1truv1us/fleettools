import { describe } from 'bun:test';
import { testEventOpsContract } from '../helpers/contract-tests';
import { mockDatabase, resetMockStorage } from '../helpers/mock-database';

describe('EventOps Contract Tests', () => {
  // Test Mock Implementation
  describe('Mock Implementation', () => {
    testEventOpsContract(
      () => mockDatabase.events,
      async () => resetMockStorage()
    );
  });
});