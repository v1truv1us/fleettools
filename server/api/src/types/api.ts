/**
 * Type definitions for API requests
 */

export interface SpawnAgentRequest {
  type: string;
  task?: string;
  metadata?: Record<string, any>;
  config?: {
    timeout?: number;
    retries?: number;
    resources?: {
      memory?: string;
      cpu?: string;
    };
    environment?: Record<string, string>;
  };
}

export interface CreateTaskRequest {
  type: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  missionId?: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTaskRequest {
  status: string;
  result?: any;
  error?: string;
}

export interface WorkOrderRequest {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  metadata?: Record<string, any>;
}

export interface TechOrderRequest {
  name: string;
  pattern: string;
  context: string;
  usage_count?: number;
}

export interface CtkReservationRequest {
  file: string;
  specialist_id: string;
  purpose: string;
}

export interface LockRequest {
  file: string;
  specialist_id: string;
  timeout_ms?: number;
}

export interface CursorRequest {
  stream_id: string;
  position: number;
}

export interface MailboxRequest {
  stream_id: string;
  events: any[];
}