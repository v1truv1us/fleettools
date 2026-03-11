#!/usr/bin/env bun

/**
 * FleetTools Agent Coordination Demo
 * 
 * Demonstrates the comprehensive AI agent coordination system
 * with ai-eng-system integration and real-time communication.
 */

const API_BASE = 'http://localhost:3001';

interface Agent {
  id: string;
  agent_type: string;
  callsign: string;
  status: string;
  capabilities: Array<{
    id: string;
    name: string;
    trigger_words: string[];
  }>;
}

interface Assignment {
  id: string;
  agent_callsign: string;
  work_order_id: string;
  work_type: string;
  priority: string;
  status: string;
  progress_percent: number;
}

/**
 * Demo: Register specialized agents
 */
async function registerDemoAgents() {
  console.log('🤖 Registering specialized agents...');

  const agents = [
    {
      agent_type: 'full-stack-developer',
      callsign: 'FSD-001',
      capabilities: [{
        id: 'feature-implementation',
        name: 'End-to-End Feature Implementation',
        trigger_words: ['implement', 'feature', 'build', 'develop'],
      }],
      max_workload: 2,
    },
    {
      agent_type: 'code-reviewer',
      callsign: 'CR-001',
      capabilities: [{
        id: 'code-quality',
        name: 'Code Quality Review',
        trigger_words: ['review', 'quality', 'audit', 'refactor'],
      }],
      max_workload: 4,
    },
    {
      agent_type: 'architect-advisor',
      callsign: 'ARCH-001',
      capabilities: [{
        id: 'system-design',
        name: 'System Architecture Design',
        trigger_words: ['design', 'architecture', 'structure', 'scalability'],
      }],
      max_workload: 1,
    },
    {
      agent_type: 'security-scanner',
      callsign: 'SEC-001',
      capabilities: [{
        id: 'security-analysis',
        name: 'Security Vulnerability Analysis',
        trigger_words: ['security', 'vulnerability', 'auth', 'encryption'],
      }],
      max_workload: 2,
    },
    {
      agent_type: 'test-generator',
      callsign: 'TEST-001',
      capabilities: [{
        id: 'test-creation',
        name: 'Test Suite Generation',
        trigger_words: ['test', 'spec', 'verify', 'coverage'],
      }],
      max_workload: 3,
    }
  ];

  for (const agent of agents) {
    try {
      const response = await fetch(`${API_BASE}/api/v1/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Registered ${agent.callsign} (${agent.agent_type})`);
      } else {
        console.error(`❌ Failed to register ${agent.callsign}:`, await response.text());
      }
    } catch (error) {
      console.error(`❌ Error registering ${agent.callsign}:`, error);
    }
  }
}

/**
 * Demo: Create work assignments
 */
async function createDemoAssignments() {
  console.log('\n📋 Creating work assignments...');

  const workOrders = [
    {
      work_order_id: 'WO-001',
      work_type: 'implement user authentication system',
      priority: 'high',
      context: {
        description: 'Build complete authentication system with JWT tokens',
        files: ['auth.ts', 'middleware.ts'],
        estimated_hours: 8,
      }
    },
    {
      work_order_id: 'WO-002',
      work_type: 'review payment processing code',
      priority: 'medium',
      context: {
        description: 'Review payment processing for security vulnerabilities',
        files: ['payment.ts', 'billing.ts'],
        estimated_hours: 2,
      }
    },
    {
      work_order_id: 'WO-003',
      work_type: 'design microservices architecture',
      priority: 'critical',
      context: {
        description: 'Design scalable microservices architecture',
        estimated_hours: 6,
      }
    },
    {
      work_order_id: 'WO-004',
      work_type: 'test API endpoints',
      priority: 'medium',
      context: {
        description: 'Create comprehensive test suite for REST API',
        files: ['api.test.ts'],
        estimated_hours: 4,
      }
    },
    {
      work_order_id: 'WO-005',
      work_type: 'security audit database access',
      priority: 'high',
      context: {
        description: 'Audit database access for security vulnerabilities',
        files: ['database.ts', 'models.ts'],
        estimated_hours: 3,
      }
    }
  ];

  for (const workOrder of workOrders) {
    try {
      const response = await fetch(`${API_BASE}/api/v1/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workOrder),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Assigned ${workOrder.work_order_id} to ${result.agent.callsign} (${result.agent.agent_type})`);
      } else {
        console.error(`❌ Failed to assign ${workOrder.work_order_id}:`, await response.text());
      }
    } catch (error) {
      console.error(`❌ Error assigning ${workOrder.work_order_id}:`, error);
    }
  }
}

/**
 * Demo: Update assignment progress
 */
