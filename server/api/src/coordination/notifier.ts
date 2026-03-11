/**
 * Notification System for FleetTools Coordination
 *
 * Handles mission completion notifications and event delivery
 * Integrates with Squawk for message passing
 */

export interface NotificationConfig {
  squawkUrl?: string;
  notificationRetention: number; // days
  batchNotifications: boolean;
  batchInterval: number; // milliseconds
}

export interface Notification {
  id: string;
  type: 'mission_completed' | 'mission_failed' | 'agent_terminated' | 'conflict_resolved' | 'system_alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metadata: Record<string, any>;
  timestamp: string;
  delivered: boolean;
  deliveredAt?: string;
  recipients?: string[];
}

export interface MissionCompletionData {
  missionId: string;
  title: string;
  status: 'success' | 'partial' | 'failed';
  duration: number; // milliseconds
  completedTasks: number;
  totalTasks: number;
  participatingAgents: string[];
  summary?: string;
  metrics?: Record<string, number>;
}

export interface NotificationRecipient {
  id: string;
  type: 'user' | 'agent' | 'system';
  contactInfo: {
    email?: string;
    webhook?: string;
    squawkMailbox?: string;
  };
  preferences: {
    missionUpdates: boolean;
    conflicts: boolean;
    systemAlerts: boolean;
  };
}

export class Notifier {
  private config: NotificationConfig;
  private notifications: Map<string, Notification> = new Map();
  private recipients: Map<string, NotificationRecipient> = new Map();
  private batchTimer?: ReturnType<typeof setInterval>;
  private pendingNotifications: Notification[] = [];

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = {
      squawkUrl: process.env.SQUAWK_URL || 'http://localhost:3002',
      notificationRetention: 7,
      batchNotifications: true,
      batchInterval: 30000, // 30 seconds
      ...config
    };

    console.log('✓ Notifier initialized');
    
