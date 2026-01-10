import { describe } from 'bun:test';
import { testSortieOpsContract } from '../helpers/contract-tests';
import { mockDatabase, resetMockStorage } from '../helpers/mock-database';

describe('SortieOps Contract Tests', () => {
  // Test Mock Implementation
  describe('Mock Implementation', () => {
    testSortieOpsContract(
      () => mockDatabase.sorties,
      async () => resetMockStorage()
    );
  });
});