import { describe } from 'bun:test';
import { testCheckpointOpsContract } from '../helpers/contract-tests';
import { mockDatabase, resetMockStorage } from '../helpers/mock-database';

describe('CheckpointOps Contract Tests', () => {
  // Test Mock Implementation
  describe('Mock Implementation', () => {
    testCheckpointOpsContract(
      () => mockDatabase.checkpoints,
      async () => resetMockStorage()
    );
  });
});