    if (this.config.batchNotifications) {
      this.startBatchProcessing();
    }
  }

  /**
   * Send mission completion notification
   */
  async notifyMissionCompleted(completionData: MissionCompletionData): Promise<void> {
    const notification = this.createNotification('mission_completed', {
      priority: completionData.status === 'failed' ? 'high' : 'medium',
      title: `Mission ${completionData.status}: ${completionData.title}`,
      message: this.formatMissionCompletionMessage(completionData),
      metadata: {
        missionId: completionData.missionId,
        missionTitle: completionData.title,
        completionStatus: completionData.status,
        duration: completionData.duration,
        taskMetrics: {
          completed: completionData.completedTasks,
          total: completionData.totalTasks,
          percentage: Math.round((completionData.completedTasks / completionData.totalTasks) * 100)
        },
        agentCount: completionData.participatingAgents.length,
        metrics: completionData.metrics
      }
    });

    await this.deliverNotification(notification);
  }

  /**
   * Send agent termination notification
   */
  async notifyAgentTerminated(agentId: string, reason: string, exitCode?: number): Promise<void> {
    const notification = this.createNotification('agent_terminated', {
      priority: reason === 'error' ? 'high' : 'medium',
      title: `Agent terminated: ${agentId}`,
      message: `Agent ${agentId} has terminated due to: ${reason}${exitCode ? ` (exit code: ${exitCode})` : ''}`,
      metadata: {
        agentId,
        terminationReason: reason,
        exitCode,
        timestamp: new Date().toISOString()
      }
    });

    await this.deliverNotification(notification);
  }

  /**
   * Send conflict resolution notification
   */
  async notifyConflictResolved(conflictId: string, resolution: string, agents: string[]): Promise<void> {
    const notification = this.createNotification('conflict_resolved', {
      priority: 'medium',
      title: `Conflict resolved: ${conflictId}`,
      message: `Conflict ${conflictId} has been resolved using strategy: ${resolution}`,
      metadata: {
        conflictId,
        resolution,
        affectedAgents: agents,
        resolvedAt: new Date().toISOString()
      }
    });

    await this.deliverNotification(notification);
  }

  /**
   * Send system alert notification
   */
  async notifySystemAlert(alertType: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    const notification = this.createNotification('system_alert', {
      priority: severity,
      title: `System Alert: ${alertType}`,
      message,
      metadata: {
        alertType,
        severity,
        timestamp: new Date().toISOString(),
        component: 'coordination_system'
      }
    });

    await this.deliverNotification(notification);
  }

  /**
   * Register notification recipient
   */
  registerRecipient(recipient: NotificationRecipient): void {
    this.recipients.set(recipient.id, recipient);
    console.log(`✓ Registered notification recipient: ${recipient.id} (${recipient.type})`);
  }

  /**
   * Unregister notification recipient
   */
  unregisterRecipient(recipientId: string): void {
    this.recipients.delete(recipientId);
    console.log(`✓ Unregistered notification recipient: ${recipientId}`);
  }

  /**
   * Get pending notifications for recipient
   */
  getPendingNotifications(recipientId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(notification => 
      !notification.delivered && 
      (!notification.recipients || notification.recipients.includes(recipientId))
    );
  }

  /**
   * Mark notification as delivered
   */
  markAsDelivered(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.delivered = true;
      notification.deliveredAt = new Date().toISOString();
      this.notifications.set(notificationId, notification);
    }
  }

  /**
   * Create a notification object
   */
  private createNotification(
    type: Notification['type'],
    options: {
      priority: Notification['priority'];
      title: string;
      message: string;
      metadata: Record<string, any>;
      recipients?: string[];
    }
  ): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      priority: options.priority,
      title: options.title,
      message: options.message,
      metadata: options.metadata,
      timestamp: new Date().toISOString(),
      delivered: false,
      recipients: options.recipients
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  /**
   * Deliver notification through appropriate channels
   */
  private async deliverNotification(notification: Notification): Promise<void> {
    if (this.config.batchNotifications) {
      this.pendingNotifications.push(notification);
      return;
    }

    await this.sendNotification(notification);
  }

  /**
   * Send notification immediately
   */
  private async sendNotification(notification: Notification): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    // Send to all relevant recipients
    for (const [recipientId, recipient] of this.recipients.entries()) {
      if (this.shouldSendToRecipient(notification, recipient)) {
        deliveryPromises.push(this.sendToRecipient(notification, recipient));
      }
    }

    // Try to send via Squawk
    deliveryPromises.push(this.sendViaSquawk(notification));

    await Promise.allSettled(deliveryPromises);

    // Mark as delivered
    notification.delivered = true;
    notification.deliveredAt = new Date().toISOString();
    this.notifications.set(notification.id, notification);

    console.log(`📤 Notification sent: ${notification.title}`);
  }

  /**
   * Start batch processing of notifications
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(async () => {
      if (this.pendingNotifications.length > 0) {
        const batch = [...this.pendingNotifications];
        this.pendingNotifications = [];
        
        console.log(`📦 Processing notification batch: ${batch.length} notifications`);
        
        for (const notification of batch) {
          await this.sendNotification(notification);
        }
      }
    }, this.config.batchInterval);
  }

  /**
   * Check if notification should be sent to recipient
   */
  private shouldSendToRecipient(notification: Notification, recipient: NotificationRecipient): boolean {
    if (notification.recipients && !notification.recipients.includes(recipient.id)) {
      return false;
    }

    switch (notification.type) {
      case 'mission_completed':
        return recipient.preferences.missionUpdates;
      case 'conflict_resolved':
        return recipient.preferences.conflicts;
      case 'system_alert':
        return recipient.preferences.systemAlerts;
      case 'agent_terminated':
        return recipient.preferences.missionUpdates || recipient.preferences.systemAlerts;
      default:
        return true;
    }
  }

  /**
   * Send notification to specific recipient
   */
  private async sendToRecipient(notification: Notification, recipient: NotificationRecipient): Promise<void> {
    try {
      if (recipient.contactInfo.email) {
        await this.sendEmail(notification, recipient.contactInfo.email);
      }
      
      if (recipient.contactInfo.webhook) {
        await this.sendWebhook(notification, recipient.contactInfo.webhook);
      }
      
      if (recipient.contactInfo.squawkMailbox) {
        await this.sendToSquawkMailbox(notification, recipient.contactInfo.squawkMailbox);
      }
    } catch (error) {
      console.error(`Failed to send notification to recipient ${recipient.id}:`, error);
    }
  }

  /**
   * Send notification via Squawk coordination system
   */
  private async sendViaSquawk(notification: Notification): Promise<void> {
    if (!this.config.squawkUrl) {
      return;
    }

    try {
      const squawkUrl = `${this.config.squawkUrl}/api/v1/events`;
      
      const event = {
        type: 'notification',
        data: {
          notificationId: notification.id,
          notificationType: notification.type,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
          timestamp: notification.timestamp
        }
      };

      const response = await fetch(squawkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Squawk delivery failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to send notification via Squawk:`, error);
    }
  }

  /**
   * Send notification via email (placeholder)
   */
  private async sendEmail(notification: Notification, email: string): Promise<void> {
    // In real implementation, this would integrate with email service
    console.log(`📧 Email notification to ${email}: ${notification.title}`);
  }

  /**
   * Send notification via webhook
   */
  private async sendWebhook(notification: Notification, webhook: string): Promise<void> {
    try {
      const payload = {
        id: notification.id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        timestamp: notification.timestamp
      };

      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FleetTools-Notifier/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to send webhook notification:`, error);
      throw error;
    }
  }

  /**
   * Send notification to Squawk mailbox
   */
  private async sendToSquawkMailbox(notification: Notification, mailboxId: string): Promise<void> {
    try {
      const squawkUrl = `${this.config.squawkUrl}/api/v1/mailbox/${mailboxId}/messages`;
      
      const message = {
        type: 'notification',
        content: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          metadata: notification.metadata
        },
        timestamp: notification.timestamp
      };

      const response = await fetch(squawkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Mailbox delivery failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to send to Squawk mailbox:`, error);
      throw error;
    }
  }

  /**
   * Format mission completion message
   */
  private formatMissionCompletionMessage(data: MissionCompletionData): string {
    const duration = Math.round(data.duration / 1000); // Convert to seconds
    const successRate = Math.round((data.completedTasks / data.totalTasks) * 100);
    
    let message = `Mission "${data.title}" completed with status: ${data.status.toUpperCase()}. `;
    message += `Duration: ${duration}s, Tasks: ${data.completedTasks}/${data.totalTasks} (${successRate}%)`;
    
    if (data.participatingAgents.length > 0) {
      message += `, Agents: ${data.participatingAgents.length}`;
    }
    
    if (data.summary) {
      message += `. Summary: ${data.summary}`;
    }
    
    return message;
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    total: number;
    delivered: number;
    pending: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const notifications = Array.from(this.notifications.values());
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    notifications.forEach(notification => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;
    });

    return {
      total: notifications.length,
      delivered: notifications.filter(n => n.delivered).length,
      pending: notifications.filter(n => !n.delivered).length,
      byType,
      byPriority
    };
  }

  /**
   * Clean up old notifications
   */
  cleanupOldNotifications(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.notificationRetention);
    
    let cleanedCount = 0;
    for (const [notificationId, notification] of this.notifications.entries()) {
      if (new Date(notification.timestamp) < cutoff) {
        this.notifications.delete(notificationId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old notifications`);
    }
  }

  /**
   * Stop notification system
   */
  stop(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    // Send any pending notifications
    if (this.pendingNotifications.length > 0) {
      console.log(`📦 Sending ${this.pendingNotifications.length} pending notifications before shutdown`);
      this.pendingNotifications.forEach(async notification => {
        await this.sendNotification(notification);
      });
    }
    
    console.log('📤 Notifier stopped');
  }

  /**
   * Export notification data
   */
  exportNotifications(): {
    notifications: Notification[];
    recipients: NotificationRecipient[];
    stats: ReturnType<typeof Notifier.prototype.getNotificationStats>;
  } {
    return {
      notifications: Array.from(this.notifications.values()),
      recipients: Array.from(this.recipients.values()),
      stats: this.getNotificationStats()
    };
  }
}