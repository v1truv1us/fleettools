/**
 * Monitoring System for FleetTools Coordination
 *
 * Provides real-time monitoring of agents, missions, and system health
 * Generates metrics and alerts for coordination system
 */
export interface MonitoringMetrics {
    timestamp: string;
    agents: {
        total: number;
        running: number;
        idle: number;
        failed: number;
        averageUptime: number;
    };
    missions: {
        total: number;
        active: number;
        completed: number;
        averageProgress: number;
    };
    tasks: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        failed: number;
    };
    conflicts: {
        total: number;
        unresolved: number;
        autoResolved: number;
        manuallyResolved: number;
    };
    system: {
        uptime: number;
        memoryUsage: number;
        cpuUsage: number;
        responseTime: number;
    };
}
export interface AlertConfig {
    agentFailureThreshold: number;
    missionStaleThreshold: number;
    conflictCriticalThreshold: number;
    responseTimeThreshold: number;
    memoryUsageThreshold: number;
    cpuUsageThreshold: number;
}
export interface Alert {
    id: string;
    type: 'agent_failure' | 'mission_stale' | 'conflict_critical' | 'performance' | 'resource';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
    resolvedAt?: string;
    metadata: Record<string, any>;
}
export interface MonitoringConfig {
    alertConfig: AlertConfig;
    metricsRetention: number;
    alertRetention: number;
    collectInterval: number;
}
export declare class CoordinationMonitor {
    private config;
    private metrics;
    private alerts;
    private startTime;
    private collectInterval?;
    private lastSystemMetrics;
    constructor(config?: Partial<MonitoringConfig>);
    /**
     * Start monitoring collection
     */
    start(): void;
    /**
     * Stop monitoring collection
     */
    stop(): void;
    /**
     * Collect current system metrics
     */
    collectMetrics(): Promise<MonitoringMetrics>;
    /**
     * Collect agent-related metrics
     */
    private collectAgentMetrics;
    /**
     * Collect mission-related metrics
     */
    private collectMissionMetrics;
    /**
     * Collect task-related metrics
     */
    private collectTaskMetrics;
    /**
     * Collect conflict-related metrics
     */
    private collectConflictMetrics;
    /**
     * Collect system-related metrics
     */
    private collectSystemMetrics;
    /**
     * Check for alerts based on current metrics
     */
    checkAlerts(): Promise<Alert[]>;
    /**
     * Create a new alert
     */
    private createAlert;
    /**
     * Get current monitoring dashboard data
     */
    getDashboardData(): Promise<{
        metrics: MonitoringMetrics | null;
        alerts: Alert[];
        summary: {
            totalAlerts: number;
            unresolvedAlerts: number;
            criticalAlerts: number;
            systemHealth: 'healthy' | 'warning' | 'critical';
        };
    }>;
    /**
     * Get metrics history
     */
    getMetricsHistory(hours?: number): MonitoringMetrics[];
    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[];
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string, resolution?: string): void;
    /**
     * Helper methods for alert checking
     */
    private getRecentAgentFailures;
    private getStaleMissions;
    private getCriticalConflicts;
    /**
     * Clean up old metrics beyond retention period
     */
    private cleanupOldMetrics;
    /**
     * Clean up old resolved alerts
     */
    cleanupOldAlerts(): void;
    /**
     * Export monitoring data for external systems
     */
    exportData(): {
        metrics: MonitoringMetrics[];
        alerts: Alert[];
        summary: MonitoringMetrics;
    };
    /**
     * Calculate summary metrics from all collected data
     */
    private calculateSummaryMetrics;
    private calculateAverage;
    /**
     * Get system health status
     */
    getSystemHealth(): {
        status: 'healthy' | 'warning' | 'critical';
        issues: string[];
        recommendations: string[];
    };
}
//# sourceMappingURL=monitor.d.ts.map