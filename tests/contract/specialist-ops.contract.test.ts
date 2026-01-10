import { describe } from 'bun:test';
import { testSpecialistOpsContract } from '../helpers/contract-tests';
import { mockDatabase, resetMockStorage } from '../helpers/mock-database';

describe('SpecialistOps Contract Tests', () => {
  // Test Mock Implementation
  describe('Mock Implementation', () => {
    testSpecialistOpsContract(
      () => mockDatabase.specialists,
      async () => resetMockStorage()
    );
  });
});