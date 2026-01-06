#!/usr/bin/env bun
// @ts-nocheck
// FleetTools Consolidated API Test Script
// Tests all endpoints for the consolidated server

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Colors for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;
let skipped = 0;

// Helper to make requests
async function request(method: string, path: string, body?: any, expectedStatus = 200) {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: String(error) },
      ok: false,
      error,
    };
  }
}

// Test helper
async function test(name: string, fn: () => Promise<boolean>) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    if (result) {
      console.log(`${GREEN}✓${RESET} ${name} (${duration}ms)`);
      passed++;
    } else {
      console.log(`${RED}✗${RESET} ${name} (${duration}ms)`);
      failed++;
    }
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name} - ${String(error)}`);
    failed++;
  }
}

// Skip helper
function skip(name: string, reason: string) {
  console.log(`${YELLOW}⊘${RESET} ${name} - ${reason}`);
  skipped++;
}

// Main test suite
async function runTests() {
  console.log('\n=== FleetTools Consolidated API Tests ===\n');

  // Health check
  console.log('--- Health Check ---');
  await test('GET /health returns healthy status', async () => {
    const res = await request('GET', '/health');
    return res.status === 200 && res.data.status === 'healthy';
  });

  // Work Orders
  console.log('\n--- Work Orders ---');
  
  let workOrderId: string | null = null;

  await test('POST /api/v1/work-orders creates a work order', async () => {
    const res = await request('POST', '/api/v1/work-orders', {
      title: 'Test Work Order',
      description: 'A test work order created by the test script',
      priority: 'high',
      assigned_to: ['specialist-1', 'specialist-2'],
    });
    if (res.status === 201 && res.data.work_order) {
      workOrderId = res.data.work_order.id;
      return true;
    }
    return false;
  });

  await test('GET /api/v1/work-orders lists work orders', async () => {
    const res = await request('GET', '/api/v1/work-orders');
    return res.status === 200 && Array.isArray(res.data.work_orders);
  });

  if (workOrderId) {
    await test('GET /api/v1/work-orders/:id returns work order', async () => {
      const res = await request('GET', `/api/v1/work-orders/${workOrderId}`);
      return res.status === 200 && res.data.work_order?.id === workOrderId;
    });

    await test('PATCH /api/v1/work-orders/:id updates work order', async () => {
      const res = await request('PATCH', `/api/v1/work-orders/${workOrderId}`, {
        status: 'in_progress',
        priority: 'critical',
      });
      return res.status === 200 && res.data.work_order?.status === 'in_progress';
    });
  } else {
    skip('GET /api/v1/work-orders/:id returns work order', 'No work order created');
    skip('PATCH /api/v1/work-orders/:id updates work order', 'No work order created');
  }

  // CTK Reservations
  console.log('\n--- CTK Reservations ---');

  let reservationId: string | null = null;

  await test('POST /api/v1/ctk/reserve creates a reservation', async () => {
    const res = await request('POST', '/api/v1/ctk/reserve', {
      file: '/test/example.txt',
      specialist_id: 'specialist-1',
      purpose: 'edit',
    });
    if (res.status === 201 && res.data.reservation) {
      reservationId = res.data.reservation.id;
      return true;
    }
    return false;
  });

  await test('GET /api/v1/ctk/reservations lists reservations', async () => {
    const res = await request('GET', '/api/v1/ctk/reservations');
    return res.status === 200 && Array.isArray(res.data.reservations);
  });

  if (reservationId) {
    await test('POST /api/v1/ctk/release releases reservation', async () => {
      const res = await request('POST', '/api/v1/ctk/release', {
        reservation_id: reservationId,
      });
      return res.status === 200 && res.data.reservation?.released_at !== null;
    });
  } else {
    skip('POST /api/v1/ctk/release releases reservation', 'No reservation created');
  }

  // Tech Orders
  console.log('\n--- Tech Orders ---');

  let techOrderId: string | null = null;

  await test('POST /api/v1/tech-orders creates a tech order', async () => {
    const res = await request('POST', '/api/v1/tech-orders', {
      name: 'React Component Pattern',
      pattern: 'createComponent(name, props)',
      context: 'Component creation in React applications',
    });
    if (res.status === 201 && res.data.tech_order) {
      techOrderId = res.data.tech_order.id;
      return true;
    }
    return false;
  });

  await test('GET /api/v1/tech-orders lists tech orders', async () => {
    const res = await request('GET', '/api/v1/tech-orders');
    return res.status === 200 && Array.isArray(res.data.tech_orders);
  });

  // Mailbox
  console.log('\n--- Mailbox ---');

  await test('POST /api/v1/mailbox/append appends events', async () => {
    const res = await request('POST', '/api/v1/mailbox/append', {
      stream_id: 'test-stream-1',
      events: [
        { type: 'TaskStarted', data: { task_id: 'task-1' } },
        { type: 'TaskCompleted', data: { task_id: 'task-1', result: 'success' } },
      ],
    });
    return res.status === 200 && res.data.inserted === 2;
  });

  await test('GET /api/v1/mailbox/:streamId returns mailbox', async () => {
    const res = await request('GET', '/api/v1/mailbox/test-stream-1');
    return res.status === 200 && res.data.mailbox?.id === 'test-stream-1';
  });

  // Cursor
  console.log('\n--- Cursor ---');

  await test('POST /api/v1/cursor/advance advances cursor', async () => {
    const res = await request('POST', '/api/v1/cursor/advance', {
      stream_id: 'test-stream-1',
      position: 5,
    });
    return res.status === 200 && res.data.cursor?.position === 5;
  });

  await test('GET /api/v1/cursor/:cursorId returns cursor', async () => {
    const res = await request('GET', '/api/v1/cursor/test-stream-1_cursor');
    return res.status === 200 && res.data.cursor?.stream_id === 'test-stream-1';
  });

  // Locks
  console.log('\n--- Locks ---');

  let lockId: string | null = null;

  await test('POST /api/v1/lock/acquire acquires lock', async () => {
    const res = await request('POST', '/api/v1/lock/acquire', {
      file: '/test/locked-file.txt',
      specialist_id: 'specialist-lock-1',
      timeout_ms: 60000,
    });
    if (res.status === 200 && res.data.lock) {
      lockId = res.data.lock.id;
      return true;
    }
    return false;
  });

  await test('GET /api/v1/locks lists locks', async () => {
    const res = await request('GET', '/api/v1/locks');
    return res.status === 200 && Array.isArray(res.data.locks);
  });

  if (lockId) {
    await test('POST /api/v1/lock/release releases lock', async () => {
      const res = await request('POST', '/api/v1/lock/release', {
        lock_id: lockId,
        specialist_id: 'specialist-lock-1',
      });
      return res.status === 200 && res.data.lock?.released_at !== null;
    });
  } else {
    skip('POST /api/v1/lock/release releases lock', 'No lock acquired');
  }

  // Coordinator
  console.log('\n--- Coordinator ---');

  await test('GET /api/v1/coordinator/status returns status', async () => {
    const res = await request('GET', '/api/v1/coordinator/status');
    return res.status === 200 && 
           typeof res.data.active_mailboxes === 'number' &&
           typeof res.data.active_locks === 'number';
  });

  // Cleanup - Delete work order
  if (workOrderId) {
    await test('DELETE /api/v1/work-orders/:id deletes work order', async () => {
      const res = await request('DELETE', `/api/v1/work-orders/${workOrderId}`);
      return res.status === 204;
    });
  } else {
    skip('DELETE /api/v1/work-orders/:id deletes work order', 'No work order created');
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`${GREEN}Passed: ${passed}${RESET}`);
  console.log(`${RED}Failed: ${failed}${RESET}`);
  console.log(`${YELLOW}Skipped: ${skipped}${RESET}`);
  console.log(`Total: ${passed + failed + skipped}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Check if server is running first
async function checkServer() {
  console.log(`Checking if server is running at ${BASE_URL}...`);
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`${GREEN}Server is running: ${data.status}${RESET}\n`);
      return true;
    }
  } catch (error) {
    console.log(`${RED}Server is not responding${RESET}`);
    console.log(`Make sure to start the server first:`);
    console.log(`  cd server/api && bun run src/index.ts\n`);
    return false;
  }
}

// Run
checkServer().then(running => {
  if (running) {
    runTests();
  } else {
    process.exit(1);
  }
});
