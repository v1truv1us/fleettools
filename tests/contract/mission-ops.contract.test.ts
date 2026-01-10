import { describe } from 'bun:test';
import { testMissionOpsContract } from '../helpers/contract-tests';
import { mockDatabase, resetMockStorage } from '../helpers/mock-database';

describe('MissionOps Contract Tests', () => {
  // Test Mock Implementation
  describe('Mock Implementation', () => {
    testMissionOpsContract(
      () => mockDatabase.missions,
      async () => resetMockStorage()
    );
  });
});