async function updateAssignmentProgress() {
  console.log('\n⏳ Updating assignment progress...');

  // Get current assignments
  const response = await fetch(`${API_BASE}/api/v1/assignments?status=assigned`);
  if (!response.ok) {
    console.error('❌ Failed to get assignments');
    return;
  }

  const { assignments } = await response.json();
  
  for (const assignment of assignments.slice(0, 3)) { // Update first 3 assignments
    try {
      // Simulate progress based on work type
      let progress = 0;
      let status = 'in_progress';
      
      if (assignment.work_type.includes('implement')) {
        progress = Math.floor(Math.random() * 60) + 20; // 20-80%
      } else if (assignment.work_type.includes('review')) {
        progress = Math.floor(Math.random() * 40) + 30; // 30-70%
      } else if (assignment.work_type.includes('design')) {
        progress = Math.floor(Math.random() * 50) + 25; // 25-75%
      } else if (assignment.work_type.includes('test')) {
        progress = Math.floor(Math.random() * 70) + 10; // 10-80%
      }

      // Randomly complete some assignments
      if (Math.random() > 0.6) {
        progress = 100;
        status = 'completed';
      }

      const updateResponse = await fetch(`${API_BASE}/api/v1/assignments/${assignment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          progress_percent: progress,
        }),
      });

      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log(`📊 Updated ${assignment.work_order_id}: ${progress}% (${status})`);
      } else {
        console.error(`❌ Failed to update ${assignment.work_order_id}:`, await updateResponse.text());
      }
    } catch (error) {
      console.error(`❌ Error updating ${assignment.work_order_id}:`, error);
    }
  }
}

/**
 * Demo: Get agent statistics
 */
async function showAgentStatistics() {
  console.log('\n📊 Agent Statistics:');

  try {
    const response = await fetch(`${API_BASE}/api/v1/agents/stats`);
    if (!response.ok) {
      console.error('❌ Failed to get agent statistics');
      return;
    }

    const stats = await response.json();
    
    console.log(`🤖 Total Agents: ${stats.total_agents}`);
    console.log(`📋 Total Assignments: ${stats.total_assignments}`);
    console.log(`🏭 Utilization Rate: ${stats.utilization_rate.toFixed(1)}%`);
    
    console.log('\n📈 Agents by Type:');
    for (const [type, count] of Object.entries(stats.agents_by_type)) {
      console.log(`  ${type}: ${count}`);
    }
    
    console.log('\n📊 Assignments by Status:');
    for (const [status, count] of Object.entries(stats.assignments_by_status)) {
      const emoji = status === 'completed' ? '✅' : status === 'in_progress' ? '⏳' : '📋';
      console.log(`  ${emoji} ${status}: ${count}`);
    }
    
  } catch (error) {
    console.error('❌ Error getting statistics:', error);
  }
}

/**
 * Demo: Agent coordination workflow
 */
async function demonstrateCoordination() {
  console.log('\n🤝 Demonstrating agent coordination...');

  try {
    const response = await fetch(`${API_BASE}/api/v1/agents/coordinate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinator_agent: 'ARCH-001',
        participating_agents: ['FSD-001', 'CR-001', 'SEC-001'],
        coordination_type: 'sequential',
        context: {
          workflow: 'security-first development',
          work_order_id: 'WO-006',
          description: 'Implement new feature with security review',
        }
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`🤝 Coordination session ${result.coordination_id} initiated`);
      console.log(`👥 Coordinator: ${result.coordinator_agent}`);
      console.log(`👥 Participants: ${result.participating_agents.join(', ')}`);
      console.log(`🔄 Type: ${result.coordination_type}`);
    } else {
      console.error('❌ Failed to initiate coordination:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error initiating coordination:', error);
  }
}

/**
 * Main demonstration flow
 */
async function runDemo() {
  console.log('🚀 FleetTools AI Agent Coordination Demo');
  console.log('=====================================\n');

  try {
    // Check if API server is running
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      console.error('❌ FleetTools API server is not running on port 3001');
      console.log('Please start the server with: bun run src/index.ts');
      return;
    }

    const health = await healthResponse.json();
    console.log(`✅ FleetTools API v${health.version} is healthy`);

    // Run demonstration steps
    await registerDemoAgents();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    
    await createDemoAssignments();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause for assignments
    
    await updateAssignmentProgress();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    
    await showAgentStatistics();
    await demonstrateCoordination();

    console.log('\n✨ Demo completed successfully!');
    console.log('\n🔍 Try these endpoints to explore:');
    console.log(`  curl ${API_BASE}/api/v1/agents`);
    console.log(`  curl ${API_BASE}/api/v1/assignments`);
    console.log(`  curl ${API_BASE}/api/v1/agents/stats`);
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
runDemo();