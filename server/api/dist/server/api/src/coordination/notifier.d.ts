/**
 * Notification System for FleetTools Coordination
 *
 * Handles mission completion notifications and event delivery
 * Integrates with Squawk for message passing
 */
export interface NotificationConfig {
    squawkUrl?: string;
    notificationRetention: number;
    batchNotifications: boolean;
    batchInterval: number;
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
    duration: number;
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
export declare class Notifier {
    private config;
    private notifications;
    private recipients;
    private batchTimer?;
    private pendingNotifications;
    constructor(config?: Partial<NotificationConfig>);
    /**
     * Send mission completion notification
     */
    notifyMissionCompleted(completionData: MissionCompletionData): Promise<void>;
    /**
     * Send agent termination notification
     */
    notifyAgentTerminated(agentId: string, reason: string, exitCode?: number): Promise<void>;
    /**
     * Send conflict resolution notification
     */
    notifyConflictResolved(conflictId: string, resolution: string, agents: string[]): Promise<void>;
    /**
     * Send system alert notification
     */
    notifySystemAlert(alertType: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void>;
    /**
     * Register notification recipient
     */
    registerRecipient(recipient: NotificationRecipient): void;
    /**
     * Unregister notification recipient
     */
    unregisterRecipient(recipientId: string): void;
    /**
     * Get pending notifications for recipient
     */
    getPendingNotifications(recipientId: string): Notification[];
    /**
     * Mark notification as delivered
     */
    markAsDelivered(notificationId: string): void;
    /**
     * Create a notification object
     */
    private createNotification;
    /**
     * Deliver notification through appropriate channels
     */
    private deliverNotification;
    /**
     * Send notification immediately
     */
    private sendNotification;
    /**
     * Start batch processing of notifications
     */
    private startBatchProcessing;
    /**
     * Check if notification should be sent to recipient
     */
    private shouldSendToRecipient;
    /**
     * Send notification to specific recipient
     */
    private sendToRecipient;
    /**
     * Send notification via Squawk coordination system
     */
    private sendViaSquawk;
    /**
     * Send notification via email (placeholder)
     */
    private sendEmail;
    /**
     * Send notification via webhook
     */
    private sendWebhook;
    /**
     * Send notification to Squawk mailbox
     */
    private sendToSquawkMailbox;
    /**
     * Format mission completion message
     */
    private formatMissionCompletionMessage;
    /**
     * Get notification statistics
     */
    getNotificationStats(): {
        total: number;
        delivered: number;
        pending: number;
        byType: Record<string, number>;
        byPriority: Record<string, number>;
    };
    /**
     * Clean up old notifications
     */
    cleanupOldNotifications(): void;
    /**
     * Stop notification system
     */
    stop(): void;
    /**
     * Export notification data
     */
    exportNotifications(): {
        notifications: Notification[];
        recipients: NotificationRecipient[];
        stats: ReturnType<typeof Notifier.prototype.getNotificationStats>;
    };
}
//# sourceMappingURL=notifier.d.ts.map