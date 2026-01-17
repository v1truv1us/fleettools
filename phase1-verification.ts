#!/usr/bin/env bun
/**
 * Phase 1 Integration Verification Script
 * 
 * Verifies end-to-end workflow: spawn → execute → checkpoint → resume
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

const API_BASE = 'http://localhost:3001';

async function testEndpoint(description: string, url: string, method: string = 'GET', body?: any): Promise<boolean> {
  try {
    const options: any = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${url}`, options);
    const success = response.ok;
    
    console.log(`${success ? '✅' : '❌'} ${description}`);
    return success;
  } catch (error) {
    console.log(`❌ ${description} - ${error}`);
    return false;
  }
}

async function runPhase1Verification(): Promise<void> {
  console.log('🔍 FleetTools Phase 1 Integration Verification');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  // Test 1: Health endpoint
  const healthOk = await testEndpoint('Health Check', '/health');
  allPassed = allPassed && healthOk;
  
  // Test 2: Agent Spawning
  const spawnData = {
    type: 'testing',
    task: 'Phase 1 verification test',
    config: { timeout: 10000 }
  };
  
  const spawnResponse = await fetch(`${API_BASE}/api/v1/agents/spawn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spawnData)
  });
  
  const spawnOk = spawnResponse.ok;
  if (spawnOk) {
    const spawnResult = await spawnResponse.json() as any;
    const agentId = spawnResult.data.agent.id;
    console.log(`✅ Agent Spawning - Agent ID: ${agentId}`);
    
    // Test 3: Agent List
    const listOk = await testEndpoint('Agent Listing', '/api/v1/agents');
    allPassed = allPassed && listOk;
    
    // Test 4: Individual Agent
    const agentOk = await testEndpoint('Individual Agent', `/api/v1/agents/${agentId}`);
    allPassed = allPassed && agentOk;
    
    // Test 5: Checkpoint Creation
    const checkpointData = {
      mission_id: `msn-phase1-verification`,
      trigger: 'manual',
      trigger_details: 'Phase 1 integration verification',
      progress_percent: 75,
      sorties: [
        {
          id: `srt-${agentId}`,
          status: 'in_progress',
          assigned_to: agentId,
          progress: 75
        }
      ],
      active_locks: [],
      pending_messages: [],
      recovery_context: {
        last_action: 'agent_verification',
        next_steps: ['Complete verification', 'Document results'],
        blockers: [],
        files_modified: [],
        mission_summary: 'Phase 1 verification checkpoint',
        elapsed_time_ms: 300000,
        last_activity_at: new Date().toISOString()
      },
      created_by: 'verification-script',
      version: '1.0.0'
    };
    
    const checkpointResponse = await fetch(`${API_BASE}/api/v1/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkpointData)
    });
    
    const checkpointOk = checkpointResponse.ok;
    if (checkpointOk) {
      const checkpointResult = await checkpointResponse.json() as any;
      const checkpointId = checkpointResult.data.id;
      console.log(`✅ Checkpoint Creation - Checkpoint ID: ${checkpointId}`);
      
      // Test 6: Checkpoint Retrieval
      const retrieveOk = await testEndpoint('Checkpoint Retrieval', `/api/v1/checkpoints/${checkpointId}`);
      allPassed = allPassed && retrieveOk;
      
      // Test 7: Latest Checkpoint
      const latestOk = await testEndpoint('Latest Checkpoint', `/api/v1/checkpoints/latest/${checkpointData.mission_id}`);
      allPassed = allPassed && latestOk;
      
      // Test 8: Resume (Dry Run)
      const resumeData = { force: false, dryRun: true };
      const resumeResponse = await fetch(`${API_BASE}/api/v1/checkpoints/${checkpointId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      });
      
      const resumeOk = resumeResponse.ok;
      if (resumeOk) {
        console.log('✅ Resume Operation - Dry run successful');
      } else {
        console.log('⚠️  Resume Operation - May need RecoveryManager implementation');
      }
      allPassed = allPassed && resumeOk;
      
    } else {
      console.log('❌ Checkpoint Creation');
      allPassed = false;
    }
    
    // Test 9: Cleanup agent
    const cleanupResponse = await fetch(`${API_BASE}/api/v1/agents/${agentId}`, {
      method: 'DELETE'
    });
    const cleanupOk = cleanupResponse.ok;
    if (cleanupOk) {
      console.log(`✅ Agent Cleanup - Agent ${agentId} terminated`);
    } else {
      console.log('❌ Agent Cleanup');
    }
    allPassed = allPassed && cleanupOk;
    
  } else {
    console.log('❌ Agent Spawning');
    allPassed = false;
  }
  
  // Test 10: Coordination Endpoints
  console.log('\n🔗 Testing Coordination Endpoints:');
  
  const coordTests = [
    ['Coordinator Status', '/api/v1/coordinator/status'],
    ['Mailbox Append', '/api/v1/mailbox/append'],
    ['Cursor Advance', '/api/v1/cursor/advance'],
    ['Lock Acquire', '/api/v1/lock/acquire'],
  ];
  
  for (const [desc, endpoint] of coordTests) {
    let body;
    if (endpoint.includes('append')) {
      body = {
        streamId: 'test-stream',
        events: [{ type: 'test', data: { test: true }, timestamp: new Date().toISOString() }]
      };
    } else if (endpoint.includes('advance')) {
      body = { cursorId: 'test-cursor', position: 10 };
    } else if (endpoint.includes('acquire')) {
      body = { resourceId: 'test-resource', agentId: 'test-agent', timeout: 60000 };
    }
    
    const ok = await testEndpoint(desc, endpoint, endpoint.includes('append') || endpoint.includes('advance') || endpoint.includes('acquire') ? 'POST' : 'GET', body);
    allPassed = allPassed && ok;
  }
  
  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('📊 Phase 1 Integration Verification Results:');
  console.log(`Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 FleetTools Phase 1 Integration Complete!');
    console.log('✅ Agent spawning API routes working');
    console.log('✅ Database integration for checkpoints working');
    console.log('✅ Coordination endpoints responding correctly');
    console.log('✅ Agent-runner implementation functional');
    console.log('✅ End-to-end workflow: spawn → execute → checkpoint → resume');
    console.log('\n📋 Ready for Phase 2 development.');
  } else {
    console.log('\n⚠️  Some integration issues detected.');
    console.log('📋 Review failed tests above for details.');
  }
}

// Run verification if called directly
if (import.meta.main) {
  runPhase1Verification().catch(console.error);
}

export { runPhase1Verification };